import { APP_CONFIG } from "./config.js";

const [OAuthInfo, esriId, Portal, esriConfig, Layer] = await $arcgis.import([
  "@arcgis/core/identity/OAuthInfo.js",
  "@arcgis/core/identity/IdentityManager.js",
  "@arcgis/core/portal/Portal.js",
  "@arcgis/core/config.js",
  "@arcgis/core/layers/Layer.js"
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
  capabilityList: document.querySelector("#capability-list"),
  layerList: document.querySelector("#layer-list"),
  disclaimer: document.querySelector("#county-disclaimer"),
  map: document.querySelector("#planning-map"),
  mapState: document.querySelector("#map-state"),
  mapSelection: document.querySelector("#map-selection"),
  appAlert: document.querySelector("#app-alert")
};

const state = {
  counties: [],
  selectedCountyId: null,
  signedIn: false,
  mapReady: false,
  operationalLayers: new Map(),
  layerFailures: []
};

esriConfig.portalUrl = APP_CONFIG.portalUrl;
const oauthInfo = new OAuthInfo({
  appId: APP_CONFIG.oauthClientId,
  portalUrl: APP_CONFIG.portalUrl,
  popup: false
});
esriId.registerOAuthInfos([oauthInfo]);

elements.authButton.addEventListener("click", handleAuthentication);

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
    await customElements.whenDefined("arcgis-map");
    await elements.map.viewOnReady();
    state.mapReady = true;
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

async function loadOperationalLayers() {
  elements.mapState.hidden = false;
  elements.mapState.textContent = "Loading verified public layers…";
  setDataStatus("Connecting…", "loading");

  const results = await Promise.allSettled(APP_CONFIG.operationalLayers.map(async (definition) => {
    const layer = await Layer.fromPortalItem({ portalItem: { id: definition.itemId } });
    layer.title = definition.title;
    layer.visible = false;
    if (typeof definition.opacity === "number") layer.opacity = definition.opacity;
    if (typeof definition.minScale === "number") layer.minScale = definition.minScale;
    await layer.load();
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
      console.error(`Layer failed to load: ${definition.title}`, result.reason);
    }
  });

  if (loadedLayers.length) elements.map.map.addMany(loadedLayers);
  updateSourceStatus(loadedLayers.length, APP_CONFIG.operationalLayers.length);
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
  const keys = APP_CONFIG.countyLayerVisibility[countyId] || [];
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
    detail.textContent = `${definition.category} • ${definition.source} • ${availability}`;
    item.append(title, detail);
    elements.layerList.append(item);
  }
}

function updateMap(county) {
  applyCountyLayerVisibility(county.id);
  if (!state.mapReady) return;
  elements.map.view.goTo({
    center: county.mapViewpoint.center,
    zoom: county.mapViewpoint.zoom
  }, { duration: 500 }).catch((error) => {
    console.error("Map navigation failed.", error);
    elements.mapState.hidden = false;
    elements.mapState.textContent = "Map could not navigate to the selected county.";
    elements.mapState.classList.add("error");
  });
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