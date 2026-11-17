export const APP_CONFIG = Object.freeze({
  portalUrl: "https://publicsafety.maps.arcgis.com",
  oauthClientId: "2eURPxapfMdaZiS7",
  webMapId: "bc6d9edf97a0425eb53a1f7776c80133",
  basemap: "dark-gray-vector",
  countyDataUrl: "./data/county-capabilities.json",
  geoenrichmentUrl: "https://geoenrich.arcgis.com/arcgis/rest/services/World/geoenrichmentserver/GeoEnrichment/enrich",
  geoenrichmentHierarchy: "esri2025",
  geoenrichmentVariables: "KeyUSFacts.TOTPOP_CY,KeyUSFacts.TOTHH_CY,KeyUSFacts.MEDHINC_CY,gender.MEDAGE_CY,KeyUSFacts.POPGRWCYFY",
  postFireServiceUrl: "https://services.arcgis.com/v01gqwM5QqNysAAi/arcgis/rest/services/USGS_Post_Fire_Hazard_Assessment_Data/FeatureServer",
  postFirePointLayerId: 0,
  postFirePerimeterLayerId: 9,
  forecastProducts: Object.freeze({
    ero1: Object.freeze({ title: "NOAA/WPC Excessive Rainfall Outlook — Day 1", shortLabel: "Day 1 WPC ERO", url: "https://mapservices.weather.noaa.gov/vector/rest/services/hazards/wpc_precip_hazards/MapServer/0", where: "1=1", type: "ero" }),
    ero2: Object.freeze({ title: "NOAA/WPC Excessive Rainfall Outlook — Day 2", shortLabel: "Day 2 WPC ERO", url: "https://mapservices.weather.noaa.gov/vector/rest/services/hazards/wpc_precip_hazards/MapServer/1", where: "1=1", type: "ero" }),
    ero3: Object.freeze({ title: "NOAA/WPC Excessive Rainfall Outlook — Day 3", shortLabel: "Day 3 WPC ERO", url: "https://mapservices.weather.noaa.gov/vector/rest/services/hazards/wpc_precip_hazards/MapServer/2", where: "1=1", type: "ero" }),
    haz3_7: Object.freeze({ title: "NOAA/WPC Precipitation Hazards Outlook — Days 3–7", shortLabel: "Days 3–7 hazards", url: "https://mapservices.weather.noaa.gov/vector/rest/services/hazards/cpc_weather_hazards/MapServer/4", where: "label IN ('Heavy Rain','Heavy Precipitation')", type: "hazards" }),
    haz8_14: Object.freeze({ title: "NOAA/CPC Precipitation Hazards Outlook — Days 8–14", shortLabel: "Days 8–14 hazards", url: "https://mapservices.weather.noaa.gov/vector/rest/services/hazards/cpc_weather_hazards/MapServer/6", where: "label IN ('Heavy Rain','Heavy Precipitation')", type: "hazards" })
  }),

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
      key: "floodStageGauges",
      itemId: "81c5a9f2a2704d54a49042a44eefa5d3",
      title: "Live Stream Gauges — Flood Stage Only",
      category: "Flood-stage monitoring",
      source: "USGS / NWS / Living Atlas contributors",
      cadence: "Approximately hourly; filtered to statusClass >= 3",
      refreshInterval: 5,
      minScale: 1500000,
      opacity: 1,
      definitionExpression: "statusClass >= 3",
      matchTitleOnly: true,
      defaultVisible: false
    }),
    Object.freeze({
      key: "stateBoundaries",
      itemId: "8c2d6d7df8fa4142b0a1211c8dd66903",
      sublayerId: 0,
      title: "USA States Generalized Boundaries",
      category: "Reference boundaries",
      source: "Esri / U.S. Census Bureau",
      cadence: "Publisher-managed generalized boundaries",
      opacity: 0.35,
      defaultVisible: false
    }),
    Object.freeze({
      key: "acsPopulationTracts",
      itemId: "60c98f20a162416ea1725b94d7297f83",
      sublayerId: 2,
      title: "Analysis Source — ACS Population Census Tracts",
      category: "Population analysis",
      source: "U.S. Census Bureau ACS / Esri",
      cadence: "2020–2024 ACS 5-year estimates",
      opacity: 0.2,
      defaultVisible: false
    }),
    Object.freeze({
      key: "usgsPostFire",
      itemId: "cf3f58f60f774ad3b791ce5d90a0b92c",
      title: "USGS Post-Fire Debris-Flow Assessments",
      category: "Post-fire hazard assessment",
      source: "U.S. Geological Survey Landslide Hazards Program",
      cadence: "Publisher-managed assessments",
      opacity: 0.9,
      minScale: 2000000,
      defaultVisible: false
    }),
    Object.freeze({
      key: "alertCameras",
      itemId: "0c1c1166688f4f2db938194799337be4",
      sublayerId: 0,
      title: "ALERTCalifornia Live Cameras",
      category: "Live camera context",
      source: "ALERTCalifornia / UC San Diego",
      cadence: "Live camera feed; map layer refreshes every 15 seconds",
      refreshInterval: 0.25,
      minScale: 1000000,
      defaultVisible: false
    }),
    Object.freeze({
      key: "caltransRoads",
      itemId: "2d56e65de89c418780056651640291e8",
      sublayerId: 0,
      title: "Caltrans All Public Roads Network",
      category: "Transportation network",
      source: "California Department of Transportation",
      cadence: "Authoritative statewide network; not a live closure feed",
      opacity: 0.7,
      minScale: 250000,
      defaultVisible: false
    }),
    Object.freeze({
      key: "hospitals",
      itemId: "85672c5a514b4e1ebc08191a4bebf0c0",
      sublayerId: 0,
      title: "FEMA Hospitals and Medical Centers",
      category: "Critical facilities",
      source: "FEMA Region 9 / USGS National Structures",
      cadence: "Publisher-managed; checked weekly by publisher",
      opacity: 0.95,
      minScale: 500000,
      defaultVisible: false
    }),
    Object.freeze({
      key: "shelterFacilities",
      itemId: "61a97e7745ce4c8691044ff46769fb19",
      sublayerId: 0,
      title: "FEMA National Shelter System Facilities",
      category: "Shelter planning capacity",
      source: "FEMA Region 9 / National Shelter System",
      cadence: "Planning inventory; operational status must be verified",
      opacity: 0.95,
      minScale: 750000,
      defaultVisible: false
    }),
    Object.freeze({
      key: "activeShelters",
      itemId: "bc4f03b7ec3e4c8d86c3e2ebcd92e047",
      sublayerId: 0,
      title: "Cal OES Active Shelters",
      category: "Active shelter status",
      source: "California Governor's Office of Emergency Services / American Red Cross",
      cadence: "Approximately 60 seconds",
      refreshInterval: 1,
      minScale: 1500000,
      opacity: 1
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
    marin: Object.freeze(["precipitationForecast", "weatherWarnings", "liveStreamGauges", "activeShelters", "fireHistory", "floodHazards", "femaRiskCounties", "femaRiskTracts", "coastalEmployment"]),
    "santa-cruz": Object.freeze(["precipitationForecast", "weatherWarnings", "liveStreamGauges", "activeShelters", "fireHistory", "floodHazards", "femaRiskCounties", "femaRiskTracts", "coastalEmployment"]),
    "los-angeles": Object.freeze(["precipitationForecast", "weatherWarnings", "liveStreamGauges", "activeShelters", "fireHistory", "floodHazards", "femaRiskCounties", "femaRiskTracts", "laDebrisFlow"]),
    "san-diego": Object.freeze(["precipitationForecast", "weatherWarnings", "liveStreamGauges", "activeShelters", "fireHistory", "floodHazards", "femaRiskCounties", "femaRiskTracts"])
  }),

  countyFips: Object.freeze({ marin: "06041", "santa-cruz": "06087", "los-angeles": "06037", "san-diego": "06073" }),

  defaultViewpoint: Object.freeze({
    center: Object.freeze([-119.6, 36.6]),
    zoom: 5
  })
});