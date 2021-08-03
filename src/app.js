// ------------------------------------------------------------------------------
// ----- NY WSC TEMPLATE --------------------------------------------------------
// ------------------------------------------------------------------------------

// copyright:   2020 Martyn Smith - USGS NY WSC

// authors:  Martyn J. Smith - USGS NY WSC

// purpose:  Template for USGS NY WSC Web Maps

// updates:
// 07.08.2020 mjs - Created

//CSS imports
import 'bootstrap/dist/css/bootstrap.css';
import 'leaflet/dist/leaflet.css';
import './styles/main.css';

//JS imports
import 'bootstrap';
import 'leaflet';
import { basemapLayer, dynamicMapLayer } from 'esri-leaflet';
import '@fortawesome/fontawesome-free/js/fontawesome';
import '@fortawesome/fontawesome-free/js/solid';
import 'geotiff.js/dist/geotiff.bundle.min.js';
import 'plotty';
import 'leaflet-geotiff-2';
import 'leaflet-geotiff-2/dist/leaflet-geotiff-plotty';
import { map } from 'jquery';


//global variables here
var theMap, layer, surficialLayer, wellLayer, plottyRenderer, windSpeedLayer;

if (process.env.NODE_ENV !== 'production') {
  require('./index.html');
}

//instantiate map
$( document ).ready(function() {
	console.log('Application Information: ' + process.env.NODE_ENV + ' ' + 'version ' + VERSION);
	$('#appVersion').html('Application Information: ' + process.env.NODE_ENV + ' ' + 'version ' + VERSION);

	//create map
	theMap = L.map('mapDiv',{zoomControl: false, preferCanvas: true, maxZoom: 13});

	//add zoom control with your options
	L.control.zoom({position:'topright'}).addTo(theMap);  
	L.control.scale().addTo(theMap);

	//basemap
	layer= L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
		attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
		maxZoom: 16
	}).addTo(theMap);

	//map layers
	surficialLayer = dynamicMapLayer({
		url: 'https://gis.usgs.gov/sciencebase2/rest/services/Catalog/5f5f70ae82ce3550e3bff165/MapServer',
		opacity: 0.75,
		useCors: false
	}).addTo(theMap);

	$.getJSON('./data/priority_wells.json', function( data ) {

		console.log('HERE', data)

		var geojsonMarkerOptions = {
			radius: 8,
			fillColor: "#ff7800",
			color: "#000",
			weight: 1,
			opacity: 1,
			fillOpacity: 0.8
		};

		wellLayer = L.geoJSON(data, {
			pointToLayer: function (feature, latlng) {
				return L.circleMarker(latlng, geojsonMarkerOptions);
			}
		}).addTo(theMap);
	});

	surficialLayer.bringToBack();

	plottyRenderer = L.LeafletGeotiff.plotty({
		colorScale: 'viridis',
		displayMin: 0,
		displayMax: 1,
		clampLow: false,
		clampHigh: false,
	});

	//add initial raster layer
	addRaster('mp_mc_combined_baserat');
  
	//set initial view
	theMap.setView([MapY, MapX], MapZoom);

	/*  START EVENT HANDLERS */

	$('[data-toggle="popover"]').popover({
        placement: 'bottom',
        boundary: 'viewport',
        trigger: 'hover',
        html: true,
        content: function () {
            let content = $(this).attr("data-popover-content");
            return $(content).html();
        }
	})

	theMap.on('zoomend', function() {

		var zoomLevel = theMap.getZoom();

		console.log('zoom',zoomLevel) 
		if (zoomLevel >= 12) {
			if (theMap.hasLayer(wellLayer)) {
				theMap.removeLayer(wellLayer);
			}
		}
		else {
			if (!theMap.hasLayer(wellLayer)) {
				theMap.addLayer(wellLayer);
			}

		}

	});

	// Add minus icon for collapse element which is open by default
	$("#colorScale").on("change", (event) => {
		const colorScale = $("#colorScale option:selected").val();
		windSpeedLayer.options.renderer.setColorScale(colorScale);
	  });

	let popup;
	theMap.on("click", function (e) {
		if (!popup) {
			popup = L.popup().setLatLng([e.latlng.lat, e.latlng.lng]).openOn(theMap);
		} else {
			popup.setLatLng([e.latlng.lat, e.latlng.lng]);
		}
		const value = windSpeedLayer.getValueAtLatLng(+e.latlng.lat, +e.latlng.lng).toFixed(2);
		if (value < 0) return;
		popup
			.setContent(`Value at point: ${value}`)
			.openOn(theMap);
	});

	$(".collapse.show").each(function(){
		console.log('in collapse show')
		$(this).prev(".card-header").find("svg").addClass("fa-minus").removeClass("fa-plus");
	});
	
	// Toggle plus minus icon on show hide of collapse element
	$(".collapse").on('show.bs.collapse', function(){
		$(this).prev(".card-header").find("svg").removeClass("fa-plus").addClass("fa-minus");
	}).on('hide.bs.collapse', function(){
		$(this).prev(".card-header").find("svg").removeClass("fa-minus").addClass("fa-plus");
	});

	$('.rasterBtn').click(function() {
		$('.rasterBtn').removeClass('slick-btn-selection');
		$(this).addClass('slick-btn-selection');
		var raster =  $(this).data('raster');
		console.log('thizzz', raster)
		addRaster(raster);
	});


	$('.basemapBtn').click(function() {
		$('.basemapBtn').removeClass('slick-btn-selection');
		$(this).addClass('slick-btn-selection');
		var baseMap = this.id.replace('btn','');
		setBasemap(baseMap);
	});

	$('#btnSurficial').click(function() {
		(theMap.hasLayer(surficialLayer)) ? theMap.removeLayer(surficialLayer) : theMap.addLayer(surficialLayer)
	});

	$('#mobile-main-menu').click(function() {
		$('body').toggleClass('isOpenMenu');
	});

	$('#aboutButton').click(function() {
		$('#aboutModal').modal('show');
	});	


	$('.app-title').html(appTitle);

	/*  END EVENT HANDLERS */
});

function addRaster(image) {

	var url = './tif/' + image + '.4326.tif';

	if (theMap.hasLayer(windSpeedLayer)) theMap.removeLayer(windSpeedLayer);

	windSpeedLayer = L.leafletGeotiff(url, {
		renderer: plottyRenderer,
		opacity: 0.3
	  }).addTo(theMap);

	console.log('WINDSPEEDLAYER',windSpeedLayer)

	//init legend
	$('#colorScale').html('<img src="' + windSpeedLayer.options.renderer.colorScaleData + '" />');

	var slider = document.getElementById("myRange");
	var output = document.getElementById("demo");

	// Update the current slider value (each time you drag the slider handle)
	slider.oninput = function() {
	output.innerHTML = this.value + ' to 100';

	windSpeedLayer.options.renderer.setDisplayRange(
		+this.value/100,
		windSpeedLayer.options.renderer.options.displayMax
	);
	}
}

function setBasemap(baseMap) {

	switch (baseMap) {
		case 'Streets': baseMap = 'Streets'; break;
		case 'Topo': baseMap = 'Topographic'; break;
		case 'Terrain': baseMap = 'Terrain'; break;
		case 'Gray': baseMap = 'Gray'; break;
		case 'NatGeo': baseMap = 'NationalGeographic'; break;
	}

	if (layer) 	theMap.removeLayer(layer);
	layer = basemapLayer(baseMap);
	theMap.addLayer(layer);
	if (layerLabels) theMap.removeLayer(layerLabels);
	if (baseMap === 'Gray' || baseMap === 'Terrain') {
		layerLabels = basemapLayer(baseMap + 'Labels');
		theMap.addLayer(layerLabels);
	}
}