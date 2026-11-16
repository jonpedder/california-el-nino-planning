# Implementation plan

## 1. Purpose and guardrails

Deliver a county planning interface that can mature into an operational application without implying that placeholder indicators or candidate sources are live. Preserve the separation between GitHub Pages static hosting and ArcGIS Online identity/content hosting.

Guardrails:

- No tokens, API keys, secrets, private exports, or fabricated item IDs in source control.
- No source is treated as operational until ownership, sharing, schema, refresh, and quality are verified.
- Candidate layer names remain plain text until an approved portal item or service is bound.
- Authorization failures are visible; the app must not silently substitute anonymous content.
- Real values require provenance, observation time, refresh status, and an explicit stale/error state.

## 2. Current starter scope

The starter provides:

- ArcGIS Maps SDK for JavaScript 5.1 CDN/ESM loading.
- Calcite components through the SDK loader; no separate Calcite loader.
- OAuth registration for the Public Safety portal.
- Signed-in and signed-out application states.
- A dark-gray basemap and county-specific map viewpoints.
- JSON-driven county queue and detail views.
- Distinct planning priorities for northern coastal and southern high-exposure counties.
- Accessible focus treatment, skip navigation, semantic controls, reduced-motion support, and readable state messaging.

The starter does not provide:

- Live forecasts, observations, incidents, road closures, evacuation status, or shelter capacity.
- A Web Map, Feature Layer, stream service, or other operational binding.
- Server-side code, a proxy, data transformation, editing, or offline storage.
- An authorization decision beyond ArcGIS Online's own OAuth and item/service permissions.

## 3. Delivery phases

### Phase A — registration and deployment

1. Create the Git repository with an appropriate private visibility setting.
2. Enable Pages from the intended branch and root directory.
3. Determine whether the deployed Pages site itself must be private and verify plan support.
4. Register the exact production and approved development redirect URIs on the existing ArcGIS Online application item.
5. Verify sign-in, returning-user sign-in, sign-out, and unauthorized-user behavior.
6. Record the application owner, backup owner, portal item owner, deployment branch, and rollback contact.

**Exit criteria:** static application loads over HTTPS, OAuth redirect succeeds, no token appears in repository or console logs, and signed-out content remains clearly non-operational.

### Phase B — data discovery and audit

1. Search the target portal for candidate Web Maps and layer items using the names in the county JSON only as prompts.
2. Record each candidate in `data-source-audit.md`.
3. Verify item type, owner, authoritative status, sharing, dependent service URLs, sublayers, capabilities, fields, spatial reference, and renderer/popups.
4. Verify temporal semantics: observation time, valid time, update cadence, latency, and stale threshold.
5. Verify geographic coverage and county boundary behavior.
6. Confirm licensing, privacy, aggregation, retention, and public-release constraints.

**Exit criteria:** every proposed source has an accountable owner, approved access, a stable field contract, documented time semantics, and a go/no-go decision.

### Phase C — Web Map and layer integration

1. Prefer an approved Web Map when it owns the intended layer order, symbology, popups, filters, and bookmarks.
2. Otherwise bind approved portal layer item IDs; avoid raw service URLs unless no item exists and default service visualization is intentional.
3. Keep all IDs in configuration, never scattered through event handlers or markup.
4. Add load/error listeners for each operational layer.
5. Implement county filters using verified fields and escaped values.
6. Preserve map state when county selection changes.
7. Add source attribution and a visible last-updated/stale indicator.

**Exit criteria:** all layers load for authorized users, sharing failures are explicit, county filters are validated, and the UI reconciles map and KPI scope.

### Phase D — metrics and workflows

1. Define each KPI's numerator, denominator, units, null handling, geographic scope, time window, and source.
2. Query only necessary fields and use server-side statistics where supported.
3. Distinguish zero from no data, not authorized, failed, and stale.
4. Cancel or ignore stale requests when county selection changes rapidly.
5. Add retry controls for recoverable network failures.
6. Add deep links only after the privacy implications of URL state are reviewed.

**Exit criteria:** KPI values are reproducible from documented queries, all values show source/time context, and race conditions do not display a prior county's results.

### Phase E — release assurance

1. Run keyboard-only and screen-reader checks.
2. Test 320 px width, tablet, desktop, 200% zoom, high contrast, and reduced motion.
3. Test signed-out, unauthorized, empty, partial, error, stale, and slow-loading conditions.
4. Verify that all semantic colors include text labels.
5. Verify all portal and service dependencies from a non-owner account.
6. Conduct security review for token leakage, unsafe HTML, third-party dependencies, logging, and data sensitivity.
7. Document rollback and incident-response steps.

**Exit criteria:** accessibility, security, operational ownership, and data-source sign-offs are recorded before promotion.

## 4. Technical decisions

### SDK loading

Use the 5.1 module loader:

```html
<script type="module" src="https://js.arcgis.com/5.1/"></script>
```

Load core modules with `$arcgis.import()` and individual module paths. Do not use AMD `require()`, removed barrel imports, deprecated widgets, or a second Calcite script.

### Authentication

Use `OAuthInfo` and `IdentityManager` with the registered client ID and portal URL. The OAuth application registration is public configuration; tokens are runtime secrets and must never be committed or logged. Redirect flow is selected for mobile reliability.

### State and rendering

- County configuration is loaded with `fetch()` from a relative path.
- DOM nodes are created with `createElement()` and populated with `textContent`.
- Selection state is represented by `aria-pressed` and a visible selected border.
- Map navigation occurs only after `viewOnReady()`.
- Failed map startup leaves county details usable.

### Configuration growth

Add audited IDs to `config.js` or to a deployment-specific file excluded from source control when environments differ. Use `null`/empty configuration for missing bindings rather than invented values. If configuration becomes sensitive, it does not belong in a static client at all; move that decision to a secured service.

## 5. Testing matrix

| Area | Minimum cases |
| --- | --- |
| Authentication | Signed out, sign in success, cancel/failure, returning session, sign out, unauthorized item |
| Data | Valid JSON, empty counties, malformed JSON, 404, missing optional arrays |
| Map | SDK unavailable, basemap failure, ready view, failed navigation, narrow viewport |
| Accessibility | Keyboard queue selection, visible focus, skip link, status announcements, 200% zoom |
| Responsive | 320 px, 680 px, 980 px, large desktop, landscape mobile |
| Security | No tokens in files/logs/URLs, no unsafe HTML, private item denied to unauthorized account |
| Operations | Current, stale, partial, empty, and failed source states once live data is integrated |

## 6. Definition of production-ready

The app is not production-ready merely because it renders. Production readiness requires approved data bindings, verified sharing, documented metric definitions, monitored freshness, accessible behavior, release ownership, incident handling, and tested rollback. Until those conditions are met, retain the planning disclaimers and `Not connected` indicators.
