# NER-Logistics-Intelligence
AI-Based Smart Logistics and Accessibility Intelligence Platform for North Eastern Region – Smart India Hackathon 2026

## Community hazard reports

Reports are stored by the backend in `backend/community_hazards.json`; uploaded JPEG, PNG, and WebP photos (up to 5 MB) are stored in `backend/hazard_uploads/`. New reports are `Pending`. Descriptions receive keyword-based category and severity hints; uploaded images are not analyzed.

To review reports, configure `HAZARD_REVIEW_TOKEN` in the backend process environment. A reviewer can then send `POST /community-hazards/{report_id}/status` with a JSON body such as `{"status":"Active"}` and the `X-Hazard-Review-Token` header. Only reviewed `Active` reports affect route recommendations; an active road-blockage report marks a matching route as not recommended.
