import { APP_CONFIG } from "./config.js?v=settings1";
import { DEFAULT_PREFERENCES, loadPreferences, savePreferences, clearPreferences, applyPreferences } from "./preferences.js?v=startup-extent1";

const $ = (id) => document.getElementById(id);
const preferences = loadPreferences();
let uploadedLogoData = preferences.branding.logoData || "";

function logoSource() {
  return uploadedLogoData || $("logoUrl")?.value.trim() || "";
}

function updateLogoPreview() {
  const preview = $("logoPreview");
  if (!preview) return;
  preview.replaceChildren();
  const source = logoSource();
  if (!source) {
    preview.textContent = "CA";
    preview.classList.remove("has-image");
    return;
  }
  const image = document.createElement("img");
  image.src = source;
  image.alt = "Custom logo preview";
  image.referrerPolicy = "no-referrer";
  image.addEventListener("error", () => {
    preview.textContent = "Logo unavailable";
    preview.classList.remove("has-image");
  }, { once: true });
  preview.append(image);
  preview.classList.add("has-image");
}

function toast(message, kind = "success") {
  const node = document.createElement("div");
  node.className = `toast ${kind}`;
  node.textContent = message;
  $("toastRegion").append(node);
  setTimeout(() => node.remove(), 4500);
}

function setTab(name, focus = false) {
  for (const key of ["preferences", "configuration", "help"]) {
    const active = key === name;
    const tab = $(`${key}Tab`);
    $(`${key}Panel`).hidden = !active;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
    if (active && focus) tab.focus();
  }
  const help = name === "help";
  $("save").hidden = help;
  $("reset").hidden = help;
}

function populate() {
  applyPreferences(preferences);
  $("appTitle").value = preferences.branding.title;
  $("appSubtitle").value = preferences.branding.subtitle;
  $("logoUrl").value = preferences.branding.logoUrl || "";
  uploadedLogoData = preferences.branding.logoData || "";
  updateLogoPreview();
  for (const [id, key] of [
    ["navy", "navy"], ["background", "background"], ["panel", "panel"], ["panelAlt", "panelAlt"],
    ["accent", "accent"], ["textColor", "text"], ["muted", "muted"], ["border", "border"]
  ]) $(id).value = preferences.theme[key];
  $("initialView").value = preferences.operation.initialView;
  $("showActiveShelters").checked = preferences.operation.showActiveShelters;
  $("showFireHistory").checked = preferences.operation.showFireHistory;
  $("showFloodStageGauges").checked = preferences.operation.showFloodStageGauges;
  $("openLegend").checked = preferences.operation.openLegend;

  const connection = preferences.connection || {};
  $("portalUrl").value = connection.portalUrl || APP_CONFIG.portalUrl;
  $("oauthClientId").value = connection.oauthClientId || APP_CONFIG.oauthClientId;
  $("oauthRedirectUri").value = connection.oauthRedirectUri || APP_CONFIG.oauthRedirectUri;
  $("webMapId").value = connection.webMapId || APP_CONFIG.webMapId;
  $("webSceneId").value = connection.webSceneId || APP_CONFIG.webSceneId;
  renderDiagnostics();
}

function values() {
  return {
    branding: {
      title: $("appTitle").value.trim() || DEFAULT_PREFERENCES.branding.title,
      subtitle: $("appSubtitle").value.trim() || DEFAULT_PREFERENCES.branding.subtitle,
      logoUrl: $("logoUrl").value.trim(),
      logoData: uploadedLogoData
    },
    theme: {
      navy: $("navy").value,
      background: $("background").value,
      panel: $("panel").value,
      panelAlt: $("panelAlt").value,
      accent: $("accent").value,
      text: $("textColor").value,
      muted: $("muted").value,
      border: $("border").value
    },
    operation: {
      initialView: $("initialView").value,
      showActiveShelters: $("showActiveShelters").checked,
      showFireHistory: $("showFireHistory").checked,
      showFloodStageGauges: $("showFloodStageGauges").checked,
      openLegend: $("openLegend").checked
    },
    connection: {
      portalUrl: $("portalUrl").value.trim().replace(/\/+$/, ""),
      oauthClientId: $("oauthClientId").value.trim(),
      oauthRedirectUri: $("oauthRedirectUri").value.trim(),
      webMapId: $("webMapId").value.trim(),
      webSceneId: $("webSceneId").value.trim()
    }
  };
}

function validate(value) {
  if (value.branding.logoUrl && !/^https:\/\//i.test(value.branding.logoUrl)) throw new Error("Custom logo URL must use HTTPS.");
  if (value.branding.logoData && !/^data:image\//i.test(value.branding.logoData)) throw new Error("Uploaded logo data is not a supported image.");
  for (const [label, url] of [["Portal URL", value.connection.portalUrl], ["OAuth redirect URI", value.connection.oauthRedirectUri]]) {
    if (!/^https:\/\//i.test(url)) throw new Error(`${label} must use HTTPS.`);
  }
  if (!value.connection.oauthClientId) throw new Error("OAuth client ID is required.");
  for (const [label, id] of [["Web Map", value.connection.webMapId], ["Web Scene", value.connection.webSceneId]]) {
    if (!/^[a-f0-9]{32}$/i.test(id)) throw new Error(`${label} item ID must contain 32 hexadecimal characters.`);
  }
}

function renderDiagnostics() {
  const rows = [
    ["Portal", $("portalUrl").value],
    ["OAuth client", $("oauthClientId").value],
    ["Registered callback required", $("oauthRedirectUri").value],
    ["2D Web Map", $("webMapId").value],
    ["3D Web Scene", $("webSceneId").value],
    ["Operational definitions", `${APP_CONFIG.operationalLayers.length} layers`],
    ["County profiles", Object.keys(APP_CONFIG.countyLayerVisibility).join(", ")],
    ["Storage scope", "This browser only"],
    ["Secrets stored", "None"]
  ];
  const list = $("configList");
  list.replaceChildren();
  for (const [label, value] of rows) {
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = label;
    dd.textContent = value || "Not configured";
    list.append(dt, dd);
  }
}

for (const key of ["preferences", "configuration", "help"]) {
  $(`${key}Tab`).addEventListener("click", () => setTab(key));
}

$("settings-main").addEventListener("keydown", (event) => {
  if (!event.target.matches(".settings-tab") || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const keys = ["preferences", "configuration", "help"];
  const current = keys.findIndex((key) => $(`${key}Tab`) === event.target);
  const next = event.key === "Home" ? 0 : event.key === "End" ? keys.length - 1 : (current + (event.key === "ArrowRight" ? 1 : -1) + keys.length) % keys.length;
  setTab(keys[next], true);
});

document.querySelectorAll(".help-index a").forEach((link) => link.addEventListener("click", () => {
  const card = document.querySelector(link.getAttribute("href"));
  if (card?.tagName === "DETAILS") card.open = true;
}));

for (const id of ["appTitle", "appSubtitle", "navy", "background", "panel", "panelAlt", "accent", "textColor", "muted", "border"]) {
  $(id).addEventListener("input", () => applyPreferences(values()));
}
$("logoUrl").addEventListener("input", () => {
  updateLogoPreview();
  applyPreferences(values());
});
$("logoUpload").addEventListener("change", () => {
  const file = $("logoUpload").files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    toast("Choose a PNG, JPEG, WebP, or SVG image.", "error");
    $("logoUpload").value = "";
    return;
  }
  if (file.size > 750000) {
    toast("Logo upload must be 750 KB or smaller for browser-local storage.", "error");
    $("logoUpload").value = "";
    return;
  }
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    uploadedLogoData = String(reader.result || "");
    updateLogoPreview();
    applyPreferences(values());
    toast("Logo loaded. Choose Save & reload to keep it.");
  });
  reader.addEventListener("error", () => toast("The logo file could not be read.", "error"));
  reader.readAsDataURL(file);
});
$("removeLogo").addEventListener("click", () => {
  uploadedLogoData = "";
  $("logoUrl").value = "";
  $("logoUpload").value = "";
  updateLogoPreview();
  applyPreferences(values());
});
for (const id of ["portalUrl", "oauthClientId", "oauthRedirectUri", "webMapId", "webSceneId"]) $(id).addEventListener("input", renderDiagnostics);

$("save").addEventListener("click", () => {
  try {
    const next = values();
    validate(next);
    savePreferences(next);
    toast("Settings saved. Reloading…");
    setTimeout(() => window.location.reload(), 650);
  } catch (error) {
    toast(error.message || "Settings could not be saved.", "error");
  }
});

$("reset").addEventListener("click", () => {
  clearPreferences();
  toast("Browser-local settings removed. Reloading…");
  setTimeout(() => window.location.reload(), 500);
});

$("printHelp").addEventListener("click", () => {
  document.querySelectorAll(".help-card").forEach((card) => { card.open = true; });
  window.print();
});

populate();
