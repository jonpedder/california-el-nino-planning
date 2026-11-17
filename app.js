import { APP_CONFIG as DEPLOYMENT_CONFIG } from "./config.js?v=settings1";
import { loadPreferences, runtimeConfig, applyPreferences } from "./preferences.js?v=settings1";

const APP_PREFERENCES = loadPreferences();
const APP_CONFIG = runtimeConfig(DEPLOYMENT_CONFIG, APP_PREFERENCES);
applyPreferences(APP_PREFERENCES);

const [OAuthInfo, esriId, Portal, esriConfig, esriRequest, FeatureLayer, GroupLayer, geometryEngine] = await $arcgis.import([
  "@arcgis/core/identity/OAuthInfo.js",
  "@arcgis/core/identity/IdentityManager.js",
  "@arcgis/core/portal/Portal.js",
  "@arcgis/core/config.js",
  "@arcgis/core/request.js",
  "@arcgis/core/layers/FeatureLayer.js",
  "@arcgis/core/layers/GroupLayer.js",
  "@arcgis/core/geometry/geometryEngine.js"
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
  readinessOutlook: document.querySelector("#readiness-outlook"),
  readinessAssessments: document.querySelector("#readiness-assessments"),
  readinessPolygons: document.querySelector("#readiness-polygons"),
  readinessIntersections: document.querySelector("#readiness-intersections"),
  readinessYear: document.querySelector("#readiness-year"),
  readinessSearch: document.querySelector("#readiness-search"),
  readinessFire: document.querySelector("#readiness-fire"),
  readinessStatus: document.querySelector("#readiness-status"),
  readinessList: document.querySelector("#readiness-list"),
  readinessIssued: document.querySelector("#readiness-issued"),
  readinessValid: document.querySelector("#readiness-valid"),
  readinessRetrieved: document.querySelector("#readiness-retrieved"),
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
  sceneOperationalLayers: new Map(),
  layerFailures: [],
  sceneLayerFailures: [],
  countyGeometryCache: new Map(),
  readinessRun: 0,
  readinessRecords: [],
  readinessIntersectingIds: [],
  readinessOutlookLayer: null,
  readinessHighlightLayer: null,
  readinessAllFiresLayer: null,
  readinessAllFiresSceneLayer: null,
  readinessOutlookSceneLayer: null,
  readinessHighlightSceneLayer: null,
  populationCache: new Map(),
  weatherImpactCache: new Map()
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
elements.readinessOutlook.addEventListener("change", () => refreshReadinessForSelectedCounty());
elements.readinessYear.addEventListener("change", renderReadinessFireOptions);
elements.readinessSearch.addEventListener("input", renderReadinessFireOptions);
elements.readinessFire.addEventListener("change", () => openReadinessFire(elements.readinessFire.value));

initialize().catch((error) => {
  console.error("Application initialization failed.", error);
  showCountyError("The planning configuration could not be initialized.");
  announce("Application initialization failed.");
});

async function initialize() {
  elements.readinessRetrieved.textContent = new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  await Promise.allSettled([initializeAuthentication(), initializeMap()]);
  await loadCountyData();
  if (APP_CONFIG.preferences?.initialView === "3d") await switchView("3d");
  if (APP_CONFIG.preferences?.openLegend) {
    const index = APP_CONFIG.preferences?.initialView === "3d" ? 1 : 0;
    if (elements.legendExpands[index]) elements.legendExpands[index].expanded = true;
  }
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
      const canonicalRedirect = new URL(APP_CONFIG.oauthRedirectUri);
      const current = new URL(window.location.href);
      if (current.origin !== canonicalRedirect.origin || current.pathname !== canonicalRedirect.pathname || current.search || current.hash) {
        window.history.replaceState({}, document.title, canonicalRedirect.href);
      }
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
    elements.map.itemId = APP_CONFIG.webMapId;
    elements.scene.itemId = APP_CONFIG.webSceneId;
    await elements.map.viewOnReady();
    state.mapReady = true;

    await elements.scene.viewOnReady();
    await elements.scene.view.when();
    elements.scene.view.map.ground = "world-elevation";
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

function normalizeLayerTitle(value) {
  return String(value || "").replace(/[–—]/g, "-").replace(/\s+/g, " ").trim().toLowerCase();
}

async function loadOperationalLayers() {
  elements.mapState.hidden = false;
  elements.mapState.textContent = "Loading verified 2D map and 3D scene layers…";
  setDataStatus("Connecting…", "loading");

  const [mapLayers, sceneLayers] = await Promise.all([
    loadLayerSet(elements.map.map, state.operationalLayers, state.layerFailures, "Web Map"),
    loadLayerSet(elements.scene.view.map, state.sceneOperationalLayers, state.sceneLayerFailures, "Web Scene")
  ]);

  await ensureDerivedReadinessLayers();
  window.__esriView = elements.map.view;
  window.__esriMap = elements.map.map;
  window.__esriLayers = Object.fromEntries(mapLayers.map((layer) => [layer.title, layer]));
  if (state.readinessAllFiresLayer) window.__esriLayers[state.readinessAllFiresLayer.title] = state.readinessAllFiresLayer;
  window.__esriSceneView = elements.scene.view;
  window.__esriScene = elements.scene.view.map;
  window.__esriSceneLayers = Object.fromEntries(sceneLayers.map((layer) => [layer.title, layer]));
  if (state.readinessAllFiresSceneLayer) window.__esriSceneLayers[state.readinessAllFiresSceneLayer.title] = state.readinessAllFiresSceneLayer;
  window.__app = { APP_CONFIG, state, elements };

  if (mapLayers.length === APP_CONFIG.operationalLayers.length && sceneLayers.length === APP_CONFIG.operationalLayers.length) {
    setDataStatus(`${mapLayers.length} layers • 2D/3D`, "connected");
  } else {
    updateSourceStatus(Math.min(mapLayers.length, sceneLayers.length), APP_CONFIG.operationalLayers.length);
  }
}

async function loadLayerSet(map, registry, failures, label) {
  await map.loadAll();
  const savedLayers = map.layers.toArray();
  registry.clear();
  failures.length = 0;
  const results = await Promise.allSettled(APP_CONFIG.operationalLayers.map(async (definition) => {
    const titleMatch = savedLayers.find((candidate) => normalizeLayerTitle(candidate.title) === normalizeLayerTitle(definition.title));
    const itemMatch = definition.matchTitleOnly ? null : savedLayers.find((candidate) => candidate.portalItem?.id === definition.itemId);
    let layer = titleMatch || itemMatch;
    if (!layer) {
      layer = createFallbackOperationalLayer(definition);
      map.add(layer);
    }
    layer.title = definition.title;
    if (typeof definition.opacity === "number") layer.opacity = definition.opacity;
    if (typeof definition.minScale === "number") layer.minScale = definition.minScale;
    if (typeof definition.maxScale === "number") layer.maxScale = definition.maxScale;
    if (definition.definitionExpression && layer.type === "feature") layer.definitionExpression = definition.definitionExpression;
    await layer.load();
    await configureOperationalLayer(layer, definition);
    registry.set(definition.key, layer);
    return layer;
  }));

  const loaded = [];
  results.forEach((result, index) => {
    const definition = APP_CONFIG.operationalLayers[index];
    if (result.status === "fulfilled") loaded.push(result.value);
    else {
      failures.push(definition.key);
      console.error(`${label} layer failed to load: ${definition.title}`, result.reason);
    }
  });
  return loaded;
}

function createFallbackOperationalLayer(definition) {
  if (definition.key === "usgsPostFire") {
    const sublayers = [
      [0, "Fire Locations"],
      [1, "Segment Likelihoods"],
      [2, "Basin Likelihoods"],
      [3, "Basin Outlets"],
      [4, "Basin Combined Hazards"],
      [5, "Segment Combined Hazards"],
      [6, "Basin Volumes"],
      [7, "Segment Volumes"],
      [9, "Fire Perimeters"]
    ].map(([id, title]) => new FeatureLayer({
      url: `${APP_CONFIG.postFireServiceUrl}/${id}`,
      title,
      outFields: ["*"],
      visible: id === APP_CONFIG.postFirePointLayerId || id === APP_CONFIG.postFirePerimeterLayerId
    }));
    return new GroupLayer({ title: definition.title, visible: false, visibilityMode: "independent", layers: sublayers.reverse() });
  }
  return new FeatureLayer({
    portalItem: { id: definition.itemId },
    layerId: definition.sublayerId,
    title: definition.title,
    outFields: ["*"],
    definitionExpression: definition.definitionExpression,
    visible: definition.defaultVisible === true
  });
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
    setDataStatus(`${loaded} operational layers`, "connected");
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
    const initialCounty = state.counties.find((county) => county.id === APP_CONFIG.preferences?.initialCounty) || state.counties[0];
    selectCounty(initialCounty.id, { moveFocus: false });
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
  refreshPlanningIndicators(county);
  refreshPostFireReadiness(county);
}

async function getCountyGeometry(county) {
  if (state.countyGeometryCache.has(county.id)) return state.countyGeometryCache.get(county.id);
  const layer = state.operationalLayers.get("femaRiskCounties");
  const fips = APP_CONFIG.countyFips[county.id];
  if (!layer || !fips) throw new Error("County analysis geometry is unavailable.");
  const result = await layer.queryFeatures({
    where: `STCOFIPS = '${fips}'`,
    outFields: ["STCOFIPS", "COUNTY"],
    returnGeometry: true
  });
  const geometry = result.features[0]?.geometry;
  if (!geometry) throw new Error(`No county geometry returned for ${county.name}.`);
  state.countyGeometryCache.set(county.id, geometry);
  return geometry;
}

function findPostFireLayer(layerId) {
  const root = state.operationalLayers.get("usgsPostFire");
  return root?.allLayers?.toArray?.().find((layer) => Number(layer.layerId) === Number(layerId)) || null;
}

async function refreshPlanningIndicators(county) {
  const selectedId = county.id;
  try {
    const geometry = await getCountyGeometry(county);
    const hospitals = state.operationalLayers.get("hospitals");
    const shelters = state.operationalLayers.get("shelterFacilities");
    const activeShelters = state.operationalLayers.get("activeShelters");
    const firePoints = findPostFireLayer(APP_CONFIG.postFirePointLayerId);
    const [hospitalCount, shelterResult, activeCount, assessmentCount] = await Promise.all([
      hospitals?.queryFeatureCount({ geometry, spatialRelationship: "intersects", where: "1=1" }) ?? 0,
      shelters?.queryFeatures({ geometry, spatialRelationship: "intersects", where: "1=1", outFields: ["EVAC_CAP", "POSTIM_CAP"], returnGeometry: false }) ?? { features: [] },
      activeShelters?.queryFeatureCount({ geometry, spatialRelationship: "intersects", where: "1=1" }) ?? 0,
      firePoints?.queryFeatureCount({ geometry, spatialRelationship: "intersects", where: "1=1" }) ?? 0
    ]);
    if (state.selectedCountyId !== selectedId) return;

    const shelterCapacity = shelterResult.features.reduce((sum, feature) => {
      const evac = Number(String(feature.attributes?.EVAC_CAP ?? "").replace(/[^0-9.-]/g, ""));
      const post = Number(String(feature.attributes?.POSTIM_CAP ?? "").replace(/[^0-9.-]/g, ""));
      return sum + Math.max(Number.isFinite(evac) ? evac : 0, Number.isFinite(post) ? post : 0);
    }, 0);
    const shelterCount = shelterResult.features.length;
    const supportKeys = ["usgsPostFire", "floodStageGauges", "stateBoundaries", "acsPopulationTracts", "caltransRoads", "hospitals", "shelterFacilities", "activeShelters", "alertCameras"];
    const connected = supportKeys.filter((key) => state.operationalLayers.has(key)).length;
    const enhanced = county.kpis.map((kpi) => {
      const label = kpi.label.toLowerCase();
      if (label.includes("shelter capacity")) return { ...kpi, value: shelterCapacity ? formatCount(shelterCapacity) : `${shelterCount} facilities`, note: `Planning inventory from ${shelterCount} FEMA shelter facilities; ${activeCount} currently mapped active. Verify capacity and status operationally.` };
      if (label.includes("critical facilities")) return { ...kpi, value: formatCount(hospitalCount), note: "Hospitals and medical centers intersecting the county boundary; verify operating status and dependencies." };
      if (label.includes("facilities in focus")) return { ...kpi, value: formatCount(hospitalCount + shelterCount), note: `${hospitalCount} medical facilities and ${shelterCount} planning shelters; active status requires verification.` };
      if (label.includes("debris-flow") || label.includes("slope hazard")) return { ...kpi, value: formatCount(assessmentCount), note: "USGS post-fire assessment locations in the county; use the readiness screen for current precipitation overlap." };
      if (label.includes("routes at risk") || label.includes("road segments") || label.includes("crossings")) return { ...kpi, value: "Network connected", note: "Caltrans statewide public-roads network is available for screening; this is not a live closure or damage count." };
      if (label.includes("coastal")) return { ...kpi, value: "Sources connected", note: "Flood-hazard, coastal-employment, structures, and transportation context are available; no impact count is asserted." };
      if (label.includes("population exposed")) return { ...kpi, value: "Analysis ready", note: "County demographics and weather/post-fire geometry are connected; exposure depends on the selected outlook polygon." };
      if (label.includes("planning confidence")) return { ...kpi, value: `${connected}/${supportKeys.length} support layers`, note: "Authoritative support layers loaded; derived screening results still require local operational validation." };
      return kpi;
    });
    renderKpis(enhanced);
  } catch (error) {
    console.warn("Planning indicator enrichment unavailable.", error);
  }
}

function forecastRenderer(type) {
  const fill = (color, outline) => ({ type: "simple-fill", color, outline: { color: outline, width: 2.2 } });
  if (type === "ero") return {
    type: "unique-value", field: "outlook", defaultSymbol: fill([255, 255, 255, 0.16], [255, 255, 255, 1]),
    uniqueValueInfos: [
      { value: "Marginal (At Least 5%)", label: "Marginal", symbol: fill([0, 255, 157, 0.3], [0, 255, 157, 1]) },
      { value: "Slight (At Least 15%)", label: "Slight", symbol: fill([255, 232, 0, 0.36], [255, 244, 92, 1]) },
      { value: "Moderate (At Least 40%)", label: "Moderate", symbol: fill([255, 126, 0, 0.4], [255, 166, 61, 1]) },
      { value: "High (At Least 70%)", label: "High", symbol: fill([255, 38, 38, 0.44], [255, 104, 104, 1]) }
    ]
  };
  return {
    type: "unique-value", field: "label", defaultSymbol: fill([255, 255, 255, 0.14], [255, 255, 255, 1]),
    uniqueValueInfos: [
      { value: "Heavy Rain", label: "Heavy Rain", symbol: fill([0, 229, 255, 0.32], [64, 239, 255, 1]) },
      { value: "Heavy Precipitation", label: "Heavy Precipitation", symbol: fill([255, 194, 0, 0.34], [255, 224, 94, 1]) }
    ]
  };
}

function flameRenderer(highlighted = false) {
  const svg = highlighted
    ? `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 80'><path d='M34 3c3 15-8 20-4 33 2-8 8-12 14-17 1 13 13 20 13 35 0 14-11 24-25 24S7 68 7 54c0-12 7-22 17-34 0 10 2 16 7 20-2-14 4-23 3-37z' fill='%23ef3b0a' stroke='%23ffffff' stroke-width='5'/><path d='M32 72c-8 0-14-6-14-14 0-7 5-12 10-18 0 8 3 11 6 14 0-7 3-11 7-15 1 8 6 12 6 19 0 8-7 14-15 14z' fill='%23ffd166'/></svg>`
    : `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 80'><path d='M34 3c3 15-8 20-4 33 2-8 8-12 14-17 1 13 13 20 13 35 0 14-11 24-25 24S7 68 7 54c0-12 7-22 17-34 0 10 2 16 7 20-2-14 4-23 3-37z' fill='%23f28c28' stroke='%235b2b12' stroke-width='4'/><path d='M32 72c-8 0-14-6-14-14 0-7 5-12 10-18 0 8 3 11 6 14 0-7 3-11 7-15 1 8 6 12 6 19 0 8-7 14-15 14z' fill='%23ffd166'/></svg>`;
  return {
    type: "simple",
    symbol: { type: "picture-marker", url: `data:image/svg+xml,${svg}`, width: highlighted ? 15 : 12, height: highlighted ? 19 : 15 },
    visualVariables: [{
      type: "size",
      valueExpression: "Max(0, Year(Now()) - Year($feature.start_date))",
      valueExpressionTitle: "Fire age in whole calendar years",
      stops: [
        { value: 0, size: highlighted ? 27 : 20, label: "Current year" },
        { value: 1, size: highlighted ? 22 : 16, label: "1 year old" },
        { value: 3, size: highlighted ? 18 : 13, label: "3 years old" },
        { value: 5, size: highlighted ? 15 : 11, label: "5 years old" },
        { value: 10, size: highlighted ? 13 : 9, label: "10+ years old" }
      ]
    }]
  };
}

async function ensureDerivedReadinessLayers() {
  const createAllFires = () => new FeatureLayer({
    url: `${APP_CONFIG.postFireServiceUrl}/${APP_CONFIG.postFirePointLayerId}`,
    title: "All fires",
    visible: false,
    opacity: 0.78,
    outFields: ["*"],
    renderer: flameRenderer(false),
    popupTemplate: createFirePopupTemplate()
  });

  let mapLayer = elements.map.map.layers.find((layer) => layer.title === "All fires");
  if (!mapLayer) {
    mapLayer = createAllFires();
    elements.map.map.add(mapLayer);
  }
  let sceneLayer = elements.scene.view.map.layers.find((layer) => layer.title === "All fires");
  if (!sceneLayer) {
    sceneLayer = createAllFires();
    elements.scene.view.map.add(sceneLayer);
  }
  await Promise.all([mapLayer.load(), sceneLayer.load()]);
  state.readinessAllFiresLayer = mapLayer;
  state.readinessAllFiresSceneLayer = sceneLayer;
}

function createFirePopupTemplate() {
  return {
    title: "{fire} — USGS post-fire assessment",
    content: [
      { type: "fields", fieldInfos: [
        { fieldName: "Fire_ID", label: "Fire ID" },
        { fieldName: "location", label: "Location" },
        { fieldName: "start_date", label: "Fire start date", format: { dateFormat: "long-month-day-year" } },
        { fieldName: "assessment_date", label: "Assessment date", format: { dateFormat: "long-month-day-year" } },
        { fieldName: "status", label: "Status" },
        { fieldName: "Rainfall", label: "Rainfall basis" }
      ] },
      { type: "custom", creator: createFirePopulationPopupContent }
    ]
  };
}

function popupAnalysisPanel(title, rows, note, caution) {
  const panel = document.createElement("section");
  panel.className = "popup-analysis-panel";
  const heading = document.createElement("strong");
  heading.textContent = title;
  const table = document.createElement("dl");
  for (const [label, value] of rows) {
    const term = document.createElement("dt");
    const detail = document.createElement("dd");
    term.textContent = label;
    detail.textContent = value;
    table.append(term, detail);
  }
  const method = document.createElement("small");
  method.textContent = note;
  const warning = document.createElement("small");
  warning.className = "popup-analysis-caution";
  warning.textContent = caution;
  panel.append(heading, table, method, warning);
  return panel;
}

async function estimatePopulationForGeometry(geometry) {
  const layer = state.operationalLayers.get("acsPopulationTracts");
  if (!layer || !geometry?.rings) throw new Error("ACS tract analysis is unavailable.");
  const populationField = "B01001_001E";
  const summary = await layer.queryFeatures({
    geometry,
    spatialRelationship: "intersects",
    where: `${populationField} >= 0`,
    outStatistics: [
      { onStatisticField: populationField, outStatisticFieldName: "population_sum", statisticType: "sum" },
      { onStatisticField: populationField, outStatisticFieldName: "tract_count", statisticType: "count" }
    ],
    returnGeometry: false
  });
  const attrs = summary.features[0]?.attributes || {};
  let weightedPopulation = Number(attrs.population_sum) || 0;
  const tractCount = Math.round(Number(attrs.tract_count) || 0);
  const boundary = { type: "polyline", paths: geometry.rings, spatialReference: geometry.spatialReference };
  const boundaryIds = await layer.queryObjectIds({ geometry: boundary, spatialRelationship: "intersects", where: `${populationField} >= 0` });
  for (let index = 0; index < (boundaryIds || []).length; index += 500) {
    const result = await layer.queryFeatures({ objectIds: boundaryIds.slice(index, index + 500), outFields: [populationField], returnGeometry: true });
    for (const tract of result.features) {
      const population = Number(tract.attributes?.[populationField]);
      if (!Number.isFinite(population) || population < 0 || !tract.geometry) continue;
      const overlap = geometryEngine.intersect(tract.geometry, geometry);
      if (!overlap) {
        weightedPopulation -= population;
        continue;
      }
      const tractArea = Math.abs(geometryEngine.geodesicArea(tract.geometry, "square-meters"));
      const overlapArea = Math.abs(geometryEngine.geodesicArea(overlap, "square-meters"));
      if (Number.isFinite(tractArea) && tractArea > 0 && Number.isFinite(overlapArea)) weightedPopulation -= population * (1 - Math.min(1, Math.max(0, overlapArea / tractArea)));
    }
  }
  return { population: Math.max(0, Math.round(weightedPopulation)), tractCount };
}

async function estimatePopulationForFire(fireId) {
  const key = String(fireId || "");
  if (state.populationCache.has(key)) return state.populationCache.get(key);
  const perimeterLayer = findPostFireLayer(APP_CONFIG.postFirePerimeterLayerId) || new FeatureLayer({ url: `${APP_CONFIG.postFireServiceUrl}/${APP_CONFIG.postFirePerimeterLayerId}` });
  await perimeterLayer.load();
  const result = await perimeterLayer.queryFeatures({ where: `Fire_ID = ${sqlString(key)}`, outFields: ["Fire_ID"], returnGeometry: true });
  const geometries = result.features.map((feature) => feature.geometry).filter(Boolean);
  if (!geometries.length) throw new Error("No matching USGS fire perimeter was returned.");
  const geometry = geometries.length === 1 ? geometries[0] : geometryEngine.union(geometries);
  const estimate = await estimatePopulationForGeometry(geometry);
  state.populationCache.set(key, estimate);
  return estimate;
}

async function countDistinctFiresForGeometry(geometry) {
  const perimeterLayer = findPostFireLayer(APP_CONFIG.postFirePerimeterLayerId) || new FeatureLayer({ url: `${APP_CONFIG.postFireServiceUrl}/${APP_CONFIG.postFirePerimeterLayerId}` });
  await perimeterLayer.load();
  const result = await perimeterLayer.queryFeatures({ geometry, spatialRelationship: "intersects", where: "1=1", outFields: ["Fire_ID"], returnGeometry: false });
  return new Set(result.features.map((feature) => feature.attributes?.Fire_ID).filter(Boolean).map(String)).size;
}

async function createFirePopulationPopupContent(event) {
  const fireId = event?.graphic?.attributes?.Fire_ID;
  try {
    const estimate = await estimatePopulationForFire(fireId);
    return popupAnalysisPanel(
      "Derived population context",
      [["Estimated residents", formatCount(estimate.population)], ["Intersecting tracts", formatCount(estimate.tractCount)]],
      "Area-weighted from 2020–2024 ACS 5-year tract estimates within the USGS fire perimeter.",
      "Assumes population is uniformly distributed within each tract. This is not an evacuation or current-occupancy count."
    );
  } catch (error) {
    return popupAnalysisPanel("Population context unavailable", [["Status", "Analysis could not complete"]], "The ACS, perimeter, or geometry service did not return a usable result.", "No population impact is asserted.");
  }
}

async function createWeatherImpactPopupContent(event) {
  const graphic = event?.graphic;
  const geometry = graphic?.geometry;
  if (!geometry) return popupAnalysisPanel("Weather impact context unavailable", [["Status", "No polygon geometry"]], "The weather feature did not return a polygon.", "No impact is asserted.");
  const oidField = graphic.layer?.objectIdField || graphic.sourceLayer?.objectIdField;
  const cacheKey = `${graphic.layer?.url || graphic.sourceLayer?.url || "weather"}|${graphic.attributes?.[oidField] || geometry.extent?.center?.x || "feature"}`;
  try {
    let impact = state.weatherImpactCache.get(cacheKey);
    if (!impact) {
      const [population, fireCount] = await Promise.all([estimatePopulationForGeometry(geometry), countDistinctFiresForGeometry(geometry)]);
      impact = { ...population, fireCount };
      state.weatherImpactCache.set(cacheKey, impact);
    }
    return popupAnalysisPanel(
      "Derived planning context",
      [["Estimated residents", formatCount(impact.population)], ["Previous USGS fire assessments", formatCount(impact.fireCount)]],
      `Area-weighted from 2020–2024 ACS 5-year estimates across ${formatCount(impact.tractCount)} intersecting tracts.`,
      "This is not current occupancy, an evacuation count, or a predicted debris-flow impact."
    );
  } catch (error) {
    return popupAnalysisPanel("Weather impact context unavailable", [["Status", "Analysis could not complete"]], "The ACS, fire, or geometry analysis did not return a usable result.", "No impact is asserted.");
  }
}

function clearReadinessRuntimeLayers() {
  const pairs = [
    ["readinessOutlookLayer", elements.map.map],
    ["readinessHighlightLayer", elements.map.map],
    ["readinessOutlookSceneLayer", elements.scene.view.map],
    ["readinessHighlightSceneLayer", elements.scene.view.map]
  ];
  for (const [key, map] of pairs) {
    const layer = state[key];
    if (layer && map.layers.includes(layer)) map.remove(layer);
    state[key] = null;
  }
}

function formatSourceDate(value) {
  if (value == null || value === "") return "Not provided";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? String(value) : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
}

async function refreshReadinessForSelectedCounty() {
  const county = state.counties.find((candidate) => candidate.id === state.selectedCountyId);
  if (county) await refreshPostFireReadiness(county);
}

async function refreshPostFireReadiness(county) {
  const run = ++state.readinessRun;
  const product = APP_CONFIG.forecastProducts[elements.readinessOutlook.value] || APP_CONFIG.forecastProducts.ero1;
  elements.readinessStatus.textContent = `Evaluating ${product.shortLabel} against USGS post-fire assessments…`;
  elements.readinessAssessments.textContent = "…";
  elements.readinessPolygons.textContent = "…";
  elements.readinessIntersections.textContent = "…";
  elements.readinessIssued.textContent = "Loading…";
  elements.readinessValid.textContent = "Loading…";
  elements.readinessYear.disabled = true;
  elements.readinessSearch.disabled = true;
  elements.readinessFire.disabled = true;
  elements.readinessList.replaceChildren();

  try {
    const geometry = await getCountyGeometry(county);
    const firePoints = findPostFireLayer(APP_CONFIG.postFirePointLayerId) || new FeatureLayer({ url: `${APP_CONFIG.postFireServiceUrl}/${APP_CONFIG.postFirePointLayerId}` });
    const firePerimeters = findPostFireLayer(APP_CONFIG.postFirePerimeterLayerId) || new FeatureLayer({ url: `${APP_CONFIG.postFireServiceUrl}/${APP_CONFIG.postFirePerimeterLayerId}` });
    await Promise.all([firePoints.load(), firePerimeters.load()]);
    const countyFires = await firePoints.queryFeatures({ geometry, spatialRelationship: "intersects", where: "1=1", outFields: ["fire", "Fire_ID", "start_date", "assessment_date", "location"], returnGeometry: true });
    if (run !== state.readinessRun) return;
    state.readinessRecords = countyFires.features.map((feature) => {
      feature.popupTemplate = createFirePopupTemplate();
      return {
        feature,
        id: String(feature.attributes?.Fire_ID || ""),
        name: String(feature.attributes?.fire || "Unnamed fire"),
        year: feature.attributes?.start_date ? String(new Date(feature.attributes.start_date).getUTCFullYear()) : ""
      };
    }).filter((record) => record.id);
    populateReadinessFilters();
    elements.readinessAssessments.textContent = formatCount(state.readinessRecords.length);

    clearReadinessRuntimeLayers();
    const outlookLayer = new FeatureLayer({
      url: product.url,
      title: product.title,
      definitionExpression: product.where,
      opacity: 1,
      renderer: forecastRenderer(product.type),
      popupTemplate: product.type === "ero" ? {
        title: "{product}: {outlook}",
        content: [
          { type: "fields", fieldInfos: [{ fieldName: "outlook", label: "Outlook category" }, { fieldName: "issue_time", label: "Issue time" }, { fieldName: "start_time", label: "Start time" }, { fieldName: "end_time", label: "End time" }] },
          { type: "custom", creator: createWeatherImpactPopupContent }
        ]
      } : {
        title: "{label}",
        content: [
          { type: "fields", fieldInfos: [{ fieldName: "label", label: "Hazard" }, { fieldName: "start_date", label: "Start date" }, { fieldName: "end_date", label: "End date" }] },
          { type: "custom", creator: createWeatherImpactPopupContent }
        ]
      }
    });
    const outlookSceneLayer = outlookLayer.clone();
    state.readinessOutlookLayer = outlookLayer;
    state.readinessOutlookSceneLayer = outlookSceneLayer;
    elements.map.map.add(outlookLayer);
    elements.scene.view.map.add(outlookSceneLayer);
    await Promise.all([outlookLayer.load(), outlookSceneLayer.load()]);
    const outlooks = await outlookLayer.queryFeatures({ geometry, spatialRelationship: "intersects", where: product.where, outFields: ["*"], returnGeometry: true });
    if (run !== state.readinessRun) return;
    elements.readinessPolygons.textContent = formatCount(outlooks.features.length);
    if (outlooks.features.length) {
      const meta = outlooks.features[0].attributes || {};
      const issued = product.type === "ero" ? meta.issue_time : (meta.issue_time_dt || meta.idp_filedate || meta.idp_ingestdate);
      const start = product.type === "ero" ? (meta.start_time || meta.valid_time) : meta.start_date;
      const end = product.type === "ero" ? (meta.end_time || meta.valid_time) : meta.end_date;
      elements.readinessIssued.textContent = formatSourceDate(issued);
      elements.readinessValid.textContent = start === end ? formatSourceDate(start) : `${formatSourceDate(start)} – ${formatSourceDate(end)}`;
    } else {
      elements.readinessIssued.textContent = "No current polygon returned";
      elements.readinessValid.textContent = "No current polygon returned";
    }

    const ids = new Set();
    for (const outlook of outlooks.features) {
      const result = await firePerimeters.queryFeatures({ geometry: outlook.geometry, spatialRelationship: "intersects", where: "1=1", outFields: ["Fire_ID"], returnGeometry: false });
      for (const feature of result.features) if (feature.attributes?.Fire_ID) ids.add(String(feature.attributes.Fire_ID));
    }
    if (run !== state.readinessRun) return;
    const countyIds = new Set(state.readinessRecords.map((record) => record.id));
    state.readinessIntersectingIds = [...ids].filter((id) => countyIds.has(id)).sort();
    elements.readinessIntersections.textContent = formatCount(state.readinessIntersectingIds.length);
    renderReadinessList();

    if (state.readinessIntersectingIds.length) {
      const highlight = new FeatureLayer({
        url: `${APP_CONFIG.postFireServiceUrl}/${APP_CONFIG.postFirePointLayerId}`,
        title: "Fires intersecting selected weather outlook",
        definitionExpression: `Fire_ID IN (${state.readinessIntersectingIds.map(sqlString).join(",")})`,
        outFields: ["*"],
        renderer: flameRenderer(true),
        popupTemplate: createFirePopupTemplate()
      });
      const highlightScene = highlight.clone();
      state.readinessHighlightLayer = highlight;
      state.readinessHighlightSceneLayer = highlightScene;
      elements.map.map.add(highlight);
      elements.scene.view.map.add(highlightScene);
      await Promise.all([highlight.load(), highlightScene.load()]);
    }
    elements.readinessStatus.textContent = state.readinessIntersectingIds.length
      ? `${state.readinessIntersectingIds.length} assessment${state.readinessIntersectingIds.length === 1 ? "" : "s"} intersect the ${product.shortLabel}. Review official warnings and local forecasts.`
      : outlooks.features.length ? `No county assessment perimeter intersects the ${product.shortLabel}.` : `No selected precipitation-hazard polygon is currently published over ${county.name} County.`;
  } catch (error) {
    if (run !== state.readinessRun) return;
    console.warn("Post-fire readiness analysis unavailable.", error);
    elements.readinessAssessments.textContent = "—";
    elements.readinessPolygons.textContent = "—";
    elements.readinessIntersections.textContent = "—";
    elements.readinessIssued.textContent = "Unavailable";
    elements.readinessValid.textContent = "Unavailable";
    elements.readinessStatus.textContent = "Readiness analysis is unavailable because a USGS, NOAA, or county geometry query failed.";
  }
}

function populateReadinessFilters() {
  const years = [...new Set(state.readinessRecords.map((record) => record.year).filter(Boolean))].sort((a, b) => b.localeCompare(a));
  elements.readinessYear.replaceChildren(new Option("All years", ""));
  for (const year of years) elements.readinessYear.add(new Option(year, year));
  elements.readinessYear.disabled = false;
  elements.readinessSearch.disabled = false;
  renderReadinessFireOptions();
}

function renderReadinessFireOptions() {
  const year = elements.readinessYear.value;
  const term = elements.readinessSearch.value.trim().toLowerCase();
  const matches = state.readinessRecords.filter((record) => (!year || record.year === year) && (!term || record.name.toLowerCase().includes(term) || record.id.toLowerCase().includes(term)));
  elements.readinessFire.replaceChildren(new Option(`View all matching assessments (${matches.length})`, ""));
  for (const record of matches.sort((a, b) => a.name.localeCompare(b.name))) elements.readinessFire.add(new Option(`${record.name}${record.year ? ` (${record.year})` : ""} — ${record.id}`, record.id));
  elements.readinessFire.disabled = false;
}

function renderReadinessList() {
  elements.readinessList.replaceChildren();
  const byId = new Map(state.readinessRecords.map((record) => [record.id, record]));
  for (const id of state.readinessIntersectingIds.slice(0, 30)) {
    const record = byId.get(id);
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = record ? `${record.name} — ${id}` : id;
    button.addEventListener("click", () => openReadinessFire(id));
    item.append(button);
    elements.readinessList.append(item);
  }
}

async function openReadinessFire(id) {
  if (!id) return;
  const record = state.readinessRecords.find((candidate) => candidate.id === id);
  if (!record?.feature?.geometry) return;
  const view = state.activeView === "3d" ? elements.scene.view : elements.map.view;
  await view.goTo({ target: record.feature.geometry, zoom: 12 }, { duration: 650 }).catch(() => {});
  view.openPopup({ features: [record.feature], location: record.feature.geometry });
}

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
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
  const keys = [...new Set([...visibleKeys, "floodStageGauges", "stateBoundaries", "acsPopulationTracts", "usgsPostFire", "alertCameras", "caltransRoads", "hospitals", "shelterFacilities", "censusDemographics"])];
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
  if (APP_CONFIG.preferences?.showActiveShelters === false) visibleKeys.delete("activeShelters");
  if (APP_CONFIG.preferences?.showFireHistory === false) visibleKeys.delete("fireHistory");
  if (APP_CONFIG.preferences?.showFloodStageGauges === true) visibleKeys.add("floodStageGauges");
  for (const registry of [state.operationalLayers, state.sceneOperationalLayers]) {
    for (const [key, layer] of registry) layer.visible = visibleKeys.has(key);
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