# Data-source audit

## Status

No operational source has been verified or connected. The names in `data/county-capabilities.json` are candidate discovery phrases, not confirmed ArcGIS Online items, services, feeds, or authoritative products. The application must continue to display `Not connected` / `Unverified` until this audit is completed and approved.

## Audit rules

1. Never turn a search result into an application binding based on title alone.
2. Record the portal item ID only after independently verifying portal, item type, owner, sharing, service dependency, and intended use.
3. Prefer a portal item over a bare service URL when the item carries approved symbology, popups, labels, clustering, filters, or attribution.
4. Do not claim a refresh cadence, observation time, forecast validity, or live status without source evidence.
5. Test with an intended non-owner account; owner access does not prove group/organization access.
6. Verify all dependent layers, tables, views, joins, related records, and external services.
7. Document nulls, suppressed values, geometry gaps, transfer limits, pagination, and county coverage.
8. Record a stale threshold and user-visible behavior before treating a source as operational.

## Candidate source inventory

All entries below are **unverified candidate names only**.

| County | Planning need | Candidate discovery name | Verification status |
| --- | --- | --- | --- |
| Marin | Coastal flooding | Marin County coastal flood hazard zones | Unverified |
| Marin | Transportation | Marin County road closures and transportation constraints | Unverified |
| Marin | Facilities | Marin County critical facilities | Unverified |
| Marin | Coastal context | NOAA coastal water-level planning products | Unverified |
| Santa Cruz | Coastal flooding | Santa Cruz County coastal flood hazard zones | Unverified |
| Santa Cruz | Transportation | Santa Cruz County road closures and transportation constraints | Unverified |
| Santa Cruz | Facilities | Santa Cruz County critical facilities | Unverified |
| Santa Cruz | Road status | California highway and local road status | Unverified |
| Los Angeles | Debris flow | Los Angeles County debris-flow and burn-scar planning areas | Unverified |
| Los Angeles | Flash flooding | Los Angeles County flash-flood hazard areas | Unverified |
| Los Angeles | Exposure | Los Angeles County population exposure indicators | Unverified |
| Los Angeles | Facilities/routes | Los Angeles County critical facilities and evacuation routes | Unverified |
| San Diego | Flash flooding | San Diego County flash-flood and drainage planning areas | Unverified |
| San Diego | Debris flow | San Diego County burn-scar and debris-flow planning areas | Unverified |
| San Diego | Exposure | San Diego County population exposure indicators | Unverified |
| San Diego | Facilities/routes | San Diego County critical facilities and evacuation routes | Unverified |

## Source review record

Create one record per candidate after discovery. Do not put tokens or confidential values in this document.

| Field | Required evidence |
| --- | --- |
| Review decision | Approved / conditional / rejected with reviewer and date |
| Portal | Exact portal hostname |
| Item title and type | Item metadata read directly from portal |
| Item ID | Verified 32-character portal item ID; blank until approved |
| Owner / steward | Named accountable owner and support contact |
| Authoritative designation | Portal badge, steward confirmation, or governance record |
| Sharing | Private, group, organization, or public; intended audience confirmed |
| Dependent service | Exact service and sublayer/table indexes |
| Capabilities | Query, statistics, pagination, time, attachments, editing as applicable |
| Schema contract | Required fields, aliases, types, domains, null rules, object/global ID |
| Geometry | Type, spatial reference, validity, county coverage, generalization |
| Time semantics | Observation, valid, publish, and update fields with timezone |
| Refresh behavior | Documented cadence, expected latency, and stale threshold |
| Scale / visibility | Min/max scale and clustering/generalization behavior |
| Symbology / popup | Approved renderer, labels, popup fields, field formatting |
| Quality | Completeness, accuracy, duplicates, known gaps, suppression |
| Licensing | Reuse, attribution, redistribution, and derivative-work requirements |
| Privacy / sensitivity | Aggregation, restricted attributes, retention, and disclosure review |
| Failure behavior | Empty, partial, unauthorized, timeout, and stale presentation |
| Test evidence | Date, account type, query samples, counts, and reviewer |

## KPI provenance requirements

Before replacing any placeholder KPI, document:

- Plain-language definition and decision supported.
- Source item/layer and exact fields.
- Filter expression and county boundary logic.
- Numerator, denominator, units, rounding, and aggregation.
- Time window, timezone, observation time, and refresh cadence.
- Treatment of null, zero, suppressed, duplicate, and out-of-range records.
- Expected count/range and an independent validation result.
- User-visible source attribution, last-updated value, and stale threshold.
- Behavior when unauthorized, empty, partial, slow, stale, or failed.

### Planned KPI placeholders

| KPI | Current state | Minimum inputs before activation |
| --- | --- | --- |
| Coastal assets/areas exposed | Not connected | Approved coastal hazard geometry, asset/exposure layer, time/forecast context |
| Routes/road segments at risk | Not connected | Audited transportation network or closures, intersection rule, status time |
| Shelter capacity | Not connected | Validated facilities, capacity definition, operational status, update owner |
| Population exposed | Not connected | Approved hazard extent, population source, allocation method, vintage |
| Debris-flow or slope areas | Not connected | Authoritative hazard polygons, burn-scar/rain context, validity date |
| Critical facilities | Not connected | Approved facility inventory, sensitivity review, hazard overlay method |
| Flood-prone crossings | Not connected | Audited crossing inventory, hazard/status field, update cadence |
| Planning confidence | Unverified | Published scoring method tied to source completeness and freshness |

## Approval gate

A source may be added to `config.js` only when:

- The source review record is complete.
- The owner and intended audience approve its use.
- Sharing is least-privilege and tested with a representative user.
- Required fields and sublayers are stable and documented.
- Time/freshness semantics are known.
- Empty, unauthorized, stale, partial, and error states have defined UI behavior.
- Security, privacy, licensing, and accessibility implications are accepted.

Until then, keep the source as plain candidate text and retain all planning disclaimers.
