import base64
import json
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parent
REPORTS_FILE = BACKEND_DIR / "community_hazards.json"
UPLOAD_DIR = BACKEND_DIR / "hazard_uploads"
REPORTS_LOCK = threading.RLock()
MAX_PHOTO_BYTES = 5 * 1024 * 1024

HAZARD_TYPES = (
    "Landslide",
    "Flood",
    "Road blockage",
    "Road damage",
    "Heavy rainfall",
    "Accident",
    "Bridge damage",
    "Other"
)

HAZARD_KEYWORDS = {
    "Landslide": ("landslide", "mudslide", "rockfall"),
    "Flood": ("flood", "waterlogged", "inundat"),
    "Road blockage": ("blocked", "blockage", "closed", "obstruct"),
    "Road damage": ("pothole", "road damage", "crater", "washed out"),
    "Heavy rainfall": ("heavy rain", "downpour", "rainfall"),
    "Accident": ("accident", "collision", "crash"),
    "Bridge damage": ("bridge", "culvert")
}


def _read_reports():
    if not REPORTS_FILE.exists():
        return []
    try:
        data = json.loads(REPORTS_FILE.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except (OSError, json.JSONDecodeError):
        return []


def _write_reports(reports):
    REPORTS_FILE.parent.mkdir(parents=True, exist_ok=True)
    temporary_file = REPORTS_FILE.with_suffix(".tmp")
    temporary_file.write_text(
        json.dumps(reports, ensure_ascii=True, indent=2),
        encoding="utf-8"
    )
    temporary_file.replace(REPORTS_FILE)


def list_reports():
    with REPORTS_LOCK:
        reports = _read_reports()
    reports = sorted(reports, key=lambda report: report.get("reported_at", ""), reverse=True)
    return [_public_report(report) for report in reports]


def _public_report(report):
    return {
        key: value
        for key, value in report.items()
        if key not in ("photo_path", "photo_content_type")
    }


def _classify(description, selected_type):
    text = description.lower()
    for hazard_type, keywords in HAZARD_KEYWORDS.items():
        if any(keyword in text for keyword in keywords):
            return hazard_type
    return selected_type


def _severity(description):
    text = description.lower()
    if any(word in text for word in ("washed away", "trapped", "collapsed", "life-threatening", "impassable")):
        return "High"
    if any(word in text for word in ("severe", "major", "deep", "large", "blocked")):
        return "Moderate"
    return "Unverified"


def _save_photo(report_id, photo_data_url):
    if not photo_data_url:
        return None
    if not isinstance(photo_data_url, str) or "," not in photo_data_url:
        raise ValueError("Photo must be a base64 data URL.")

    metadata, encoded = photo_data_url.split(",", 1)
    extensions = {
        "data:image/jpeg;base64": (".jpg", "image/jpeg"),
        "data:image/png;base64": (".png", "image/png"),
        "data:image/webp;base64": (".webp", "image/webp")
    }
    photo_info = extensions.get(metadata.lower())
    if photo_info is None:
        raise ValueError("Photo must be JPEG, PNG, or WebP.")

    try:
        content = base64.b64decode(encoded, validate=True)
    except (ValueError, base64.binascii.Error) as error:
        raise ValueError("Photo data could not be decoded.") from error
    if not content or len(content) > MAX_PHOTO_BYTES:
        raise ValueError("Photo must be smaller than 5 MB.")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    photo_path = UPLOAD_DIR / f"{report_id}{photo_info[0]}"
    photo_path.write_bytes(content)
    return photo_path.name, photo_info[1]


def get_photo_path(report_id):
    with REPORTS_LOCK:
        reports = _read_reports()
    for report in reports:
        if report.get("report_id") == report_id and report.get("photo_path"):
            return UPLOAD_DIR / report["photo_path"], report.get("photo_content_type")
    return None, None


def create_report(payload):
    if not isinstance(payload, dict):
        raise ValueError("A JSON report object is required.")
    description = str(payload.get("description", "")).strip()
    if not description or len(description) > 2000:
        raise ValueError("Description is required and must be at most 2000 characters.")

    selected_type = str(payload.get("hazard_type", "Other"))
    if selected_type not in HAZARD_TYPES:
        raise ValueError("Select a valid hazard type.")

    try:
        latitude = float(payload.get("latitude"))
        longitude = float(payload.get("longitude"))
    except (TypeError, ValueError) as error:
        raise ValueError("Select a valid location on the map.") from error
    if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
        raise ValueError("Select a valid location on the map.")

    report_id = str(uuid.uuid4())
    photo_info = _save_photo(report_id, payload.get("photo_data_url"))
    report = {
        "report_id": report_id,
        "hazard_type": _classify(description, selected_type),
        "description": description,
        "reported_at": datetime.now(timezone.utc).isoformat(),
        "status": "Pending",
        "severity": _severity(description),
        "latitude": latitude,
        "longitude": longitude,
        "analysis_note": "Description keyword classification only; uploaded images are not analyzed."
    }
    if photo_info:
        report["photo_path"], report["photo_content_type"] = photo_info
        report["photo_url"] = f"/community-hazards/{report_id}/photo"

    with REPORTS_LOCK:
        reports = _read_reports()
        reports.append(report)
        _write_reports(reports)
    return _public_report(report)


def update_status(report_id, status):
    if status not in ("Active", "Resolved", "Pending"):
        raise ValueError("Status must be Pending, Active, or Resolved.")
    with REPORTS_LOCK:
        reports = _read_reports()
        for report in reports:
            if report.get("report_id") == report_id:
                report["status"] = status
                report["reviewed_at"] = datetime.now(timezone.utc).isoformat()
                report["verified"] = status == "Active"
                _write_reports(reports)
                return _public_report(report)
    return None