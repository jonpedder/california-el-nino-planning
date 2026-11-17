import { APP_CONFIG } from "./config.js?v=webmap2";

const [OAuthInfo, esriId, Portal, esriConfig, esriRequest] = await $arcgis.import([
  "@arcgis/core/identity/OAuthInfo.js",
  "@arcgis/core/identity/IdentityManager.js",
  "@arcgis/core/portal/Portal.js",
  "@arcgis/core/config.js",
  "@arcgis/core/request.js"
]);

const elements = {
  authButton: document.querySelector("#auth-button"),
  authStatus: document.querySelector("#auth-status"),
  dataStatus: document.querySelector("#data-status"),
  countyState: document.querySelector("#county-state"),
  countyList: document.querySelector("#county-list"),
  detailHeading: document.querySelector("#detail-heading"),
  detailState: document.querySelector("#detail-state"),
  detailContent: document.querySelector("#detail-content"),
  threatList: document.querySelector("#threat-list"),
  kpiGrid: document.querySelector("#kpi-grid"),
  demographicGrid: document.querySelector("#demographic-grid"),
  demographicVintage: document.querySelector("#demographic-vintage"),
  infographicLink: document.querySelector("#infographic-link"),
  capabilityList: document.querySelector("#capability-list"),
  layerList: document.querySelector("#layer-list"),
  disclaimer: document.querySelector("#county-disclaimer"),
  map: document.querySelector("#planning-map"),
  scene: document.querySelector("#planning-scene"),
  mapState: document.querySelector("#map-state"),
  mapSelection: document.querySelector("#map-selection"),
  layersExpands: [...document.querySelectorAll(".layers-expand")],
  legendExpands: [...document.querySelectorAll(".legend-expand")],
  mapPopups: [...document.querySelectorAll(".map-popup")],
  view2dButtons: [...document.querySelectorAll(".view-2d")],
  view3dButtons: [...document.querySelectorAll(".view-3d")],
  appAlert: document.querySelector("#app-alert")
};

const state = {
  counties: [],
  selectedCountyId: null,
  signedIn: false,
  mapReady: false,
  sceneReady: false,
  activeView: "2d",
  operationalLayers: new Map(),
  layerFailures: []
};

const enrichmentCache = new Map();

esriConfig.portalUrl = APP_CONFIG.portalUrl;
const oauthInfo = new OAuthInfo({
  appId: APP_CONFIG.oauthClientId,
  portalUrl: APP_CONFIG.portalUrl,
  popup: false
});
esriId.registerOAuthInfos([oauthInfo]);

elements.authButton.addEventListener("click", handleAuthentication);
elements.view2dButtons.forEach((button) => button.addEventListener("click", () => switchView("2d")));
elements.view3dButtons.forEach((button) => button.addEventListener("click", () => switchView("3d")));

initialize().catch((error) => {
  console.error("Application initialization failed.", error);
  showCountyError("The planning configuration could not be initialized.");
  announce("Application initialization failed.");
});

async function initialize() {
  await Promise.allSettled([initializeAuthentication(), initializeMap()]);
  await loadCountyData();
}

async function initializeAuthentication() {
  elements.authButton.disabled = true;
  try {
    await esriId.checkSignInStatus(`${APP_CONFIG.portalUrl}/sharing`);
    const portal = new Portal({ url: APP_CONFIG.portalUrl, authMode: "immediate" });
    await portal.load();
    state.signedIn = true;
    elements.authStatus.textContent = `Signed in as ${portal.user?.fullName || portal.user?.username || "portal user"}`;
    elements.authButton.textContent = "Sign out";
  } catch {
    state.signedIn = false;
    elements.authStatus.textContent = "Signed out — public planning layers available";
    elements.authButton.textContent = "Sign in";
  } finally {
    elements.authButton.disabled = false;
  }
}

async function handleAuthentication() {
  elements.authButton.loading = true;
  elements.authButton.disabled = true;
  try {
    if (state.signedIn) {
      esriId.destroyCredentials();
      state.signedIn = false;
      elements.authStatus.textContent = "Signed out — public planning layers available";
      elements.authButton.textContent = "Sign in";
      announce("Signed out.");
    } else {
      await esriId.getCredential(`${APP_CONFIG.portalUrl}/sharing`);
      window.location.reload();
    }
  } catch (error) {
    console.error("Authentication action failed.", error);
    elements.authStatus.textContent = "Authentication unavailable. Try again.";
    announce("Authentication failed.");
  } finally {
    elements.authButton.loading = false;
    elements.authButton.disabled = false;
  }
}

async function initializeMap() {
  try {
    await Promise.all([
      customElements.whenDefined("arcgis-map"),
      customElements.whenDefined("arcgis-scene")
    ]);
    await elements.map.viewOnReady();
    state.mapReady = true;

    elements.map.map.ground = "world-elevation";
    await elements.scene.viewOnReady();
    elements.scene.view.map = elements.map.map;
    await elements.scene.view.when();
    state.sceneReady = true;
    elements.scene.view.qualityProfile = "medium";
    elements.scene.view.environment = {
      lighting: { type: "virtual", directShadowsEnabled: true },
      atmosphereEnabled: true,
      starsEnabled: false
    };

    configureMapOverlays();
    await loadOperationalLayers();
    elements.mapState.hidden = true;
  } catch (error) {
    console.error("Map initialization failed.", error);
    elements.mapState.hidden = false;
    elements.mapState.textContent = "Map unavailable. County planning details remain accessible.";
    elements.mapState.classList.add("error");
    setDataStatus("Map unavailable", "error");
  }
}

function configureMapOverlays() {
  elements.layersExpands.forEach((layersExpand, index) => {
    const legendExpand = elements.legendExpands[index];
    layersExpand.addEventListener("arcgisPropertyChange", (event) => {
      if (event.detail?.name === "expanded" && layersExpand.expanded && legendExpand) {
        legendExpand.expanded = false;
      }
    });
    legendExpand?.addEventListener("arcgisPropertyChange", (event) => {
      if (event.detail?.name === "expanded" && legendExpand.expanded) {
        layersExpand.expanded = false;
      }
    });
  });

  elements.map.view.on("click", collapseMapOverlays);
  elements.scene.view.on("click", collapseMapOverlays);
}

async function switchView(mode) {
  if (mode === state.activeView) return;
  if (!state.mapReady || !state.sceneReady) {
    announce("The alternate view is still loading.");
    return;
  }

  const source = state.activeView === "2d" ? elements.map : elements.scene;
  const target = mode === "2d" ? elements.map : elements.scene;
  const sourceView = source.view;
  const targetView = target.view;

  collapseMapOverlays();
  elements.mapPopups.forEach((popup) => popup.close?.());
  target.classList.remove("inactive");
  target.setAttribute("aria-hidden", "false");
  source.classList.add("inactive");
  source.setAttribute("aria-hidden", "true");
  state.activeView = mode;
  updateViewToggleButtons();

  try {
    if (mode === "3d") {
      await targetView.goTo({
        center: sourceView.center,
        scale: sourceView.scale,
        heading: 0,
        tilt: 55
      }, { duration: 700, easing: "ease-in-out" });
    } else {
      await targetView.goTo({
        center: sourceView.center,
        scale: sourceView.scale
      }, { duration: 700, easing: "ease-in-out" });
    }
    announce(`${mode.toUpperCase()} view active.`);
  } catch (error) {
    console.error(`Could not switch to ${mode} view.`, error);
    announce(`Could not activate ${mode.toUpperCase()} view.`);
  }
}

function updateViewToggleButtons() {
  const is2d = state.activeView === "2d";
  elements.view2dButtons.forEach((button) => {
    button.classList.toggle("selected", is2d);
    button.setAttribute("aria-pressed", String(is2d));
  });
  elements.view3dButtons.forEach((button) => {
    button.classList.toggle("selected", !is2d);
    button.setAttribute("aria-pressed", String(!is2d));
  });
}

async function loadOperationalLayers() {
  elements.mapState.hidden = false;
  elements.mapState.textContent = "Loading verified public layers…";
  setDataStatus("Connecting…", "loading");

  await elements.map.map.loadAll();
  const savedLayers = elements.map.map.layers.toArray();
  const results = await Promise.allSettled(APP_CONFIG.operationalLayers.map(async (definition) => {
    const layer = savedLayers.find((candidate) =>
      candidate.portalItem?.id === definition.itemId || candidate.title === definition.title
    );
    if (!layer) throw new Error(`The saved Web Map does not contain ${definition.title}.`);
    layer.title = definition.title;
    if (typeof definition.opacity === "number") layer.opacity = definition.opacity;
    if (typeof definition.minScale === "number") layer.minScale = definition.minScale;
    if (typeof definition.maxScale === "number") layer.maxScale = definition.maxScale;
    await layer.load();
    await configureOperationalLayer(layer, definition);
    state.operationalLayers.set(definition.key, layer);
    return layer;
  }));

  const loadedLayers = [];
  state.layerFailures = [];
  results.forEach((result, index) => {
    const definition = APP_CONFIG.operationalLayers[index];
    if (result.status === "fulfilled") {
      loadedLayers.push(result.value);
    } else {
      state.layerFailures.push(definition.key);
      console.error(`Saved Web Map layer failed to load: ${definition.title}`, result.reason);
    }
  });

  window.__esriView = elements.map.view;
  window.__esriMap = elements.map.map;
  window.__esriLayers = Object.fromEntries(loadedLayers.map((layer) => [layer.title, layer]));
  window.__app = { APP_CONFIG, state, elements };
  updateSourceStatus(loadedLayers.length, APP_CONFIG.operationalLayers.length);
}

async function configureOperationalLayer(layer, definition) {
  const candidates = layer.type === "feature"
    ? [layer]
    : layer.allLayers?.toArray?.() || [];

  await Promise.allSettled(candidates.map(async (candidate) => {
    if (candidate.type !== "feature") return;
    await candidate.load();

    if (typeof definition.refreshInterval === "number") {
      candidate.refreshInterval = definition.refreshInterval;
    }

    if (candidate.geometryType === "polygon") {
      if (definition.includeAllPopupFields) installFemaRiskArcadePopup(candidate);
      installDynamicDemographicPopup(candidate, definition);
      if (definition.includeAllPopupFields) installAllFieldValuesPopup(candidate);
    }
  }));
}

function installFemaRiskArcadePopup(layer) {
  if (layer.__femaArcadePopupInstalled) return;

  const template = layer.popupTemplate?.clone?.() || layer.createPopupTemplate?.();
  if (!template) return;

  const isTract = layer.fields.some((field) => field.name === "TRACT");
  template.title = isTract
    ? "Census Tract {TRACT} — {COUNTY}, {STATEABBRV}"
    : "{COUNTY}, {STATEABBRV} — FEMA Risk Index";
  template.expressionInfos = [
    {
      name: "riskHeadline",
      title: "Overall risk",
      returnType: "string",
      expression: "var rating = DefaultValue($feature.RISK_RATNG, 'Not available'); var score = When(IsEmpty($feature.RISK_SCORE), 'No score', Text($feature.RISK_SCORE, '#,###.0')); return rating + ' — score ' + score;"
    },
    {
      name: "expectedAnnualLoss",
      title: "Expected annual loss",
      returnType: "string",
      expression: "return When(IsEmpty($feature.EAL_VALT), 'Not available', '$' + Text($feature.EAL_VALT, '#,###'));"
    },
    {
      name: "socialVulnerability",
      title: "Social vulnerability",
      returnType: "string",
      expression: "var rating = DefaultValue($feature.SOVI_RATNG, 'Not available'); var score = When(IsEmpty($feature.SOVI_SCORE), 'No score', Text($feature.SOVI_SCORE, '#,###.0')); return rating + ' — score ' + score;"
    },
    {
      name: "communityResilience",
      title: "Community resilience",
      returnType: "string",
      expression: "var rating = DefaultValue($feature.RESL_RATNG, 'Not available'); var score = When(IsEmpty($feature.RESL_SCORE), 'No score', Text($feature.RESL_SCORE, '#,###.0')); return rating + ' — score ' + score;"
    },
    ...[
      ["coastalFlooding", "CFLD_RISKR", "CFLD_RISKS"],
      ["inlandFlooding", "IFLD_RISKR", "IFLD_RISKS"],
      ["landslide", "LNDS_RISKR", "LNDS_RISKS"],
      ["strongWind", "SWND_RISKR", "SWND_RISKS"],
      ["wildfire", "WFIR_RISKR", "WFIR_RISKS"]
    ].map(([name, ratingField, scoreField]) => ({
      name,
      title: name,
      returnType: "string",
      expression: `var rating = DefaultValue($feature.${ratingField}, 'Not available'); var score = When(IsEmpty($feature.${scoreField}), 'No score', Text($feature.${scoreField}, '#,###.0')); return rating + ' — ' + score;`
    }))
  ];

  template.content = [{
    type: "text",
    text: `
      <div class="nri-arcade-summary">
        <h3>Risk snapshot</h3>
        <p><strong>Overall risk</strong><br>{expression/riskHeadline}</p>
        <p><strong>Expected annual loss</strong><br>{expression/expectedAnnualLoss}</p>
        <p><strong>Social vulnerability</strong><br>{expression/socialVulnerability}</p>
        <p><strong>Community resilience</strong><br>{expression/communityResilience}</p>
        <h4>El Niño-relevant hazard ratings</h4>
        <ul>
          <li><strong>Coastal flooding:</strong> {expression/coastalFlooding}</li>
          <li><strong>Inland flooding:</strong> {expression/inlandFlooding}</li>
          <li><strong>Landslide:</strong> {expression/landslide}</li>
          <li><strong>Strong wind:</strong> {expression/strongWind}</li>
          <li><strong>Wildfire:</strong> {expression/wildfire}</li>
        </ul>
      </div>`
  }];
  layer.popupTemplate = template;
  layer.__femaArcadePopupInstalled = true;
}

function installDynamicDemographicPopup(layer, definition) {
  if (layer.__dynamicDemographicsInstalled) return;

  const template = layer.popupTemplate?.clone?.() || layer.createPopupTemplate?.();
  if (!template) return;

  const existingContent = Array.isArray(template.content)
    ? [...template.content]
    : typeof template.content === "string"
      ? [{ type: "text", text: template.content }]
      : [];

  existingContent.push({
    type: "custom",
    outFields: ["*"],
    creator: (event) => createDynamicDemographicContent(event.graphic, definition)
  });

  template.content = existingContent;
  layer.popupTemplate = template;
  layer.__dynamicDemographicsInstalled = true;
}

function installAllFieldValuesPopup(layer) {
  if (layer.__allFieldValuesInstalled) return;

  const template = layer.popupTemplate?.clone?.() || layer.createPopupTemplate?.();
  if (!template) return;

  const existingContent = Array.isArray(template.content)
    ? [...template.content]
    : typeof template.content === "string"
      ? [{ type: "text", text: template.content }]
      : [];
  const fields = [...layer.fields];

  existingContent.push({
    type: "custom",
    outFields: ["*"],
    creator: (event) => createAllFieldValuesContent(event.graphic, fields)
  });

  template.content = existingContent;
  layer.popupTemplate = template;
  layer.__allFieldValuesInstalled = true;
}

function createAllFieldValuesContent(graphic, fields) {
  const section = document.createElement("section");
  section.className = "popup-risk-values";

  const master = document.createElement("details");
  master.className = "popup-risk-values-master";
  const masterSummary = document.createElement("summary");
  masterSummary.textContent = `Explore all FEMA values (${fields.length})`;
  master.append(masterSummary);

  const intro = document.createElement("p");
  intro.textContent = "Expand a category to inspect every source attribute supplied for this FEMA polygon.";
  master.append(intro);

  const groups = new Map();
  fields.forEach((field) => {
    const alias = field.alias || field.name;
    const groupName = alias.includes(" - ")
      ? alias.split(" - ")[0]
      : "Identification and exposure";
    if (!groups.has(groupName)) groups.set(groupName, []);
    groups.get(groupName).push(field);
  });

  groups.forEach((groupFields, groupName) => {
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = `${groupName} (${groupFields.length})`;
    details.append(summary);

    const values = document.createElement("dl");
    values.className = "popup-risk-values-grid";
    groupFields.forEach((field) => {
      const row = document.createElement("div");
      const term = document.createElement("dt");
      const description = document.createElement("dd");
      term.textContent = field.alias || field.name;
      description.textContent = formatRiskFieldValue(graphic.attributes?.[field.name], field);
      row.append(term, description);
      values.append(row);
    });
    details.append(values);
    master.append(details);
  });

  const citation = document.createElement("p");
  citation.className = "popup-risk-values-note";
  citation.textContent = "FEMA National Risk Index v1.20 (December 2025). Planning comparison only; this application is not endorsed by FEMA.";
  master.append(citation);
  section.append(master);
  return section;
}

function formatRiskFieldValue(value, field) {
  if (value === null || value === undefined || value === "") return "Not available";
  if (field.type === "esriFieldTypeDate") return new Date(value).toLocaleString();
  if (typeof value !== "number") return String(value);

  const currencyField = field.name === "BUILDVALUE"
    || field.name === "AGRIVALUE"
    || /^(EAL_VAL|EAL_EXPB|EAL_EXPA)/.test(field.name)
    || /\(\$\)/.test(field.alias || "");
  if (currencyField) return formatCurrency(value);
  if (field.type === "esriFieldTypeInteger" || field.type === "esriFieldTypeSmallInteger") return formatCount(value);
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(value);
}

function createDynamicDemographicContent(graphic, definition) {
  const section = document.createElement("section");
  section.className = "popup-demographics";

  const details = document.createElement("details");
  const summary = document.createElement("summary");
  summary.textContent = "Live demographic context";
  const panel = document.createElement("div");
  panel.className = "popup-demographics-panel";
  details.append(summary, panel);
  section.append(details);

  const source = document.createElement("p");
  source.className = "popup-demographics-source";
  source.textContent = definition.refreshInterval
    ? `${definition.source} layer refreshes every ${definition.refreshInterval} minutes; demographics are calculated for this polygon on demand.`
    : `${definition.source}; demographics are calculated for this polygon on demand.`;
  panel.append(source);

  const status = document.createElement("p");
  status.className = "popup-demographics-status";
  panel.append(status);

  if (!state.signedIn) {
    status.textContent = "Sign in to load current Business Analyst demographics for this polygon.";
    return section;
  }

  status.textContent = "Expand this section to calculate current demographics.";
  let requested = false;
  details.addEventListener("toggle", () => {
    if (!details.open || requested) return;
    requested = true;
    status.textContent = "Calculating current demographics…";
    void hydrateDynamicDemographics(panel, status, graphic);
  });
  return section;
}

async function hydrateDynamicDemographics(section, status, graphic) {
  try {
    const attributes = await enrichPolygon(graphic);
    status.remove();

    const metrics = [
      ["Population", formatCount(attributes.TOTPOP_CY)],
      ["Households", formatCount(attributes.TOTHH_CY)],
      ["Median household income", formatCurrency(attributes.MEDHINC_CY)],
      ["Median age", Number(attributes.MEDAGE_CY).toFixed(1)],
      ["Population growth", formatPercent(attributes.POPGRWCYFY)]
    ];

    const grid = document.createElement("dl");
    grid.className = "popup-demographics-grid";
    metrics.forEach(([label, value]) => {
      const item = document.createElement("div");
      const term = document.createElement("dt");
      const description = document.createElement("dd");
      term.textContent = label;
      description.textContent = value;
      item.append(description, term);
      grid.append(item);
    });

    const note = document.createElement("p");
    note.className = "popup-demographics-note";
    note.textContent = `Business Analyst result generated ${new Date().toLocaleString()}. Cached for this browser session to avoid repeat credit use.`;
    section.append(grid, note);
  } catch (error) {
    console.error("Dynamic polygon enrichment failed.", error);
    status.textContent = "Current demographics could not be calculated. Confirm your account has GeoEnrichment privileges and credits.";
    status.classList.add("error");
  }
}

async function enrichPolygon(graphic) {
  const layer = graphic.layer;
  const objectIdField = layer?.objectIdField;
  const objectId = objectIdField ? graphic.attributes?.[objectIdField] : null;
  const extent = graphic.geometry?.extent;
  const cacheKey = `${layer?.url || layer?.id || "polygon"}:${objectId ?? `${extent?.xmin}:${extent?.ymin}:${extent?.xmax}:${extent?.ymax}`}`;

  if (!enrichmentCache.has(cacheKey)) {
    const request = esriRequest(APP_CONFIG.geoenrichmentUrl, {
      method: "post",
      authMode: "immediate",
      responseType: "json",
      query: {
        f: "json",
        studyAreas: JSON.stringify([{ geometry: graphic.geometry.toJSON() }]),
        analysisVariables: APP_CONFIG.geoenrichmentVariables,
        useData: JSON.stringify({
          sourceCountry: "US",
          hierarchy: APP_CONFIG.geoenrichmentHierarchy
        }),
        returnGeometry: false,
        forStorage: false
      }
    }).then((response) => {
      const attributes = response.data?.results?.[0]?.value?.FeatureSet?.[0]?.features?.[0]?.attributes;
      if (!attributes) throw new Error("GeoEnrichment returned no demographic attributes.");
      return attributes;
    }).catch((error) => {
      enrichmentCache.delete(cacheKey);
      throw error;
    });
    enrichmentCache.set(cacheKey, request);
  }

  return enrichmentCache.get(cacheKey);
}

function updateSourceStatus(loaded, total) {
  if (loaded === total) {
    setDataStatus(`${loaded} public sources`, "connected");
    return;
  }
  if (loaded > 0) {
    setDataStatus(`${loaded} of ${total} sources`, "partial");
    return;
  }
  setDataStatus("Sources unavailable", "error");
}

function setDataStatus(text, status) {
  elements.dataStatus.textContent = text;
  elements.dataStatus.className = `status-${status}`;
}

async function loadCountyData() {
  elements.countyState.hidden = false;
  elements.countyList.hidden = true;

  try {
    const response = await fetch(APP_CONFIG.countyDataUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`County configuration request returned ${response.status}.`);
    const payload = await response.json();
    if (!Array.isArray(payload.counties)) throw new Error("County configuration has no counties array.");

    state.counties = payload.counties;
    if (state.counties.length === 0) {
      elements.countyState.textContent = "No counties are configured.";
      elements.detailState.textContent = "No capability profiles are available.";
      return;
    }

    renderCountyQueue();
    elements.countyState.hidden = true;
    elements.countyList.hidden = false;
    selectCounty(state.counties[0].id, { moveFocus: false });
  } catch (error) {
    console.error("County data load failed.", error);
    showCountyError("County configuration is unavailable. Check the JSON file and hosting path.");
    announce("County configuration failed to load.");
  }
}

function renderCountyQueue() {
  elements.countyList.replaceChildren();
  for (const county of state.counties) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "county-card";
    button.dataset.countyId = county.id;
    button.setAttribute("role", "listitem");
    button.setAttribute("aria-pressed", "false");

    const name = document.createElement("span");
    name.className = "county-name";
    name.textContent = `${county.name} County`;

    const focus = document.createElement("span");
    focus.className = "county-focus";
    focus.textContent = county.planningFocus;

    const threat = document.createElement("span");
    threat.className = `severity severity-${county.threats[0]?.severity || "medium"}`;
    threat.textContent = `${county.threats.length} priority threats`;

    button.append(name, focus, threat);
    button.addEventListener("click", () => selectCounty(county.id, { moveFocus: false }));
    elements.countyList.append(button);
  }
}

function selectCounty(countyId, { moveFocus = false } = {}) {
  const county = state.counties.find((candidate) => candidate.id === countyId);
  if (!county) {
    elements.detailContent.hidden = true;
    elements.detailState.hidden = false;
    elements.detailState.textContent = "The selected county profile is unavailable.";
    announce("County profile unavailable.");
    return;
  }

  state.selectedCountyId = county.id;
  for (const button of elements.countyList.querySelectorAll(".county-card")) {
    const selected = button.dataset.countyId === county.id;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
    if (selected && moveFocus) button.focus();
  }

  renderCountyDetail(county);
  updateMap(county);
}

function renderCountyDetail(county) {
  elements.detailHeading.textContent = `${county.name} County`;
  elements.detailState.hidden = true;
  elements.detailContent.hidden = false;
  elements.mapSelection.textContent = `${county.name} County`;

  renderThreats(county.threats);
  renderKpis(county.kpis);
  renderDemographics(county.demographics);
  renderCapabilities(county.enabledCapabilities);
  renderSourceLayers(county.id);
  elements.disclaimer.textContent = county.disclaimer;
}

function renderThreats(threats = []) {
  elements.threatList.replaceChildren();
  if (!threats.length) return appendEmpty(elements.threatList, "No threats configured.");
  for (const threat of threats) {
    const item = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = threat.label;
    const severity = document.createElement("span");
    severity.className = `severity severity-${threat.severity}`;
    severity.textContent = threat.severity;
    item.append(label, severity);
    elements.threatList.append(item);
  }
}

function renderKpis(kpis = []) {
  elements.kpiGrid.replaceChildren();
  if (!kpis.length) return appendEmpty(elements.kpiGrid, "No indicators configured.");
  for (const kpi of kpis) {
    const card = document.createElement("div");
    card.className = "kpi";
    const value = document.createElement("strong");
    value.textContent = kpi.value;
    const label = document.createElement("span");
    label.textContent = kpi.label;
    const note = document.createElement("small");
    note.textContent = kpi.note;
    card.append(value, label, note);
    elements.kpiGrid.append(card);
  }
}

function renderDemographics(demographics) {
  elements.demographicGrid.replaceChildren();
  if (!demographics) {
    appendEmpty(elements.demographicGrid, "Demographic context is unavailable.");
    elements.demographicVintage.textContent = "";
    elements.infographicLink.hidden = true;
    return;
  }

  const metrics = [
    ["Population", formatCount(demographics.population)],
    ["Households", formatCount(demographics.households)],
    ["Median household income", formatCurrency(demographics.medianHouseholdIncome)],
    ["Median age", Number(demographics.medianAge).toFixed(1)],
    ["2026–2031 population growth", formatPercent(demographics.populationGrowthRate)]
  ];

  for (const [labelText, valueText] of metrics) {
    const card = document.createElement("div");
    card.className = "demographic-stat";
    const value = document.createElement("strong");
    value.textContent = valueText;
    const label = document.createElement("span");
    label.textContent = labelText;
    card.append(value, label);
    elements.demographicGrid.append(card);
  }

  elements.demographicVintage.textContent = `${demographics.vintage}. County standard geography; estimates are context, not hazard exposure counts.`;
  elements.infographicLink.href = demographics.infographicUrl;
  elements.infographicLink.hidden = !demographics.infographicUrl;
}

function formatCount(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

function formatPercent(value) {
  return `${Number(value).toFixed(2)}%`;
}

function renderCapabilities(capabilities = []) {
  elements.capabilityList.replaceChildren();
  if (!capabilities.length) return appendEmpty(elements.capabilityList, "No capabilities enabled.");
  for (const capability of capabilities) {
    const item = document.createElement("li");
    const title = document.createElement("strong");
    title.textContent = capability.name;
    const description = document.createElement("span");
    description.textContent = capability.description;
    item.append(title, description);
    elements.capabilityList.append(item);
  }
}

function renderSourceLayers(countyId) {
  elements.layerList.replaceChildren();
  const visibleKeys = new Set(APP_CONFIG.countyLayerVisibility[countyId] || []);
  const keys = [...visibleKeys, "censusDemographics"];
  const definitions = keys
    .map((key) => APP_CONFIG.operationalLayers.find((layer) => layer.key === key))
    .filter(Boolean);

  if (!definitions.length) return appendEmpty(elements.layerList, "No public context layers assigned.");

  for (const definition of definitions) {
    const item = document.createElement("li");
    const title = document.createElement("strong");
    title.textContent = definition.title;
    const detail = document.createElement("small");
    const availability = state.operationalLayers.has(definition.key) ? "Loaded" : "Unavailable";
    const visibility = visibleKeys.has(definition.key) ? "Visible by default" : "Available in Map Layers";
    detail.textContent = `${definition.category} • ${definition.source} • ${availability} • ${visibility}`;
    item.append(title, detail);
    elements.layerList.append(item);
  }
}

function updateMap(county) {
  collapseMapOverlays();
  elements.mapPopups.forEach((popup) => popup.close?.());
  applyCountyLayerVisibility(county.id);
  if (!state.mapReady) return;

  const navigation = [elements.map.view.goTo({
    center: county.mapViewpoint.center,
    zoom: county.mapViewpoint.zoom
  }, { duration: 500 })];

  if (state.sceneReady) {
    navigation.push(elements.scene.view.goTo({
      center: county.mapViewpoint.center,
      zoom: county.mapViewpoint.zoom,
      heading: 0,
      tilt: 55
    }, { duration: 700, easing: "ease-in-out" }));
  }

  Promise.allSettled(navigation).then((results) => {
    if (results.some((result) => result.status === "rejected")) {
      console.error("One or more map views could not navigate.", results);
      elements.mapState.hidden = false;
      elements.mapState.textContent = "A map view could not navigate to the selected county.";
      elements.mapState.classList.add("error");
    }
  });
}

function collapseMapOverlays() {
  elements.layersExpands.forEach((expand) => { expand.expanded = false; });
  elements.legendExpands.forEach((expand) => { expand.expanded = false; });
}

function applyCountyLayerVisibility(countyId) {
  const visibleKeys = new Set(APP_CONFIG.countyLayerVisibility[countyId] || []);
  for (const [key, layer] of state.operationalLayers) {
    layer.visible = visibleKeys.has(key);
  }
}

function appendEmpty(container, message) {
  const item = document.createElement("p");
  item.className = "empty-message";
  item.textContent = message;
  container.append(item);
}

function showCountyError(message) {
  elements.countyState.hidden = false;
  elements.countyState.classList.add("error");
  elements.countyState.textContent = message;
  elements.countyList.hidden = true;
  elements.detailContent.hidden = true;
  elements.detailState.hidden = false;
  elements.detailState.classList.add("error");
  elements.detailState.textContent = "Capability detail cannot be displayed until configuration loads.";
}

function announce(message) {
  elements.appAlert.textContent = "";
  requestAnimationFrame(() => { elements.appAlert.textContent = message; });
}