# Member 4 GIS & Routing Data

## Deliverables

- `roads_geojson_github_under100mb.geojson`: simplified NER motor-vehicle road network for prototype routing.
- `road_nodes.csv`: unique road endpoints used in the prototype graph.
- `road_edges.csv`: directed routing edges; bidirectional roads have forward/reverse edges.
- `ner_state_boundaries.geojson`: 8 NER state boundaries. Seven are from OSM admin_level4; Arunachal Pradesh is dissolved from its district-level polygons because the supplied extract did not contain an Arunachal admin_level4 relation.
- `ner_district_boundaries.geojson`: district-level polygons from OSM admin_level5 in the NER extract.
- `logistics_locations.csv`: airports/airfields, railway stations/halts, bus stations, ferry terminals, helipads, major cities/towns, and mapped marketplaces/supermarkets.
- `junction_candidates.csv`: prototype junction candidates from road graph node degree; these are not guaranteed physical intersections.

## Source

Roads, boundaries and POIs are derived from OpenStreetMap data distributed by Geofabrik's North-Eastern Zone extract.

Source page:
https://download.geofabrik.de/asia/india/north-eastern-zone.html

Geofabrik states the data are created by OpenStreetMap contributors and are licensed under ODbL 1.0.

## Processing Statistics

- Processed road features: 286,901
- Road-network nodes (unique segment endpoints): 493,429
- Directed edges: 570,297

## Road Network Details

The supplied road layer contains:

- `osm_id`
- `fclass`
- `name`
- `oneway`
- `maxspeed`
- `geometry`

It does not contain `surface` or `access`, so those fields are blank.

Road classes excluded from the routing prototype include:

- footway
- pedestrian
- steps
- cycleway
- bridleway

## Important Prototype Note

The boundary/admin hierarchy in OpenStreetMap is not identical in every state.

The district layer uses `admin_level5` from this extract.

For a production/legal administrative map, validate against an official government boundary source.