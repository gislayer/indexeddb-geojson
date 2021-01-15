var map = new ol.Map({
  target: 'map',
  layers: [
    new ol.layer.Tile({
      source: new ol.source.XYZ({
        url: 'http://{a-d}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        crossOrigin: 'anonymous'
      })
    })
  ],
  view: new ol.View({
    center: ol.proj.fromLonLat([-0.09,51.505]),
    zoom: 13
  })
});

var layer1 = new ol.layer.Vector({
  source: new ol.source.Vector(),
  style: new ol.style.Style({
    fill: new ol.style.Fill({
      color: 'rgba(139, 195, 74, 0.5)'
    }),
    stroke: new ol.style.Stroke({
      color: '#8BC34A',
      width: 3
    }),
    image: new ol.style.Circle({
      radius: 5,
      fill: new ol.style.Fill({
        color: '#8BC34A'
      })
    })
  })
});
map.addLayer(layer1);

var layer2 = new ol.layer.Vector({
  source: new ol.source.Vector(),
  style: new ol.style.Style({
    fill: new ol.style.Fill({
      color: 'rgba(255, 193, 7, 0.7)'
    }),
    stroke: new ol.style.Stroke({
      color: '#00bcd4',
      width: 4
    }),
    image: new ol.style.Circle({
      radius: 7,
      fill: new ol.style.Fill({
        color: '#9c27b0'
      })
    })
  })
});
map.addLayer(layer2);

function clearLayer(layer) {
  layer.getSource().clear();
}

function featuresToGeoJSON(features){
  var reader = new ol.format.GeoJSON();
  var geojson = reader.writeFeatures(features,{
    featureProjection: 'EPSG:3857',
    dataProjection: 'EPSG:4326'
  });
  return JSON.parse(geojson);
}

function GeoJSONToFeature(geojson){
  var reader = new ol.format.GeoJSON();
  var features = reader.readFeatures(geojson,{
    featureProjection: 'EPSG:3857',
    dataProjection: 'EPSG:4326'
  });
  return features;
}

function addFeaturesToLayer(layer,features) {
  var src = layer.getSource();
  src.clear();
  src.addFeatures(features);
}

function zoomToLayer(layer) {
  var features = layer.getSource().getFeatures();
  if(features.length>0){
    var extend = layer.getSource().getExtent();
    map.getView().fit(extend, map.getSize());
    var zoomlevel = map.getView().getZoom();
    if (zoomlevel > 18) {
      zoomlevel = 18;
    }
    map.getView().setZoom(zoomlevel);
  }
}

function draw(type){
  var draw = new ol.interaction.Draw({
    source: layer2.getSource(),
    type: type
  });
  map.addInteraction(draw);
  draw.on('drawend', function (e) {
    setTimeout(function(){
      debugger;
      var features = layer2.getSource().getFeatures();
      var geojson = featuresToGeoJSON(features);
      database_1.add({
        type:'updateLayer',
        param:{
          layerId:'layer2',
          geojson:geojson
        }});

    },100)
    map.removeInteraction(draw);
  });
}

function readGeoJSON(){
  var input = document.createElement('input');
  input.type='file';
  input.accept='.json, .geojson';
  input.addEventListener('input', function (e) {
    var file = e.target.files[0];
    var reader = new FileReader();
    reader.addEventListener("load", function (e2) {
      debugger;
      var geojson = JSON.parse(reader.result);
      database_1.add({
        type:'addLayer',
        param:{
          layerId:'layer1',
          geojson:geojson
        },
        callback:function(status1){
          if(status1){
            var features = GeoJSONToFeature(geojson);
            addFeaturesToLayer(layer1,features);
            zoomToLayer(layer1);
            document.getElementById('removeButton').style.display='inline-block';
          }else{
            database_1.add({
              type:'deleteLayer',
              param:{
                layerId:'layer1'
              },
              callback:function(status2){
                debugger;
                if(status2){
                  document.getElementById('removeButton').style.display='none';
                  database_1.add({
                    type:'addLayer',
                    param:{
                      layerId:'layer1',
                      geojson:geojson
                    },
                    callback:function(status3){
                      if(status3){
                        var features = GeoJSONToFeature(geojson);
                        addFeaturesToLayer(layer1,features);
                        zoomToLayer(layer1);
                        document.getElementById('removeButton').style.display='inline-block';
                      }
                    }
                  });
                }
              }});
          }
        }
      });
    });
    reader.readAsText(file);
  });
  input.click();
}

function  removeGeoJSON() {
  database_1.add({
    type:'deleteLayer',
    param:{
      layerId:'layer1'
    },
    callback:function(status){
      if(status){
        document.getElementById('removeButton').style.display='none';
        clearLayer(layer1);
      }
    }});
}

function clearAll() {
  debugger;
  database_1.add({
    type:'updateLayer',
    param:{
      layerId:'layer1',
      geojson:{ "type": "FeatureCollection", "features": [] }
    },
    callback:function(status){
      if(status){
        clearLayer(layer1);
      }
  }})
  database_1.add({
    type:'updateLayer',
    param:{
      layerId:'layer2',
      geojson:{ "type": "FeatureCollection", "features": [] }
    },
    callback:function(status){
      if(status){
        clearLayer(layer2);
      }
  }})
}