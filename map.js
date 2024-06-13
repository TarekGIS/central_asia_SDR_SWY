setAssetPath(location.href);
import { setAssetPath } from '@esri/calcite-components/dist/components';
import '@esri/calcite-components/dist/components/calcite-button';
import '@esri/calcite-components/dist/calcite/calcite.css';
import './style.css';
import $ from 'jquery';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import TileWMS from 'ol/source/TileWMS';
import LayerGroup from 'ol/layer/Group';
import WMSCapabilities from 'ol/format/WMSCapabilities';
import OSM from 'ol/source/OSM';
import MousePosition from 'ol/control/MousePosition';
import ScaleLine from 'ol/control/ScaleLine';
import { easeOut } from 'ol/easing';
import { defaults as defaultControls } from 'ol/control.js';
import { transformExtent, transform } from 'ol/proj';
import { buffer, getArea, getWidth } from 'ol/extent';

import LayerSwitcher from 'ol-ext/control/LayerSwitcher';

const geoserverURL = 'http://localhost:8080/geoserver/wms';
const apiKey = 'VLj5D2Mo8NPkU5TKXOil';
const extents = {
  areaExtent: [5268200, 3818817, 9549287, 7960877],
  uzExtent: [6233643.913381721, 4463830.295400388, 8141047.147457665, 5711883.030099092],
  tmExtent: [5837753.61278432, 4181536.3916340177, 7423262.685444773, 5280904.264248402],
  tjExtent: [7501501.079696537, 4393481.256470986, 8364237.324948153, 5018574.636139978],
  kgExtent: [7711837.946230729, 4746460.310757111, 8937082.74322702, 5348304.303233134],
  kzExtent: [5175449.693801752, 4946436.881257794, 9719600.875194324, 7446127.15425371]
};

let layersID = [];
let gsTitles = [];
let wmsLayer;
let KZGroup, KGGroup, UZGroup, TJGroup, TMGroup;

const osmBM = new TileLayer({ title: 'Basemap', source: new OSM({ attributions: false }) });

const mousePositionControl = new MousePosition({
  coordinateFormat: coordinate => `Latitude: ${coordinate[1].toFixed(2)} </br> Longitude: ${coordinate[0].toFixed(2)}`,
  projection: 'EPSG:4326'
});

const scaleLineControl = new ScaleLine({
  minWidth: 100,
  bar: 'true',
  steps: 4
});

const map = new Map({
  controls: defaultControls().extend([mousePositionControl, scaleLineControl]),
  target: 'map',
  layers: [osmBM],
  view: new View({
    center: [7408744, 5889847],
    zoom: 5.02
  })
});

const zoomToCenter = ({ target }) => {
  if (target.id === 'areaOfInterest') {
    map.getView().fit(extents.areaExtent, {
      size: map.getSize(),
      duration: 1000,
      easing: easeOut
    });
  }
};

const selectingLayers = ({ target }) => {
  const layerID = target.id;
  const selectedElements = $("[id^='" + layerID + "']");

  if (['PET_KZ', 'ET0_KZ', 'PET_UZ', 'ET0_UZ', 'PET_TJ', 'ET0_TJ', 'PET_TM', 'ET0_TM', , 'PET_TM', 'ET0_TM'].includes(layerID)) {
    if ($(`#${layerID}`).attr('selected')) {
      selectedElements.each(function () {
        const id = $(this).attr('id');
        const index = layersID.lastIndexOf(id);
        if (index !== -1) layersID.splice(index, 1);
        $(this).removeAttr('selected');
      });
    } else {
      selectedElements.each(function () {
        const id = $(this).attr('id');
        layersID.push(id);
        $(this).attr('selected', 'selected');
      });
    }
  } else {
    const index = layersID.indexOf(layerID);
    if (index === -1) layersID.push(layerID);
    else layersID.splice(index, 1);
  }
};

const clearAllLayers = ({ target }) => {
  const layers = map.getLayers().getArray();

  // Remove each WMS layer from the map
  for (let i = layers.length - 1; i >= 0; i--) {
    if (layers[i] instanceof TileLayer && layers[i].getSource() instanceof TileWMS) {
      map.removeLayer(layers[i]);
    } else if (layers[i] instanceof LayerGroup) {
      map.removeLayer(layers[i]);
    }
  }

  if (target.id === 'clearAllButton') {
    $('calcite-tree-item').removeAttr('selected');
    layersID = [];
    zoomToCenter({ target: { id: 'areaOfInterest' } });
  }

  $('#legendContent').html('');
  addGroups();
};

function addGroups() {
  KZGroup = new LayerGroup({
    title: 'Kazakhstan',
    layers: []
  });

  KGGroup = new LayerGroup({
    title: 'Kyrgyzstan',
    layers: []
  });

  UZGroup = new LayerGroup({
    title: 'Uzbekistan',
    layers: []
  });

  TMGroup = new LayerGroup({
    title: 'Turkmenistan',
    layers: []
  });

  TJGroup = new LayerGroup({
    title: 'Tajikistan',
    layers: []
  });

  map.addLayer(KGGroup);
  map.addLayer(TMGroup);
  map.addLayer(TJGroup);
  map.addLayer(UZGroup);
  map.addLayer(KZGroup);
}

addGroups();

const addingLayers = () => {
  layersID.forEach(layerID => {
    $.ajax({
      type: 'GET',
      url: 'http://localhost:8080/geoserver/Central_Asia/wms?request=getCapabilities',
      dataType: 'xml',
      success: function (xml) {
        // Find the layer with the matching name
        $(xml)
          .find('Layer')
          .each(function () {
            const gsName = $(this).children('Name').text();

            if (gsName === layerID) {
              // Log the title of the layer
              const gsTitle = $(this).children('Title').text();
              const extentArray = ['minx', 'miny', 'maxx', 'maxy'].map(attr => Number($(this).children('BoundingBox').attr(attr)));
              const layerExtent = transformExtent(extentArray, 'CRS:84', 'EPSG:3857');

              const wmsSource = new TileWMS({
                url: 'http://localhost:8080/geoserver/Central_Asia/wms', // Include the workspace in the URL
                params: { LAYERS: layerID, FORMAT: 'image/png', TILED: true }, // Only the layer name
                serverType: 'geoserver',
                crossOrigin: 'anonymous'
              });

              wmsLayer = new TileLayer({
                source: wmsSource,
                title: `${gsTitle}`,
                extent: layerExtent
              });

              if (layerID.includes('_KZ')) {
                KZGroup.getLayers().push(wmsLayer);
                console.log('Added layer to KZGroup');
              } else if (layerID.includes('_KG')) {
                KGGroup.getLayers().push(wmsLayer);
                console.log('Added layer to KGGroup');
              } else if (layerID.includes('_UZ')) {
                UZGroup.getLayers().push(wmsLayer);
                console.log('Added layer to UZGroup');
              } else if (layerID.includes('_TJ')) {
                TJGroup.getLayers().push(wmsLayer);
                console.log('Added layer to TJGroup');
              } else if (layerID.includes('_TM')) {
                TMGroup.getLayers().push(wmsLayer);
                console.log('Added layer to TMGroup');
              } else map.addLayer(wmsLayer);

              let loading = 0;
              wmsSource.on('tileloadstart', function () {
                loading++;
                $('#map-loader').css('display', 'flex');
              });
              wmsSource.on(['tileloadend', 'tileloaderror'], function () {
                loading--;
                if (loading === 0) {
                  $('#map-loader').css('display', 'none');
                }
              });

              map.getView().fit(extents.areaExtent, { duration: 1000 });

              map.on('click', e => {
                const viewResolution = map.getView().getResolution();
                const url = wmsSource.getFeatureInfoUrl(e.coordinate, viewResolution, 'EPSG:3857', { INFO_FORMAT: 'application/json' });
                $.get(url, function (data) {
                  // $("#popup-content").append(data);
                  //document.getElementById('popup-content').innerHTML = '<p>Feature Info</p><code>' + data + '</code>';
                  content += data;
                  // overlay.setPosition(coordinate);
                  popup.show(evt.coordinate, content);
                });
                // if (url) {
                //   fetch(url)
                //     .then(response => response.json())
                //     .then(json => {
                //       if (json.features && json.features.length > 0) {
                //         // Only log the topmost feature
                //         console.log(json.features[0].properties);
                //       }
                //     });
                // }
              });

              // Add the legend
              const legendUrl = `http://localhost:8080/geoserver/Central_Asia/wms?request=GetLegendGraphic&format=image/png&width=20&height=20&layer=${layerID}`;
              $('#legendContent').append(`<h4>${gsTitle}</h4> <br> <img src="${legendUrl}">`);

              // // Get and log the extent of the layer
              // const extent = wmsLayer.getExtent();
              // console.log(`Extent of ${title}: ${extent}`);
            }
          });
      }
    });
  });
};

$('calcite-action-bar').on('click', zoomToCenter);
$('calcite-tree-item').on('click', selectingLayers);
$('calcite-button').on('click', clearAllLayers);
$('#addToMap').on('click', addingLayers);

const layerSwitcher = new LayerSwitcher({
  extent: true,
  mouseover: true,
  trash: true,
  layerGroup: true
});

map.addControl(layerSwitcher);
// Create a new TileWMS source
