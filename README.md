# California El Niño Planning

A no-build, static starter application for county-level El Niño planning. It uses the ArcGIS Maps SDK for JavaScript 5.1 CDN/ESM loader, Calcite components supplied by that loader, and a CA Security Ops dark navy/gold visual system.

> **Planning status:** This repository does not connect to operational feeds and does not claim that any data is live. County indicators are explicit placeholders. Candidate layer names are unverified discovery prompts only.

## What is included

- Responsive command-center layout: header, status strip, county threat queue, map, and capability detail.
- Data-driven profiles for Marin, Santa Cruz, Los Angeles, and San Diego.
- County-specific threats, capability modules, placeholder KPIs, viewpoints, candidate layer names, and disclaimers.
- ArcGIS Online OAuth sign-in/sign-out UI for `https://publicsafety.maps.arcgis.com`.
- A dark-gray basemap without a fabricated Web Map or layer item ID.
- Loading, empty, map-failure, configuration-error, signed-in, and signed-out states.
- Native/Calcite controls, visible keyboard focus, a skip link, semantic headings, and live status announcements.

## Architecture and hosting boundary

**GitHub Pages hosts the static files** in this repository: HTML, CSS, JavaScript, documentation, and the county planning JSON.

**ArcGIS Online hosts identity and configured GIS content.** The app is registered against the Public Safety organization and uses ArcGIS Online for OAuth. Future approved Web Maps, hosted layers, and secured services remain ArcGIS Online content; they are not copied into GitHub Pages.

No access token belongs in this repository. OAuth credentials are issued at runtime by ArcGIS Online and managed by the ArcGIS Maps SDK `IdentityManager`.

## Run and deployment model

This is a no-build project. Because ES modules and `fetch()` require an HTTP origin, do not rely on opening `index.html` with a `file://` URL.

### Deploy to GitHub Pages

1. Create a repository and commit the files in this directory.
2. In GitHub, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the deployment branch (commonly `main`) and `/ (root)`.
5. Save, then note the final HTTPS URL, for example:
   - User/organization site: `https://ACCOUNT.github.io/`
   - Project site: `https://ACCOUNT.github.io/REPOSITORY/`
6. Add the exact final Pages URL to the ArcGIS Online application's redirect URI list before testing sign-in.

All internal asset paths are relative, so the starter works from a project-site subpath.

### Private-ready considerations

- The source repository can be private if the GitHub plan supports Pages for private repositories.
- A private repository does **not automatically make a GitHub Pages site private**. Confirm the Pages visibility offered by your GitHub plan and organization policy.
- Treat every file deployed to Pages, including `data/county-capabilities.json`, as browser-readable.
- Keep sensitive GIS content private in ArcGIS Online and require OAuth. Never put secrets, tokens, restricted attributes, or confidential exports in this repository.
- Review ArcGIS Online item sharing separately; the static site's visibility does not grant access to private portal content.

## ArcGIS Online app registration

The configured portal is:

```text
https://publicsafety.maps.arcgis.com
```

The configured OAuth client ID is already present in `config.js`:

```text
2eURPxapfMdaZiS7
```

In ArcGIS Online:

1. Sign in to the Public Safety organization with permission to manage the registered application.
2. Open the application item associated with the client ID.
3. Add the exact GitHub Pages URL as an allowed redirect URI. Match scheme, hostname, path, and trailing-slash behavior exactly.
4. Add local development redirect URIs only when explicitly needed, using the exact local origin/path served by your static server.
5. Save and test both first-time sign-in and returning-user sign-in.
6. Confirm sign-out destroys the browser-held ArcGIS credential and returns the shell to its signed-out state.

The starter uses a redirect OAuth flow (`popup: false`) to avoid popup-blocker problems. Do not replace the client ID with a token and do not commit a token.

## ArcGIS Online content and sharing

No Web Map or operational layer item ID is included. `config.js` intentionally keeps these bindings empty:

- `webMapItemId: null`
- `operationalLayerItems: {}`

When real content is approved:

1. Complete the source audit in `docs/data-source-audit.md`.
2. Prefer portal item IDs for saved symbology, popups, and sharing behavior.
3. Add only verified item IDs from the target portal to `config.js` or a reviewed deployment-specific configuration file.
4. Share private items only with the required ArcGIS Online groups or organization members.
5. Verify that the OAuth user can access every item and any dependent services.
6. Test signed-out, unauthorized, empty, stale, and service-error behavior.

Private ArcGIS Online sharing is enforced by ArcGIS Online, not by GitHub Pages. A user may load the public static shell yet remain unable to load secured map content until authenticated and authorized.

## Configuration

`config.js` is the deployment boundary:

| Setting | Current value | Purpose |
| --- | --- | --- |
| `portalUrl` | Public Safety portal URL | OAuth and portal context |
| `oauthClientId` | Registered client ID | OAuth application registration |
| `basemap` | `dark-gray-vector` | Initial dark-gray basemap |
| `countyDataUrl` | Relative JSON path | County planning profiles |
| `webMapItemId` | `null` | Placeholder for a future audited Web Map |
| `operationalLayerItems` | Empty object | Placeholder for future approved layer item IDs |
| `defaultViewpoint` | California | Signed-out/default map view |

County planning content is in `data/county-capabilities.json`. Keep the schema data-only: do not place HTML, executable code, credentials, service tokens, or sensitive operational records in it.

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

- Validate the application redirect URIs against the final Pages URL.
- Audit and approve each GIS source, owner, sharing level, refresh expectation, and field contract.
- Add an approved Web Map or layers only after source verification.
- Confirm basemap entitlement and organization policy for signed-in and signed-out users.
- Add Content Security Policy headers through the chosen hosting layer if available; GitHub Pages itself offers limited header control.
- Run accessibility checks at 200% zoom, keyboard-only navigation, reduced motion, and mobile breakpoints.
- Test authorization failures without downgrading secured content to anonymous access.
- Add observability that does not log tokens, credentials, private attributes, or sensitive locations.
- Establish an owner, review date, incident process, and rollback procedure.

## License

MIT. See `LICENSE`.
