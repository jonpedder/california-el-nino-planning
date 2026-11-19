const STORAGE_KEY = "california-el-nino-planning.preferences.v1";

export const DEFAULT_PREFERENCES = Object.freeze({
  branding: Object.freeze({
    title: "El Niño Planning Console",
    subtitle: "County threat planning, analysis and operations — powered by ArcGIS Workflow Manager",
    logoUrl: "",
    logoData: ""
  }),
  theme: Object.freeze({
    navy: "#003b5c",
    background: "#071824",
    panel: "#0c2231",
    panelAlt: "#123247",
    accent: "#f2a900",
    text: "#f4f7f9",
    muted: "#afc3cf",
    border: "#28495b"
  }),
  operation: Object.freeze({
    initialView: "2d",
    showActiveShelters: true,
    showFireHistory: true,
    showFloodStageGauges: false,
    openLegend: false
  }),
  connection: Object.freeze({})
});

function mergePreferences(value = {}) {
  const branding = { ...DEFAULT_PREFERENCES.branding, ...(value.branding || {}) };
  if (branding.subtitle === "County threat posture and capability planning") {
    branding.subtitle = DEFAULT_PREFERENCES.branding.subtitle;
  }
  return {
    branding,
    theme: { ...DEFAULT_PREFERENCES.theme, ...(value.theme || {}) },
    operation: { ...DEFAULT_PREFERENCES.operation, ...(value.operation || {}) },
    connection: { ...(value.connection || {}) }
  };
}

export function loadPreferences() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return mergePreferences(stored);
  } catch {
    return mergePreferences();
  }
}

export function savePreferences(value) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mergePreferences(value)));
}

export function clearPreferences() {
  localStorage.removeItem(STORAGE_KEY);
}

export function runtimeConfig(deployment, preferences = loadPreferences()) {
  const connection = Object.fromEntries(
    Object.entries(preferences.connection || {}).filter(([, value]) => typeof value === "string" && value.trim())
  );
  return Object.freeze({ ...deployment, ...connection, preferences: preferences.operation });
}

export function applyPreferences(preferences = loadPreferences()) {
  const root = document.documentElement;
  const tokens = {
    "--navy": preferences.theme.navy,
    "--bg": preferences.theme.background,
    "--panel": preferences.theme.panel,
    "--panel2": preferences.theme.panelAlt,
    "--gold": preferences.theme.accent,
    "--text": preferences.theme.text,
    "--muted": preferences.theme.muted,
    "--border": preferences.theme.border
  };
  for (const [name, value] of Object.entries(tokens)) {
    if (/^#[0-9a-f]{6}$/i.test(value || "")) root.style.setProperty(name, value);
  }
  const title = document.querySelector("[data-app-title]");
  const subtitle = document.querySelector("[data-app-subtitle]");
  if (title) title.textContent = preferences.branding.title;
  if (subtitle) {
    const value = preferences.branding.subtitle || "";
    const poweredMatch = value.match(/^(.*?)(?:\s*[—-]\s*)powered by\s+(.+)$/i);
    subtitle.replaceChildren();
    if (poweredMatch) {
      subtitle.append(document.createTextNode(`${poweredMatch[1].trim()} — `));
      const powered = document.createElement("strong");
      powered.className = "brand-powered";
      powered.textContent = `Powered by ${poweredMatch[2].trim()}`;
      subtitle.append(powered);
    } else {
      subtitle.textContent = value;
    }
  }
  const logoSource = preferences.branding.logoData || preferences.branding.logoUrl;
  document.querySelectorAll(".brand-mark").forEach((mark) => {
    mark.replaceChildren();
    if (logoSource) {
      const image = document.createElement("img");
      image.src = logoSource;
      image.alt = "";
      image.referrerPolicy = "no-referrer";
      image.addEventListener("error", () => {
        mark.replaceChildren(document.createTextNode("CA"));
        mark.classList.remove("has-logo");
      }, { once: true });
      mark.append(image);
      mark.classList.add("has-logo");
    } else {
      mark.append(document.createTextNode("CA"));
      mark.classList.remove("has-logo");
    }
  });
}
