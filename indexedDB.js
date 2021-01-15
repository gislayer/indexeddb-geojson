window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;

class IDBGeoJSON {
  constructor(params){
    this.db_name = params.db_name;
    this.localStorageName = this.db_name+'-indexedDB-version';
    this.round=parseInt(params.round) || 5;
    this.jobs=[];
    this.add({
      type:'createDB',
      prop:{
        db_name:this.db_name
      }
    })
  }

  setVersion(version){
    localStorage.setItem(this.localStorageName, version);
  }

  getVersion(){
    var version = localStorage.getItem(this.localStorageName);
    if (version == null || version == '') {
      localStorage.setItem(this.localStorageName, 1);
    }
    version = localStorage.getItem(this.localStorageName);
    return parseInt(version,10);
  }

  createDB(callback){
    var self = this;
    var request = indexedDB.open(this.db_name);
    request.onerror = function(event) {
      console.log('indexedDB Error Code:'+event.target.errorCode);
      callback(false)
    };
    request.onsuccess = function(sender) {
      var db = sender.target.result;
      var newVersion = db.version+1;
      self.setVersion(newVersion);
      var tableNames = db.objectStoreNames;
      db.close();
      if(tableNames.length==0){
        var request = indexedDB.open('gislayer', newVersion);
        request.onupgradeneeded = function (event) {
          var db2 = event.target.result;
          var layerTable = db2.createObjectStore('layers', {
            keyPath: "layerid"
          });
          layerTable.createIndex('layerid', 'layerid', {
            unique: true
          });
          layerTable.createIndex('geojson', 'geojson', {
            unique: false
          });
          db2.close();
          callback(true);
        }
      }else{
        callback(true);
      }      
    };
  }

  deleteLayer(layerId,callback){
    debugger;
    var self = this;
    var version = this.getVersion();
    var request = window.indexedDB.open('gislayer', version);
    request.onsuccess = function (event) {
      var db = event.target.result;
      var request2 = db.transaction(['layers'], "readwrite").objectStore('layers').delete(layerId);
      request2.onsuccess = function (event) {
        var db = event.target.transaction.db;
        var currentVersion = db.version;
        db.close();
        self.setVersion(currentVersion);
        callback(true);
      }
      request.onerror = function(event) {
        console.log('indexedDB Error Code:'+event.target.errorCode);
        callback(false)
      };
    }
  }

  addLayer(layerId,GeoJSON,callback){
    var self = this;
    var version = self.getVersion();
    var request = indexedDB.open(this.db_name, version);
    request.onsuccess = function(event){
      var db = event.target.result;
      var data = {
        layerid:layerId,
        geojson:GeoJSON
      };
      var insert = db.transaction(['layers'], "readwrite").objectStore('layers').add(data);
      insert.onsuccess = function (e1) {
        event.target.result.close();
        callback(true);
      }
      insert.onerror = function (e1) {
        event.target.result.close();
        console.log(e1.target.error.message);
        callback(false);
      }
      db.close();
    }
  }

  updateLayer(layerId,GeoJSON,callback){
    var version = this.getVersion();
    var newVersion = version + 1;
    this.setVersion(newVersion);
    var request = window.indexedDB.open('gislayer', newVersion);
    request.onsuccess = function (event) {
      var db = event.target.result;
      var store = db.transaction(['layers'], "readwrite").objectStore('layers');
      var data = {
        layerid: layerId,
        geojson: GeoJSON,
      };
      store.put(data);
      db.close();
      callback(true);
    }
    request.onerror = function (e1) {
      var db = e1.target.result;
      db.close();
      console.log(e1.target.error.message);
      callback(false);
    }
  }

  showLayer(callback){
    var version = this.getVersion();
    var newVersion = version + 1;
    this.setVersion(newVersion);
    var request = window.indexedDB.open('gislayer', newVersion);
    request.onsuccess = function (event) {
      var db = event.target.result;
      var store = db.transaction(['layers'], "readonly").objectStore('layers');
      var result = [];
      store.openCursor().onsuccess = function (e) {
        var cursor = e.target.result;
        if (cursor) {
          result.push(cursor.value);
          cursor.continue();
        }else{
          callback(result);
        }
      }
      db.close();
    }
    request.onerror = function (e1) {
      var db = e1.target.result;
      db.close();
      console.log(e1.target.error.message);
      callback(false);
    }
  }

  add(job){
    this.jobs.push(job);
    if(this.jobs.length==1){
      this.next();
    }
  }

  next(){
    var self = this;
    if(this.jobs.length>0){
      const job = this.jobs[0];
      switch(job.type){
        case 'createDB':{
          this.createDB((status)=>{
            if(job.callback!==undefined){
              job.callback(status);
            }
            self.jobs.splice(0,1);
            self.next();
          })
          break;
        }
        case 'addLayer':{
          this.addLayer(job.param.layerId,job.param.geojson,(status)=>{
            if(job.callback!==undefined){
              job.callback(status);
            }
            self.jobs.splice(0,1);
            self.next();
          });
          break;
        }
        case 'deleteLayer':{
          self.deleteLayer(job.param.layerId,function(status){
            if(job.callback!==undefined){
              job.callback(status);
            }
            self.jobs.splice(0,1);
            self.next();
          });
          break;
        }
        case 'updateLayer':{
          self.updateLayer(job.param.layerId,job.param.geojson,function(status){
            if(job.callback!==undefined){
              job.callback(status);
            }
            self.jobs.splice(0,1);
            self.next();
          });
          break;
        }
        case 'showLayer':{
          self.showLayer(function(data){
            if(job.callback!==undefined){
              job.callback(data);
            }
            self.jobs.splice(0,1);
            self.next();
          });
          break;
        }
      }
    }
  }

}

var database_1 = new IDBGeoJSON({
  db_name:'gislayer'
});

database_1.add({
  type:'addLayer',
  param:{
    layerId:'layer2',
    geojson:{ "type": "FeatureCollection", "features": [] }
  }
});

database_1.add({
  type:'showLayer',
  callback:(layers)=>{
    debugger
    layers.map((layer)=>{
      var features = GeoJSONToFeature(layer.geojson);
      addFeaturesToLayer(window[layer.layerid],features);
      zoomToLayer(window[layer.layerid]);
    });
  }
});

