# Data-source audit

## Status

Twenty public portal items were verified and are connected as 21 operational map and analysis layers (the gauge item is represented by both a general layer and a flood-stage-filtered layer). Bounded county counts and post-fire/weather intersections drive screening indicators, but the application does not calculate a composite risk score. It distinguishes forecasts, advisories, observations, planning hazards, facilities, exposure context, and incident/history layers in `config.js`.

Verification date: **2026-11-17**

## Connected sources

| Key | Portal item | Publisher / authority | Role | Refresh or vintage | Decision and constraints |
| --- | --- | --- | --- | --- | --- |
| `precipitationForecast` | `f9e9283b9c9741d09aad633f68758bf6` | NWS via Esri Living Atlas | 72-hour quantitative precipitation **forecast** | NWS source hourly; service advertises 15-minute refresh | Approved for visualization. Multilayer item; do not present as observed rainfall. Informational and not monitored 24/7. |
| `weatherWarnings` | `a6134ae01aad44c499d12feec782b386` | NWS via Esri Living Atlas | Current watches, warnings, and advisories | Approximately 5 minutes | Approved for visualization. Advisory issuance does not prove local impact. |
| `liveStreamGauges` | `81c5a9f2a2704d54a49042a44eefa5d3` | USGS, NWS, and other contributors via Esri Living Atlas | Current stream stage, flow, status, forecast status, and observation freshness | Approximately hourly | Approved for visualization and freshness-aware analysis. California USGS records are filtered spatially on the Analysis page. Many USGS records do not supply a flood `statusClass`; gauge-specific reviewed thresholds are required before operational alerting. Stale records must not be treated as current. |
| `floodStageGauges` | `81c5a9f2a2704d54a49042a44eefa5d3` | USGS, NWS, and contributors via Esri Living Atlas | Flood-stage-only view of live stream gauges | Approximately hourly; app refresh 5 minutes | Filtered to `statusClass >= 3`. A missing gauge or status classification does not prove normal conditions. |
| `stateBoundaries` | `8c2d6d7df8fa4142b0a1211c8dd66903` | Esri / U.S. Census Bureau | Generalized state reference boundaries | Publisher-managed | Optional reference layer, off by default. Not an operational jurisdiction boundary. |
| `acsPopulationTracts` | `60c98f20a162416ea1725b94d7297f83`, layer 2 | U.S. Census Bureau ACS / Esri | Hidden population-analysis source | 2020–2024 ACS 5-year estimates | Used for area-weighted population estimates in fire and weather-polygon popups. Assumes uniform population distribution inside each tract; not current occupancy. |
| `usgsPostFire` | `cf3f58f60f774ad3b791ce5d90a0b92c` | USGS Landslide Hazards Program | Post-fire debris-flow fire locations, perimeters, basin/segment likelihood, volume, and combined hazards | Publisher-managed | Used for county assessment counts and spatial intersection with the selected NOAA outlook. A published assessment is not a prediction that debris flow will occur. |
| `alertCameras` | `0c1c1166688f4f2db938194799337be4` | ALERTCalifornia / UC San Diego | Live camera situational context | Layer refreshes every 15 seconds | Optional and off by default. Images require interpretation and do not assert a hazard or closure. |
| `caltransRoads` | `2d56e65de89c418780056651640291e8` | Caltrans | Statewide public-roads network | Publisher-managed | Used only to indicate that transportation screening data is connected. Not a live closure, passability, or damage feed. |
| `hospitals` | `85672c5a514b4e1ebc08191a4bebf0c0` | FEMA Region 9 / USGS National Structures | Hospitals and medical centers | Publisher checks weekly | County feature counts support a screening KPI; count does not establish operating status, capacity, dependencies, or hazard impact. |
| `shelterFacilities` | `61a97e7745ce4c8691044ff46769fb19` | FEMA Region 9 / National Shelter System | Shelter planning inventory and capacity fields | Publisher-managed | County rollup uses the larger numeric value from `EVAC_CAP` and `POSTIM_CAP` per facility. Capacity and availability must be verified operationally. |
| `activeShelters` | `bc4f03b7ec3e4c8d86c3e2ebcd92e047` | Cal OES / American Red Cross | Active shelter status | Approximately 60 seconds | Visible by default. No capacity field is used; status and county count are context only. |
| `fireHistory` | `5e72b1699bf74eefb3f3aff6f4ba5511` | NIFC / WFIGS | Fire-perimeter history and recent burn context | Approximately 5 minutes | Approved conditionally. Records before 2021 are incomplete; no relative-date query is issued by the app. A perimeter is not a debris-flow probability. |
| `currentFirePerimeters` | `d1c32af3212341869b3c810f1a215824` | NIFC / WFIGS | Current incident context | Approximately 5 minutes | Available in the Layer List but off by default. Not a substitute for recent-burn-scar analysis. |
| `floodHazards` | `ccd29fb4bd5e4b44a2d61638829a5d7e` | FEMA via Esri Living Atlas | Regulatory/planning flood-hazard context | Annual snapshot | Approved for planning visualization. Item is limited to scales of 1:400,000 and larger. It is not a live flood extent or forecast. |
| `femaRiskCounties` | `39485e8035d446a5bff03259508ae355` | FEMA National Risk Index | County composite and individual risk, expected annual loss, social vulnerability, and community resilience for 18 hazards | December 2025, v1.20 | Visible at county scales up to 1:700,000. Publisher symbology is retained. Arcade provides the initial risk snapshot; all 467 source fields are available in nested collapsible popup sections. Planning comparison only; not a real-time hazard or local risk assessment. |
| `femaRiskTracts` | `9da4eeb936544335a6db0cd7a8448a51` | FEMA National Risk Index | Census-tract composite and individual risk, expected annual loss, social vulnerability, and community resilience for 18 hazards | December 2025, v1.20 | Visible at 1:700,000 and larger. Publisher symbology is retained. Arcade provides the initial risk snapshot; all source fields are available in nested collapsible popup sections. Planning comparison only; not a real-time hazard or local risk assessment. |
| `structures` | `0ec8512ad21e4bb987d7e848d14e7e24` | FEMA / ORNL via Esri Living Atlas | Structure exposure context | Publisher-managed | Available in the Layer List but off by default and limited to 1:50,000 or larger to avoid statewide rendering/query load. No browser-wide count is performed. |
| `coastalEmployment` | `7ac21b0dd7f340f28d11f9f85ae2f908` | NOAA Office for Coastal Management | County coastal-inundation employment exposure | October 2023 analysis | Approved as a planning/vulnerability layer for Marin and Santa Cruz. CC0 1.0. Not a live coastal flood extent. |
| `censusDemographics` | `ebeb65deb5c14f4d8849fd68944b7ee6` | U.S. Census Bureau / Esri Living Atlas | Population characteristics by standard geography | 2020 decennial census | Public authoritative context layer. Available in Map Layers but off by default. Demographic totals are not hazard-exposure counts. |
| `laDebrisFlow` | `c940b2937a7e4554bccc436c92bef195` | Los Angeles County Public Works | County post-fire debris-flow hazard context | Publisher-managed | Approved conditionally for Los Angeles County only. Do not extrapolate statewide. Exact analytical fields and validity rules must be audited before KPI use. |

## Portal and loading approach

- The Planning Map loads public Web Map `bc6d9edf97a0425eb53a1f7776c80133`, which persists the 21 operational layers from 20 verified portal items, basemap, extent, order, visibility, symbology, popups, sublayer organization, and attribution.
- The app uses the Public Safety ArcGIS Online organization for OAuth while loading public ArcGIS Online content across publisher organizations.
- Each source loads independently. A failed item produces a partial/unavailable status instead of blocking county planning content.
- County selection controls initial visibility. The map Layer List allows an analyst to adjust visibility afterward.
- No access token, API key, service credential, or confidential value is stored in the repository.

## County visibility profiles

| County | Initially visible sources |
| --- | --- |
| Marin | NWS precipitation forecast, NWS warnings, live stream gauges, Cal OES active shelters, WFIGS fire history, FEMA flood hazards, FEMA NRI county/tract layers, NOAA coastal-employment exposure |
| Santa Cruz | NWS precipitation forecast, NWS warnings, live stream gauges, Cal OES active shelters, WFIGS fire history, FEMA flood hazards, FEMA NRI county/tract layers, NOAA coastal-employment exposure |
| Los Angeles | NWS precipitation forecast, NWS warnings, live stream gauges, Cal OES active shelters, WFIGS fire history, FEMA flood hazards, FEMA NRI county/tract layers, LA County post-fire debris-flow hazards |
| San Diego | NWS precipitation forecast, NWS warnings, live stream gauges, Cal OES active shelters, WFIGS fire history, FEMA flood hazards, FEMA NRI county/tract layers |

The NRI county layer displays at broader county scales and the tract layer takes over at 1:700,000 and larger. Current fire perimeters, USA Structures, and USA 2020 Census Population Characteristics remain available but off by default.

## Business Analyst demographic context

County demographic cards and linked Graphic Profile infographics were generated on **2026-11-16** with ArcGIS GeoEnrichment / Business Analyst using standard county geography IDs. The cards use current 2026/2031 variables. The Graphic Profile template renders its own labeled vintages (including 2024/2029 and 2025/2030 in the generated report), which may differ from the cards and must be read from the report itself.

| County | Geography ID | Graphic Profile |
| --- | --- | --- |
| Marin | `06041` | `reports/marin-graphic-profile.html` |
| Santa Cruz | `06087` | `reports/santa-cruz-graphic-profile.html` |
| Los Angeles | `06037` | `reports/los-angeles-graphic-profile.html` |
| San Diego | `06073` | `reports/san-diego-graphic-profile.html` |

The displayed variables are 2026 total population, 2026 households, 2026 median household income, 2026 median age, and the 2026–2031 population growth rate. Reports are static generated snapshots and do not consume credits when viewed. Regeneration consumes GeoEnrichment credits. County totals provide planning context only and are not populations exposed to any hazard.

## Sources not yet connected

The following needs remain discovery or validation work and are not represented as operational layers:

- State or county road closures and passability.
- Locally validated critical-facility operating status, dependencies, and surge capacity.
- Confirmed shelter availability/capacity and local mass-care coordination status.
- Live road closures, passability, damage, and audited flood-prone crossings.
- Flash-flood observations beyond NWS advisory and NOAA outlook context.
- County population exposure with an approved allocation method.
- Coastal water-level observations and event-specific inundation forecasts.
- San Diego, Marin, and Santa Cruz local debris-flow or drainage products.

`USA Primary Roads` (`a8bb9832ae2c493a906a7f814b8258a7`) was reviewed as older Census TIGER network context but is not connected because it does not provide operational closure/passability status.

## Required next audit before analytical use

Before any connected layer drives a KPI, priority score, alert, or workflow action, record:

1. Exact service URL, sublayer/table index, fields, aliases, types, domains, null rules, and stable identifiers.
2. Observation, forecast-valid, publication, and update timestamps with timezone semantics.
3. County clipping/filter logic, pagination behavior, transfer limits, and expected record counts.
4. Stale thresholds and user-visible behavior for unauthorized, empty, partial, slow, stale, and failed states.
5. Numerator, denominator, units, rounding, aggregation, and independent validation for every derived indicator.
6. Licensing, attribution, privacy, sensitivity, and redistribution constraints.
7. Suitability for the intended decision, including explicit separation of forecast, observation, regulatory planning, exposure, and incident-history products.

## KPI provenance requirements

KPI cards now distinguish source-connected screening results from unavailable operational impact measures. Facility and assessment counts, shelter planning-capacity rollups, source completeness, and network/source availability are active screening indicators. Activating an impact or risk metric still requires a plain-language definition, exact field bindings, spatial and temporal methods, null handling, independent validation, attribution, last-updated display, and stale/error behavior.

| KPI | Current state | Minimum inputs before activation |
| --- | --- | --- |
| Coastal assets/areas exposed | Placeholder | Event/planning hazard geometry, approved exposure layer, overlay method, time context |
| Routes/road segments at risk | Placeholder | Audited network or closure feed, intersection rule, passability/status time |
| Shelter capacity | Placeholder | Validated facilities, capacity definition, operational status, update owner |
| Population exposed | Placeholder | Approved hazard extent, population source, allocation method, vintage |
| Debris-flow or slope areas | Placeholder | Authoritative hazard polygons, burn-scar/rain linkage, validity date |
| Critical facilities | Placeholder | Approved inventory, sensitivity review, hazard-overlay method |
| Flood-prone crossings | Placeholder | Audited crossing inventory, hazard/status field, update cadence |
| Planning confidence | Unverified | Published method tied to source completeness, suitability, and freshness |

## Approval gate for future sources

A future source may be added to `config.js` only after item identity, publisher, sharing, service dependency, intended use, temporal semantics, scale behavior, licensing, failure behavior, and representative-user access are documented. Titles alone are never sufficient evidence.