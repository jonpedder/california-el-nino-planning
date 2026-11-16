export const APP_CONFIG = Object.freeze({
  portalUrl: "https://publicsafety.maps.arcgis.com",
  oauthClientId: "2eURPxapfMdaZiS7",
  basemap: "dark-gray-vector",
  countyDataUrl: "./data/county-capabilities.json",
  geoenrichmentUrl: "https://geoenrich.arcgis.com/arcgis/rest/services/World/geoenrichmentserver/GeoEnrichment/enrich",
  geoenrichmentHierarchy: "esri2025",
  geoenrichmentVariables: "KeyUSFacts.TOTPOP_CY,KeyUSFacts.TOTHH_CY,KeyUSFacts.MEDHINC_CY,gender.MEDAGE_CY,KeyUSFacts.POPGRWCYFY",

  // Public, authoritative planning/context sources verified on 2026-11-16.
  // Portal item IDs preserve publisher-managed symbology, popups, and attribution.
  // Never commit access tokens to this file.
  operationalLayers: Object.freeze([
    Object.freeze({
      key: "precipitationForecast",
      itemId: "f9e9283b9c9741d09aad633f68758bf6",
      title: "NWS Precipitation Forecast (72 hours)",
      category: "Forecast",
      source: "National Weather Service / Living Atlas",
      cadence: "Hourly source update; service advertises 15-minute refresh",
      refreshInterval: 15,
      opacity: 0.68
    }),
    Object.freeze({
      key: "weatherWarnings",
      itemId: "a6134ae01aad44c499d12feec782b386",
      title: "USA Weather Watches and Warnings",
      category: "Live advisory",
      source: "National Weather Service / Living Atlas",
      cadence: "Approximately 5 minutes",
      refreshInterval: 5,
      opacity: 0.72
    }),
    Object.freeze({
      key: "liveStreamGauges",
      itemId: "81c5a9f2a2704d54a49042a44eefa5d3",
      title: "USGS and Community Live Stream Gauges",
      category: "Near-real-time hydrology",
      source: "USGS / NWS / Living Atlas contributors",
      cadence: "Approximately hourly",
      refreshInterval: 60,
      minScale: 1500000,
      opacity: 0.92
    }),
    Object.freeze({
      key: "fireHistory",
      itemId: "5e72b1699bf74eefb3f3aff6f4ba5511",
      title: "WFIGS Interagency Fire Perimeters",
      category: "Planning history",
      source: "National Interagency Fire Center",
      cadence: "Approximately 5 minutes; pre-2021 records are incomplete",
      refreshInterval: 5,
      opacity: 0.52
    }),
    Object.freeze({
      key: "currentFirePerimeters",
      itemId: "d1c32af3212341869b3c810f1a215824",
      title: "WFIGS Current Interagency Fire Perimeters",
      category: "Current incident context",
      source: "National Interagency Fire Center",
      cadence: "Approximately 5 minutes",
      refreshInterval: 5,
      opacity: 0.66,
      defaultVisible: false
    }),
    Object.freeze({
      key: "floodHazards",
      itemId: "ccd29fb4bd5e4b44a2d61638829a5d7e",
      title: "USA Flood Hazard Areas",
      category: "Planning hazard",
      source: "FEMA / Living Atlas",
      cadence: "Annual snapshot",
      opacity: 0.46,
      minScale: 400000
    }),
    Object.freeze({
      key: "femaRiskCounties",
      itemId: "39485e8035d446a5bff03259508ae355",
      title: "FEMA National Risk Index Counties",
      category: "Multi-hazard risk planning",
      source: "Federal Emergency Management Agency",
      cadence: "December 2025 National Risk Index v1.20",
      opacity: 0.38,
      maxScale: 700000,
      includeAllPopupFields: true
    }),
    Object.freeze({
      key: "femaRiskTracts",
      itemId: "9da4eeb936544335a6db0cd7a8448a51",
      title: "FEMA National Risk Index Census Tracts",
      category: "Detailed multi-hazard risk planning",
      source: "Federal Emergency Management Agency",
      cadence: "December 2025 National Risk Index v1.20",
      opacity: 0.42,
      minScale: 700000,
      includeAllPopupFields: true
    }),
    Object.freeze({
      key: "structures",
      itemId: "0ec8512ad21e4bb987d7e848d14e7e24",
      title: "USA Structures",
      category: "Exposure context",
      source: "FEMA / ORNL / Living Atlas",
      cadence: "Publisher-managed",
      opacity: 0.55,
      minScale: 50000,
      defaultVisible: false
    }),
    Object.freeze({
      key: "coastalEmployment",
      itemId: "7ac21b0dd7f340f28d11f9f85ae2f908",
      title: "Employment in Coastal Inundation Zones",
      category: "Coastal exposure planning",
      source: "NOAA Office for Coastal Management",
      cadence: "October 2023 analysis; not a live feed",
      opacity: 0.58
    }),
    Object.freeze({
      key: "censusDemographics",
      itemId: "ebeb65deb5c14f4d8849fd68944b7ee6",
      title: "USA 2020 Census Population Characteristics",
      category: "Demographic context",
      source: "U.S. Census Bureau / Esri Living Atlas",
      cadence: "2020 decennial census vintage",
      opacity: 0.34,
      defaultVisible: false
    }),
    Object.freeze({
      key: "laDebrisFlow",
      itemId: "c940b2937a7e4554bccc436c92bef195",
      title: "Los Angeles County Post-Fire Debris Flow Hazards",
      category: "County planning hazard",
      source: "Los Angeles County Public Works",
      cadence: "Publisher-managed",
      opacity: 0.76
    })
  ]),

  countyLayerVisibility: Object.freeze({
    marin: Object.freeze(["precipitationForecast", "weatherWarnings", "liveStreamGauges", "fireHistory", "floodHazards", "femaRiskCounties", "femaRiskTracts", "coastalEmployment"]),
    "santa-cruz": Object.freeze(["precipitationForecast", "weatherWarnings", "liveStreamGauges", "fireHistory", "floodHazards", "femaRiskCounties", "femaRiskTracts", "coastalEmployment"]),
    "los-angeles": Object.freeze(["precipitationForecast", "weatherWarnings", "liveStreamGauges", "fireHistory", "floodHazards", "femaRiskCounties", "femaRiskTracts", "laDebrisFlow"]),
    "san-diego": Object.freeze(["precipitationForecast", "weatherWarnings", "liveStreamGauges", "fireHistory", "floodHazards", "femaRiskCounties", "femaRiskTracts"])
  }),

  defaultViewpoint: Object.freeze({
    center: Object.freeze([-119.6, 36.6]),
    zoom: 5
  })
});