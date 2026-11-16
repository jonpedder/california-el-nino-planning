export const APP_CONFIG = Object.freeze({
  portalUrl: "https://publicsafety.maps.arcgis.com",
  oauthClientId: "2eURPxapfMdaZiS7",
  basemap: "dark-gray-vector",
  countyDataUrl: "./data/county-capabilities.json",

  // Optional content bindings. Leave null until audited ArcGIS Online items or
  // services are approved. Never commit access tokens to this file.
  webMapItemId: null,
  operationalLayerItems: Object.freeze({}),

  defaultViewpoint: Object.freeze({
    center: Object.freeze([-119.6, 36.6]),
    zoom: 5
  })
});
