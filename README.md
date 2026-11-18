# California El Niño Planning

A no-build static ArcGIS application for county-level El Niño planning. It uses the ArcGIS Maps SDK for JavaScript 5.1 CDN/ESM loader, Calcite components supplied by that loader, and a CA Security Ops dark navy/gold visual system.

> **Planning status:** The saved Web Map connects to 21 operational map/analysis layers from 20 verified public ArcGIS Online/Living Atlas items for forecast, advisory, post-fire hazard, roads, hospitals, shelters, cameras, fire, flood-hazard, structure, coastal-exposure, and Los Angeles debris-flow context. County indicators now report bounded screening counts from connected support layers, but they are not risk scores or operational decisions.

## What is included

- Responsive command-center layout with Planning Map, Analysis, and Settings & Help pages, shared navigation, and source-status reporting.
- Browser-local branding, theme, initial county/view, layer-default, portal, OAuth, Web Map, and Web Scene overrides with validation and reset.
- Accessible Settings, Configuration, and Help & How-to tabs plus a printable operator guide.
- Region-filtered analysis organized into Summary, Forecast & Gauges, Risk & Timeline, and Sources tabs, with collapsible details and selectable KPIs, forecast bars, gauges, events, county profiles, and source rows for cross-filtering.
- Data-driven profiles for Marin, Santa Cruz, Los Angeles, and San Diego.
- County-specific threats, capabilities, source-backed screening KPIs, viewpoints, and disclaimers organized into Overview, Readiness, Community, and Sources tabs.
- Fire/El Niño readiness workflow with NOAA Day 1–3 excessive-rainfall outlooks, Days 3–7 and 8–14 precipitation hazards, USGS post-fire assessment intersection counts, fire/year filters, age-scaled flame symbols, map highlighting, and fire selection.
- Area-weighted ACS population estimates in fire and weather-polygon popups, with explicit method and limitation text.
- ALERTCalifornia live cameras, a dedicated flood-stage-only gauge layer, generalized state boundaries, Caltrans roads, FEMA hospitals, FEMA planning shelters, and Cal OES active shelters.
- Search, basemap gallery, layer list, scale bar, standard legend, and custom fire-age/flame legend.
- ArcGIS Online OAuth sign-in/sign-out UI for `https://publicsafety.maps.arcgis.com`.
- Verified public NWS, NIFC, FEMA, NOAA, and Los Angeles County portal items.
- County-specific initial layer visibility and publisher-managed symbology/popups.
- Automatic source refresh for NWS forecast/advisory and WFIGS incident layers at their advertised service cadence.
- Signed-in, on-demand Business Analyst demographics calculated for each opened polygon and cached for the browser session.
- Synchronized 2D map and 3D terrain scene with a lower-left view toggle.
- Collapsible Layer List and Legend controls plus a docked, closable popup to prevent map-overlay collisions.
- County demographic cards and generated ArcGIS Business Analyst Graphic Profile infographics.
- Scale controls for detailed flood and structure content; USA Structures and Census demographics are off by default.
- Independent layer loading with connected, partial, unavailable, map-failure, configuration-error, signed-in, and signed-out states.
- Native/Calcite controls, visible keyboard focus, a skip link, semantic headings, and live status announcements.

## Data sources

The connected items are documented in [`docs/data-source-audit.md`](docs/data-source-audit.md):

- National Weather Service Precipitation Forecast — 72-hour forecast.
- USA Weather Watches and Warnings — current NWS advisories.
- USGS Post-Fire Debris-Flow Assessments — fire locations, perimeters, basin/segment likelihood, volume, and combined-hazard layers.
- Live Stream Gauges — Flood Stage Only — a second view of the Living Atlas gauge item filtered to `statusClass >= 3`.
- USA States Generalized Boundaries — optional reference context.
- ACS Population (Latest), census tracts — hidden analysis source for area-weighted popup estimates.
- NOAA/WPC Day 1–3 Excessive Rainfall Outlooks and NOAA/WPC/CPC Days 3–7 and 8–14 precipitation-hazard outlooks — runtime readiness screening.
- ALERTCalifornia Live Cameras — optional live-camera context, off by default.
- Caltrans All Public Roads Network — transportation screening, off by default and scale limited.
- FEMA Hospitals and Medical Centers — critical-facility screening, off by default and scale limited.
- FEMA National Shelter System Facilities — planning capacity inventory, off by default and scale limited.
- Cal OES Active Shelters — current active-shelter context.
- WFIGS Interagency Fire Perimeters — history/recent-burn context.
- WFIGS Current Interagency Fire Perimeters — available but off by default.
- USA Flood Hazard Areas — FEMA-derived planning/regulatory context, visible at 1:400,000 and larger.
- FEMA National Risk Index Counties — composite and individual values for 18 natural hazards, shown at county-scale views.
- FEMA National Risk Index Census Tracts — detailed composite and individual hazard-risk values, shown automatically at 1:700,000 and larger.
- USA Structures — exposure context, available at 1:50,000 and larger and off by default.
- Employment in Coastal Inundation Zones — NOAA county-level coastal exposure planning.
- USA 2020 Census Population Characteristics — public demographic map context, off by default.
- Los Angeles County Post-Fire Debris Flow Hazards — LA County-specific planning context.

County detail includes 2026 Esri Updated Demographics and a generated Business Analyst Graphic Profile for each county. Those county cards and committed reports are documented snapshots. In addition, signed-in users receive current on-demand Business Analyst demographic context inside each polygon popup. Polygon results are cached for the browser session to prevent repeat requests for the same feature. Each new polygon enrichment consumes GeoEnrichment credits; viewing committed reports does not. Graphic Profile templates carry their own labeled data vintages, which can differ from current-year popup and county-card values.

The FEMA National Risk Index popups use Arcade expressions for a concise risk snapshot and El Niño-relevant hazard ratings, append on-demand polygon demographics for signed-in users, and expose every FEMA source attribute in nested collapsible categories. The National Risk Index is a December 2025 planning dataset for broad comparisons, not a real-time forecast or a substitute for localized risk analysis.

Forecasts, observations/advisories, planning hazards, exposure layers, and incident history are not interchangeable. The application preserves those distinctions. Browser-side calculations are bounded screening summaries: county facility/assessment counts, shelter-capacity rollups from published fields, and spatial intersections between USGS assessment perimeters and selected NOAA outlook polygons. They require local operational validation.

## Architecture and hosting boundary

**GitHub Pages hosts the static files** in this repository: HTML, CSS, JavaScript, documentation, and county planning JSON.

**ArcGIS Online hosts identity and GIS content.** The app is registered against the Public Safety organization and uses ArcGIS Online for OAuth. The Planning Map loads public ArcGIS Web Map `bc6d9edf97a0425eb53a1f7776c80133` for 2D and public ArcGIS Web Scene `1f7d06bbc0254ac3be1bfab108ed597e` for 3D. The Analysis Summary loads its purpose-built public Web Map `1522124b4f904c1aa10f10fc7c4892bf` and performs bounded source queries for its KPI values. Public and future secured layers remain portal content; they are not copied into GitHub Pages.

The portal maps and scene persist basemaps, viewpoints, layer order, visibility, publisher symbology, popup configuration, and world elevation. Application code keeps county selection, analysis filters, and runtime readiness layers synchronized while preserving independent view lifecycles.

No access token belongs in this repository. OAuth credentials are issued at runtime and managed by the ArcGIS Maps SDK `IdentityManager`.

## Run and deploy

This is a no-build project. ES modules and `fetch()` require an HTTP origin, so do not open `index.html` with a `file://` URL.

### GitHub Pages

1. In GitHub, open **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select `main` and `/ (root)`.
4. Save and note the final HTTPS URL.
5. Add that exact URL to the ArcGIS Online application's redirect URI list before testing sign-in.

All internal asset paths are relative, so the app works from a project-site subpath.

### Private-ready considerations

- The repository can remain private if the GitHub plan supports Pages for private repositories.
- A private repository does not automatically make a Pages site private; confirm the plan and organization policy.
- Treat every file deployed to Pages as browser-readable.
- Keep sensitive GIS content private in ArcGIS Online and require OAuth.
- Never store secrets, tokens, restricted attributes, or confidential exports in this repository.

## ArcGIS Online app registration

Portal:

```text
https://publicsafety.maps.arcgis.com
```

OAuth client ID:

```text
2eURPxapfMdaZiS7
```

The client ID is a public application identifier, not a secret. The registered redirect URI must include the exact canonical callback `https://jonpedder.github.io/california-el-nino-planning/`. Immediately before starting OAuth, the app replaces cache-busting query strings or alternate document paths with that canonical URL, preventing them from becoming an unregistered `redirect_uri`. The app uses redirect OAuth (`popup: false`).

## ArcGIS Online content and sharing

`config.js` contains verified public item IDs from multiple authoritative publishers. Items are loaded by portal item ID rather than fabricated service URLs so publisher-managed symbology, popups, sublayer organization, and attribution are retained.

Future restricted sources must remain in ArcGIS Online and use the narrowest appropriate item sharing plus OAuth authorization. The static site never grants access to secured content.

Before adding a source:

1. Complete its source record in `docs/data-source-audit.md`.
2. Validate the portal item, publisher, sharing, dependencies, service layers, fields, time semantics, scale behavior, licensing, and failure states.
3. Prefer a portal item ID when it carries approved presentation and attribution.
4. Test with a representative non-owner account.
5. Never commit credentials or confidential attributes.

## Configuration

`config.js` is the deployment boundary:

| Setting | Purpose |
| --- | --- |
| `portalUrl` | OAuth and portal context |
| `oauthClientId` | Public OAuth application registration |
| `oauthRedirectUri` | Canonical GitHub Pages callback used to remove cache-busting query strings before OAuth starts |
| `webMapId` | Persisted Planning Map 2D ArcGIS Web Map |
| `analysisWebMapId` | Purpose-built Analysis Summary KPI Web Map |
| `webSceneId` | Persisted 3D ArcGIS Web Scene |
| `basemap` | Initial dark-gray basemap |
| `countyDataUrl` | County planning profiles |
| `operationalLayers` | Verified public items, roles, attribution notes, opacity, and scale controls |
| `countyLayerVisibility` | Sources initially visible for each county |
| `defaultViewpoint` | California default view |

County planning content is in `data/county-capabilities.json`. Keep it data-only: no HTML, executable code, credentials, tokens, or sensitive records.

## Repository structure

```text
.
├── index.html
├── styles.css
├── app.js
├── config.js
├── preferences.js
├── settings.html
├── settings.css
├── settings.js
├── data/
│   └── county-capabilities.json
├── docs/
│   ├── implementation-plan.md
│   └── data-source-audit.md
├── .gitignore
├── LICENSE
└── README.md
```

## Production hardening checklist

- Validate redirect URIs against the final Pages URL.
- Revalidate every connected item, owner, sharing level, refresh expectation, and dependency before release.
- Complete field/time/schema audits before using any source in a KPI, score, filter, alert, or workflow action.
- Establish stale thresholds and visible partial/error behavior.
- Confirm basemap entitlement and organization policy for signed-in and signed-out users.
- Add Content Security Policy headers through the chosen hosting layer where supported.
- Run accessibility checks at 200% zoom, keyboard-only navigation, reduced motion, and mobile breakpoints.
- Test authorization failures without downgrading secured content to anonymous access.
- Add observability that does not log credentials, private attributes, or sensitive locations.
- Establish an owner, review date, incident process, and rollback procedure.

## License

MIT. See `LICENSE`.
