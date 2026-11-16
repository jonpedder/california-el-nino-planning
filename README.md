# California El Niño Planning

A no-build static ArcGIS application for county-level El Niño planning. It uses the ArcGIS Maps SDK for JavaScript 5.1 CDN/ESM loader, Calcite components supplied by that loader, and a CA Security Ops dark navy/gold visual system.

> **Planning status:** The map connects to nine verified public ArcGIS Online/Living Atlas items for forecast, advisory, fire, flood-hazard, structure, coastal-exposure, and Los Angeles debris-flow context. County indicators remain explicit placeholders; no connected layer yet drives a risk score or operational decision.

## What is included

- Responsive command-center layout with a header, status strip, county threat queue, map, and capability detail.
- Data-driven profiles for Marin, Santa Cruz, Los Angeles, and San Diego.
- County-specific threats, capabilities, placeholder KPIs, viewpoints, and disclaimers.
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
- WFIGS Interagency Fire Perimeters — history/recent-burn context.
- WFIGS Current Interagency Fire Perimeters — available but off by default.
- USA Flood Hazard Areas — FEMA-derived planning/regulatory context, visible at 1:400,000 and larger.
- USA Structures — exposure context, available at 1:50,000 and larger and off by default.
- Employment in Coastal Inundation Zones — NOAA county-level coastal exposure planning.
- USA 2020 Census Population Characteristics — public demographic map context, off by default.
- Los Angeles County Post-Fire Debris Flow Hazards — LA County-specific planning context.

County detail includes 2026 Esri Updated Demographics and a generated Business Analyst Graphic Profile for each county. Those county cards and committed reports are documented snapshots. In addition, signed-in users receive current on-demand Business Analyst demographic context inside each polygon popup. Polygon results are cached for the browser session to prevent repeat requests for the same feature. Each new polygon enrichment consumes GeoEnrichment credits; viewing committed reports does not. Graphic Profile templates carry their own labeled data vintages, which can differ from current-year popup and county-card values.

Forecasts, observations/advisories, planning hazards, exposure layers, and incident history are not interchangeable. The application preserves those distinctions and does not calculate exposure counts in the browser.

## Architecture and hosting boundary

**GitHub Pages hosts the static files** in this repository: HTML, CSS, JavaScript, documentation, and county planning JSON.

**ArcGIS Online hosts identity and GIS content.** The app is registered against the Public Safety organization and uses ArcGIS Online for OAuth. Public and future secured layers remain portal content; they are not copied into GitHub Pages.

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

The client ID is a public application identifier, not a secret. In ArcGIS Online, add the exact deployed URL and any explicitly required development URL as allowed redirect URIs. The app uses redirect OAuth (`popup: false`).

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
