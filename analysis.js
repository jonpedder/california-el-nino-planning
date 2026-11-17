import { loadPreferences, applyPreferences } from "./preferences.js?v=settings1";
applyPreferences(loadPreferences());

const FeatureLayer = await $arcgis.import("@arcgis/core/layers/FeatureLayer.js");

const ANALYSIS_CONFIG = Object.freeze({
  refreshMinutes: 15,
  regions: Object.freeze([
    Object.freeze({ id: "marin", county: "Marin", label: "Marin County" }),
    Object.freeze({ id: "santa-cruz", county: "Santa Cruz", label: "Santa Cruz County" }),
    Object.freeze({ id: "los-angeles", county: "Los Angeles", label: "Los Angeles County" }),
    Object.freeze({ id: "san-diego", county: "San Diego", label: "San Diego County" })
  ]),
  urls: Object.freeze({
    qpfAmount: "https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/services/NDFD_Precipitation_v1/FeatureServer/0",
    qpfCumulative: "https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/services/NDFD_Precipitation_v1/FeatureServer/2",
    warnings: "https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/services/NWS_Watches_Warnings_v1/FeatureServer/6",
    gauges: "https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/services/Live_Stream_Gauges_v1/FeatureServer/0",
    fireHistory: "https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/WFIGS_Interagency_Perimeters/FeatureServer/0",
    riskCounties: "https://services.arcgis.com/XG15cJAlne2vxtgt/arcgis/rest/services/National_Risk_Index_Counties/FeatureServer/0"
  })
});

const elements = {
  regionFilter: document.querySelector("#region-filter"),
  historyFilter: document.querySelector("#history-filter"),
  refreshButton: document.querySelector("#refresh-analysis"),
  status: document.querySelector("#analysis-status"),
  updated: document.querySelector("#analysis-updated"),
  loading: document.querySelector("#analysis-loading"),
  content: document.querySelector("#analysis-content"),
  kpiPrecip: document.querySelector("#kpi-precip"),
  kpiWarnings: document.querySelector("#kpi-warnings"),
  kpiGauges: document.querySelector("#kpi-gauges"),
  kpiElevated: document.querySelector("#kpi-elevated"),
  kpiFireAcres: document.querySelector("#kpi-fire-acres"),
  kpiRisk: document.querySelector("#kpi-risk"),
  forecastChart: document.querySelector("#forecast-chart"),
  forecastEmpty: document.querySelector("#forecast-empty"),
  forecastTableWrap: document.querySelector("#forecast-table-wrap"),
  gaugeTableWrap: document.querySelector("#gauge-table-wrap"),
  riskProfile: document.querySelector("#risk-profile"),
  timelineList: document.querySelector("#timeline-list"),
  timelineCount: document.querySelector("#timeline-count"),
  sourceMatrix: document.querySelector("#source-matrix")
};

const layers = Object.fromEntries(
  Object.entries(ANALYSIS_CONFIG.urls).map(([key, url]) => [key, new FeatureLayer({ url })])
);

const state = {
  running: false,
  timer: null,
  lastResults: null
};

window.__app = { ANALYSIS_CONFIG, layers, state, refresh: runAnalysis };

elements.refreshButton.addEventListener("click", runAnalysis);
elements.regionFilter.addEventListener("calciteSelectChange", runAnalysis);
elements.historyFilter.addEventListener("calciteSelectChange", runAnalysis);

initialize().catch((error) => showFatalError(error));

async function initialize() {
  await customElements.whenDefined("calcite-select");
  const layerLoads = await Promise.allSettled(Object.values(layers).map((layer) => layer.load()));
  if (layerLoads.every((result) => result.status === "rejected")) {
    throw new Error("No analysis source layers could be loaded.");
  }
  await runAnalysis();
  state.timer = window.setInterval(runAnalysis, ANALYSIS_CONFIG.refreshMinutes * 60 * 1000);
}

async function runAnalysis() {
  if (state.running) return;
  state.running = true;
  elements.refreshButton.loading = true;
  elements.refreshButton.disabled = true;
  elements.loading.hidden = false;
  elements.loading.classList.remove("error");
  elements.loading.replaceChildren(createLoader(), document.createTextNode("Loading regional history and forecast…"));
  elements.status.textContent = "Refreshing public sources…";

  try {
    const selectedRegions = await querySelectedRegions();
    if (!selectedRegions.length) throw new Error("No county geometry was returned for the selected region.");

    const historyDays = Number(elements.historyFilter.value || 365);
    const fireCutoff = new Date(Date.now() - historyDays * 86400000);
    const jobs = {
      qpfAmount: queryAcrossRegions(layers.qpfAmount, selectedRegions, {
        where: "region = 2",
        outFields: ["OBJECTID", "category", "fromdate", "todate", "label"]
      }),
      qpfCumulative: queryAcrossRegions(layers.qpfCumulative, selectedRegions, {
        where: "region = 2",
        outFields: ["OBJECTID", "category", "fromdate", "todate", "label"]
      }),
      warnings: queryAcrossRegions(layers.warnings, selectedRegions, {
        where: "1=1",
        outFields: ["OBJECTID", "Event", "Severity", "Summary", "Urgency", "Certainty", "Updated", "Start", "End_", "Uid", "Affected", "HrsSinceUpdated", "HrsUntilEffective", "HrsUntilExpiration", "DamageThreat"]
      }),
      gauges: queryAcrossRegions(layers.gauges, selectedRegions, {
        where: "org = 'USGS'",
        outFields: ["OBJECTID", "stationid", "name", "governing_location", "stage_ft", "flow_cfs", "status", "statusClass", "status_full", "status_24h", "status_48h", "status_72h", "lastupdate", "lastupdate_age"]
      }),
      fireHistory: queryAcrossRegions(layers.fireHistory, selectedRegions, {
        where: `attr_FireDiscoveryDateTime >= TIMESTAMP '${formatSqlTimestamp(fireCutoff)}'`,
        outFields: ["OBJECTID", "poly_IncidentName", "poly_GISAcres", "poly_DateCurrent", "attr_UniqueFireIdentifier", "attr_IncidentName", "attr_CalculatedAcres", "attr_IncidentSize", "attr_FinalAcres", "attr_FireDiscoveryDateTime", "attr_FireOutDateTime"]
      })
    };

    const names = Object.keys(jobs);
    const settled = await Promise.allSettled(Object.values(jobs));
    const results = Object.fromEntries(names.map((name, index) => [name, settled[index]]));
    const data = Object.fromEntries(names.map((name) => [name, results[name].status === "fulfilled" ? results[name].value : { features: [], partial: false }]));

    const forecast = aggregateForecast(data.qpfAmount.features);
    const cumulative = selectMaximumPrecipitation(data.qpfCumulative.features);
    const warnings = normalizeWarnings(data.warnings.features);
    const gauges = normalizeGauges(data.gauges.features);
    const fires = normalizeFires(data.fireHistory.features, historyDays);
    const risk = selectedRegions.map((region) => normalizeRisk(region.feature.attributes, region));

    renderKpis({ cumulative, warnings, gauges, fires, risk });
    renderForecast(forecast);
    renderGauges(gauges);
    renderRisk(risk);
    renderTimeline(buildTimeline({ forecast, warnings, gauges, fires }));
    renderSourceMatrix(results);

    const failed = names.filter((name) => results[name].status === "rejected");
    const partial = names.filter((name) => data[name].partial);
    state.lastResults = { selectedRegions, historyDays, forecast, cumulative, warnings, gauges, fires, risk, failed, partial };
    elements.content.hidden = false;
    elements.loading.hidden = true;
    elements.status.textContent = failed.length || partial.length
      ? `Partial analysis — ${failed.length} unavailable, ${partial.length} truncated`
      : "Analysis current";
    elements.updated.textContent = `Updated ${new Date().toLocaleString()}`;
  } catch (error) {
    console.error("Analysis refresh failed.", error);
    elements.loading.hidden = false;
    elements.loading.classList.add("error");
    elements.loading.replaceChildren(document.createTextNode("Analysis could not be refreshed. Public sources may be temporarily unavailable."));
    elements.status.textContent = "Analysis unavailable";
  } finally {
    elements.refreshButton.loading = false;
    elements.refreshButton.disabled = false;
    state.running = false;
  }
}

async function querySelectedRegions() {
  const selected = elements.regionFilter.value || "all";
  const regionDefs = selected === "all"
    ? ANALYSIS_CONFIG.regions
    : ANALYSIS_CONFIG.regions.filter((region) => region.id === selected);
  const countyNames = regionDefs.map((region) => `'${region.county.replaceAll("'", "''")}'`).join(",");
  const query = layers.riskCounties.createQuery();
  query.where = `STATEABBRV = 'CA' AND COUNTY IN (${countyNames})`;
  query.outFields = ["COUNTY", "RISK_RATNG", "RISK_SCORE", "EAL_VALT", "SOVI_RATNG", "RESL_RATNG", "CFLD_RISKR", "IFLD_RISKR", "LNDS_RISKR"];
  query.returnGeometry = true;
  const result = await layers.riskCounties.queryFeatures(query);
  const byCounty = new Map(result.features.map((feature) => [feature.attributes.COUNTY, feature]));
  return regionDefs
    .map((region) => ({ ...region, feature: byCounty.get(region.county), geometry: byCounty.get(region.county)?.geometry }))
    .filter((region) => region.geometry);
}

async function queryAcrossRegions(layer, regions, options) {
  const tasks = regions.map(async (region) => {
    const query = layer.createQuery();
    query.where = options.where || "1=1";
    query.geometry = region.geometry;
    query.spatialRelationship = "intersects";
    query.outFields = options.outFields || ["*"];
    query.returnGeometry = false;
    const result = await layer.queryFeatures(query);
    return { result, region };
  });
  const settled = await Promise.allSettled(tasks);
  const successes = settled.filter((result) => result.status === "fulfilled").map((result) => result.value);
  if (!successes.length) throw settled.find((result) => result.status === "rejected")?.reason || new Error(`No ${layer.title} results.`);

  const objectIdField = layer.objectIdField || "OBJECTID";
  const features = new Map();
  let partial = settled.some((result) => result.status === "rejected");
  successes.forEach(({ result, region }) => {
    partial ||= Boolean(result.exceededTransferLimit);
    result.features.forEach((feature) => {
      const id = feature.attributes?.[objectIdField] ?? `${region.id}:${features.size}`;
      if (!features.has(id)) {
        feature.__analysisRegions = [region.label];
        features.set(id, feature);
      } else {
        features.get(id).__analysisRegions.push(region.label);
      }
    });
  });
  return { features: [...features.values()], partial };
}

function aggregateForecast(features) {
  const periods = new Map();
  features.forEach((feature) => {
    const attributes = feature.attributes;
    const key = `${attributes.fromdate}:${attributes.todate}`;
    const range = parsePrecipitationLabel(attributes.label);
    const existing = periods.get(key);
    if (!existing || attributes.category > existing.category) {
      periods.set(key, {
        start: new Date(attributes.fromdate),
        end: new Date(attributes.todate),
        category: attributes.category,
        label: attributes.label || "Not available",
        lower: range.lower,
        upper: range.upper,
        regions: feature.__analysisRegions || []
      });
    }
  });
  return [...periods.values()].sort((a, b) => a.start - b.start);
}

function selectMaximumPrecipitation(features) {
  return features.reduce((maximum, feature) => {
    const attributes = feature.attributes;
    if (!maximum || Number(attributes.category) > Number(maximum.category)) {
      return { ...attributes, ...parsePrecipitationLabel(attributes.label) };
    }
    return maximum;
  }, null);
}

function parsePrecipitationLabel(label = "") {
  const numbers = String(label).match(/\d+(?:\.\d+)?/g)?.map(Number) || [];
  return {
    lower: numbers[0] ?? 0,
    upper: numbers[1] ?? numbers[0] ?? 0
  };
}

function normalizeWarnings(features) {
  const now = Date.now();
  return features.map((feature) => {
    const attributes = feature.attributes;
    return {
      id: attributes.Uid || attributes.OBJECTID,
      event: attributes.Event || "Weather advisory",
      severity: attributes.Severity || "Unknown",
      summary: attributes.Summary || attributes.Affected || "No summary supplied.",
      affected: attributes.Affected || feature.__analysisRegions?.join(", ") || "Selected region",
      start: attributes.Start ? new Date(attributes.Start) : new Date(attributes.Updated || now),
      end: attributes.End_ ? new Date(attributes.End_) : null,
      active: (!attributes.Start || attributes.Start <= now) && (!attributes.End_ || attributes.End_ >= now),
      regions: feature.__analysisRegions || []
    };
  }).sort((a, b) => a.start - b.start);
}

function normalizeGauges(features) {
  return features.map((feature) => {
    const attributes = feature.attributes;
    const age = Number(attributes.lastupdate_age);
    return {
      ...attributes,
      updated: attributes.lastupdate ? new Date(attributes.lastupdate) : null,
      age: Number.isFinite(age) ? age : null,
      fresh: Number.isFinite(age) && age <= 6,
      elevated: Number(attributes.statusClass) >= 2,
      regions: feature.__analysisRegions || []
    };
  }).sort((a, b) => Number(b.elevated) - Number(a.elevated) || (a.age ?? 99999) - (b.age ?? 99999));
}

function normalizeFires(features, historyDays) {
  const cutoff = Date.now() - historyDays * 86400000;
  const incidents = new Map();
  features.forEach((feature) => {
    const attributes = feature.attributes;
    const dateValue = attributes.attr_FireDiscoveryDateTime || attributes.poly_DateCurrent;
    if (!dateValue || dateValue < cutoff) return;
    const id = attributes.attr_UniqueFireIdentifier || attributes.attr_IncidentName || attributes.poly_IncidentName || attributes.OBJECTID;
    const acres = Math.max(
      Number(attributes.attr_FinalAcres) || 0,
      Number(attributes.attr_IncidentSize) || 0,
      Number(attributes.attr_CalculatedAcres) || 0,
      Number(attributes.poly_GISAcres) || 0
    );
    const existing = incidents.get(id);
    if (!existing || acres > existing.acres) {
      incidents.set(id, {
        id,
        name: attributes.attr_IncidentName || attributes.poly_IncidentName || "Unnamed incident",
        acres,
        discovered: new Date(dateValue),
        out: attributes.attr_FireOutDateTime ? new Date(attributes.attr_FireOutDateTime) : null,
        regions: feature.__analysisRegions || []
      });
    }
  });
  return [...incidents.values()].sort((a, b) => b.discovered - a.discovered);
}

function normalizeRisk(attributes, region) {
  return {
    id: region.id,
    label: region.label,
    rating: attributes.RISK_RATNG || "Not available",
    score: attributes.RISK_SCORE,
    expectedAnnualLoss: attributes.EAL_VALT,
    socialVulnerability: attributes.SOVI_RATNG || "Not available",
    resilience: attributes.RESL_RATNG || "Not available",
    coastalFlooding: attributes.CFLD_RISKR || "Not available",
    inlandFlooding: attributes.IFLD_RISKR || "Not available",
    landslide: attributes.LNDS_RISKR || "Not available"
  };
}

function renderKpis({ cumulative, warnings, gauges, fires, risk }) {
  elements.kpiPrecip.textContent = cumulative?.label || "No forecast";
  elements.kpiWarnings.textContent = formatCount(warnings.filter((warning) => warning.active).length);
  elements.kpiGauges.textContent = formatCount(gauges.filter((gauge) => gauge.fresh).length);
  elements.kpiElevated.textContent = formatCount(gauges.filter((gauge) => gauge.fresh && gauge.elevated).length);
  elements.kpiFireAcres.textContent = `${formatCount(fires.reduce((sum, fire) => sum + fire.acres, 0))} acres`;
  elements.kpiRisk.textContent = highestRiskRating(risk.map((item) => item.rating));
}

function renderForecast(periods) {
  elements.forecastEmpty.hidden = periods.length > 0;
  elements.forecastChart.hidden = periods.length === 0;
  elements.forecastTableWrap.replaceChildren();
  if (!periods.length) {
    elements.forecastChart.replaceChildren();
    return;
  }

  const svg = elements.forecastChart;
  svg.replaceChildren();
  const title = svgNode("title");
  title.textContent = "Regional precipitation forecast";
  const description = svgNode("desc");
  description.textContent = "Maximum precipitation range by forecast time period.";
  svg.append(title, description);

  const width = 900;
  const height = 300;
  const margin = { top: 30, right: 24, bottom: 65, left: 54 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const maxValue = Math.max(0.25, ...periods.map((period) => period.upper));
  const step = chartWidth / periods.length;
  const barWidth = Math.max(12, Math.min(62, step * 0.64));

  for (let tick = 0; tick <= 4; tick += 1) {
    const value = maxValue * tick / 4;
    const y = margin.top + chartHeight - chartHeight * tick / 4;
    const line = svgNode("line", { x1: margin.left, y1: y, x2: width - margin.right, y2: y, class: "chart-grid" });
    const label = svgNode("text", { x: margin.left - 8, y: y + 4, class: "chart-axis-label", "text-anchor": "end" });
    label.textContent = `${value.toFixed(value < 1 ? 2 : 1)} in`;
    svg.append(line, label);
  }

  periods.forEach((period, index) => {
    const x = margin.left + step * index + (step - barWidth) / 2;
    const barHeight = Math.max(2, chartHeight * period.upper / maxValue);
    const y = margin.top + chartHeight - barHeight;
    const bar = svgNode("rect", { x, y, width: barWidth, height: barHeight, rx: 2, class: period.upper >= 1 ? "chart-bar alert" : "chart-bar" });
    const value = svgNode("text", { x: x + barWidth / 2, y: y - 7, class: "chart-value" });
    value.textContent = period.label.replace(" inches", " in");
    const time = svgNode("text", { x: x + barWidth / 2, y: height - 36, class: "chart-time" });
    time.textContent = formatChartTime(period.start);
    svg.append(bar, value, time);
  });

  elements.forecastTableWrap.append(createTable(
    ["Forecast period", "Regional maximum", "Coverage"],
    periods.map((period) => [
      `${formatDateTime(period.start)} – ${formatTime(period.end)}`,
      period.label,
      unique(period.regions).join(", ") || "Selected region"
    ])
  ));
}

function renderGauges(gauges) {
  elements.gaugeTableWrap.replaceChildren();
  if (!gauges.length) {
    elements.gaugeTableWrap.append(createEmpty("No USGS gauges intersect the selected region."));
    return;
  }
  const displayed = gauges.slice(0, 60);
  elements.gaugeTableWrap.append(createTable(
    ["Gauge", "Stage", "Flow", "Status", "Freshness"],
    displayed.map((gauge) => [
      gauge.name || gauge.stationid,
      formatMeasurement(gauge.stage_ft, "ft"),
      formatMeasurement(gauge.flow_cfs, "cfs"),
      gauge.status || statusClassLabel(gauge.statusClass),
      { text: gauge.age === null ? "Unknown" : `${formatCount(gauge.age)} hr`, className: gauge.fresh ? "value-fresh" : "value-stale" }
    ])
  ));
  if (gauges.length > displayed.length) {
    const note = document.createElement("p");
    note.className = "analysis-helper";
    note.textContent = `Showing ${displayed.length} of ${gauges.length} gauges.`;
    elements.gaugeTableWrap.append(note);
  }
}

function renderRisk(risk) {
  elements.riskProfile.replaceChildren();
  risk.forEach((item) => {
    const article = document.createElement("article");
    article.className = "risk-region";
    const header = document.createElement("header");
    const name = document.createElement("strong");
    name.textContent = item.label;
    const rating = document.createElement("span");
    rating.textContent = `${item.rating}${Number.isFinite(Number(item.score)) ? ` · ${Number(item.score).toFixed(1)}` : ""}`;
    header.append(name, rating);
    const list = document.createElement("dl");
    [
      ["Expected annual loss", formatCurrency(item.expectedAnnualLoss)],
      ["Social vulnerability", item.socialVulnerability],
      ["Community resilience", item.resilience],
      ["Coastal flooding", item.coastalFlooding],
      ["Inland flooding", item.inlandFlooding],
      ["Landslide", item.landslide]
    ].forEach(([label, value]) => {
      const container = document.createElement("div");
      const term = document.createElement("dt");
      const description = document.createElement("dd");
      term.textContent = label;
      description.textContent = value;
      container.append(term, description);
      list.append(container);
    });
    article.append(header, list);
    elements.riskProfile.append(article);
  });
}

function buildTimeline({ forecast, warnings, gauges, fires }) {
  const items = [];
  forecast.forEach((period) => items.push({
    time: period.start,
    type: "forecast",
    title: `Precipitation forecast: ${period.label}`,
    detail: `${formatDateTime(period.start)} through ${formatDateTime(period.end)} · regional maximum`
  }));
  warnings.forEach((warning) => items.push({
    time: warning.start,
    type: warning.active ? "current" : "forecast",
    title: warning.event,
    detail: `${warning.severity} · ${warning.affected}${warning.end ? ` · until ${formatDateTime(warning.end)}` : ""}`
  }));
  gauges.filter((gauge) => gauge.updated && (gauge.elevated || gauge.fresh)).slice(0, 12).forEach((gauge) => items.push({
    time: gauge.updated,
    type: "current",
    title: gauge.name || gauge.stationid,
    detail: `${formatMeasurement(gauge.stage_ft, "ft")} · ${formatMeasurement(gauge.flow_cfs, "cfs")} · ${gauge.fresh ? "fresh" : "stale"}`
  }));
  fires.slice(0, 30).forEach((fire) => items.push({
    time: fire.discovered,
    type: "history",
    title: fire.name,
    detail: `${formatCount(fire.acres)} acres · ${fire.regions.join(", ") || "selected region"}`
  }));
  return items.filter((item) => item.time instanceof Date && !Number.isNaN(item.time.valueOf())).sort((a, b) => a.time - b.time);
}

function renderTimeline(items) {
  elements.timelineList.replaceChildren();
  elements.timelineCount.textContent = `${formatCount(items.length)} events`;
  if (!items.length) {
    elements.timelineList.append(createEmpty("No temporal records were returned for the selected filters."));
    return;
  }

  const now = Date.now();
  let nowInserted = false;
  items.slice(-90).forEach((item) => {
    if (!nowInserted && item.time.valueOf() > now) {
      elements.timelineList.append(createNowMarker());
      nowInserted = true;
    }
    const listItem = document.createElement("li");
    listItem.className = `timeline-item ${item.type}`;
    const time = document.createElement("time");
    time.className = "timeline-time";
    time.dateTime = item.time.toISOString();
    time.textContent = formatTimelineTime(item.time);
    const dot = document.createElement("span");
    dot.className = "timeline-dot";
    dot.setAttribute("aria-hidden", "true");
    const content = document.createElement("div");
    content.className = "timeline-content";
    const title = document.createElement("strong");
    title.textContent = item.title;
    const detail = document.createElement("span");
    detail.textContent = item.detail;
    content.append(title, detail);
    listItem.append(time, dot, content);
    elements.timelineList.append(listItem);
  });
  if (!nowInserted) elements.timelineList.append(createNowMarker());
}

function createNowMarker() {
  const item = document.createElement("li");
  item.className = "timeline-now";
  const time = document.createElement("span");
  time.textContent = "NOW";
  const dot = document.createElement("span");
  dot.className = "timeline-dot";
  const label = document.createElement("span");
  label.textContent = "Past observations and incidents above · current and forecast information below";
  item.append(time, dot, label);
  return item;
}

function renderSourceMatrix(results) {
  const queryStatus = (name) => results[name]?.status === "fulfilled"
    ? (results[name].value.partial ? "Partial / truncated" : "Connected")
    : "Unavailable";
  const rows = [
    ["NWS precipitation forecast", "72-hour forecast chart and timeline", "Future forecast periods", queryStatus("qpfAmount")],
    ["NWS watches and warnings", "Advisory count and event windows", "Current and upcoming events", queryStatus("warnings")],
    ["USGS and community stream gauges", "Current stage, flow, status, and freshness", "Current snapshot; hourly source", queryStatus("gauges")],
    ["WFIGS fire-perimeter history", "Recent incident footprint by discovery date", "Selected historical window", queryStatus("fireHistory")],
    ["WFIGS current fire perimeters", "Planning-map incident context", "Current snapshot", "Available on Planning Map"],
    ["FEMA flood-hazard areas", "Regulatory and planning baseline", "Static planning geography", "Available on Planning Map"],
    ["FEMA NRI counties", "Composite risk, loss, vulnerability, resilience", "December 2025 baseline", "Connected"],
    ["FEMA NRI census tracts", "Detailed risk inspection", "December 2025 baseline", "Available on Planning Map"],
    ["USA Structures", "Detailed exposure context", "Publisher-managed snapshot", "Available on Planning Map"],
    ["NOAA coastal employment", "Coastal exposure context", "October 2023 analysis", "Available on Planning Map"],
    ["2020 Census population", "Demographic baseline", "2020 decennial census", "Available on Planning Map"],
    ["LA post-fire debris flow", "County-specific hazard context", "Publisher-managed", "Available for Los Angeles"]
  ];
  elements.sourceMatrix.replaceChildren();
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    row.forEach((value, index) => {
      const td = document.createElement("td");
      td.textContent = value;
      if (index === 3) td.className = value === "Connected" ? "value-fresh" : value.startsWith("Partial") || value === "Unavailable" ? "value-alert" : "";
      tr.append(td);
    });
    elements.sourceMatrix.append(tr);
  });
}

function highestRiskRating(ratings) {
  const order = ["Very Low", "Relatively Low", "Relatively Moderate", "Relatively High", "Very High"];
  return ratings.reduce((highest, rating) => order.indexOf(rating) > order.indexOf(highest) ? rating : highest, "Not available");
}

function statusClassLabel(value) {
  return ({ "5": "Major", "4": "Moderate", "3": "Minor", "2": "Action", "1": "No flooding", "0": "Low flow", "-1": "Unknown" })[String(value)] || "Unknown";
}

function createTable(headers, rows) {
  const table = document.createElement("table");
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  headers.forEach((header) => {
    const th = document.createElement("th");
    th.textContent = header;
    headRow.append(th);
  });
  head.append(headRow);
  const body = document.createElement("tbody");
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    row.forEach((value) => {
      const td = document.createElement("td");
      if (value && typeof value === "object" && "text" in value) {
        td.textContent = value.text;
        if (value.className) td.className = value.className;
      } else {
        td.textContent = value ?? "Not available";
      }
      tr.append(td);
    });
    body.append(tr);
  });
  table.append(head, body);
  return table;
}

function createEmpty(message) {
  const element = document.createElement("div");
  element.className = "analysis-empty";
  element.textContent = message;
  return element;
}

function createLoader() {
  const loader = document.createElement("calcite-loader");
  loader.label = "Loading regional analysis";
  return loader;
}

function svgNode(name, attributes = {}) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

function unique(values) {
  return [...new Set(values)];
}

function formatCount(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Number(value) || 0);
}

function formatCurrency(value) {
  if (!Number.isFinite(Number(value))) return "Not available";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(Number(value));
}

function formatMeasurement(value, unit) {
  if (!Number.isFinite(Number(value))) return "Not available";
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(Number(value))} ${unit}`;
}

function formatSqlTimestamp(value) {
  return value.toISOString().slice(0, 19).replace("T", " ");
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(value);
}

function formatTime(value) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(value);
}

function formatChartTime(value) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric" }).format(value);
}

function formatTimelineTime(value) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric" }).format(value);
}

function showFatalError(error) {
  console.error("Analysis initialization failed.", error);
  elements.loading.hidden = false;
  elements.loading.classList.add("error");
  elements.loading.replaceChildren(document.createTextNode("The analysis page could not initialize."));
  elements.status.textContent = "Analysis unavailable";
}
