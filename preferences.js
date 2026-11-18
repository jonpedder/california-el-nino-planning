const STORAGE_KEY = "california-el-nino-planning.preferences.v1";

export const DEFAULT_PREFERENCES = Object.freeze({
  branding: Object.freeze({
    title: "El Niño Planning Console",
    subtitle: "County threat posture and capability planning",
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
    initialCounty: "marin",
    initialView: "2d",
    showActiveShelters: true,
    showFireHistory: true,
    showFloodStageGauges: false,
    openLegend: false
  }),
  connection: Object.freeze({})
});

function mergePreferences(value = {}) {
  return {
    branding: { ...DEFAULT_PREFERENCES.branding, ...(value.branding || {}) },
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
  if (subtitle) subtitle.textContent = preferences.branding.subtitle;
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
