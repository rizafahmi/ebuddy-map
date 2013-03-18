function initialize(currentLat, currentLng) {
  var mapOptions = {
    center: new google.maps.LatLng(currentLat, currentLng),
    zoom: 13,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  };
  var map = new google.maps.Map(document.getElementById('map_canvas'),
    mapOptions);

  var input = document.getElementById('searchTextField');
  var autocomplete = new google.maps.places.Autocomplete(input);

  autocomplete.bindTo('bounds', map);

  var infowindow = new google.maps.InfoWindow();
  var marker = new google.maps.Marker({
    map: map
  });

  google.maps.event.addListener(autocomplete, 'place_changed', function() {
    infowindow.close();
    marker.setVisible(false);
    input.className = '';
    var place = autocomplete.getPlace();
    if (!place.geometry) {
      input.className = 'notfound';
      return;
    }

    calculateDistance(new google.maps.LatLng(currentLat, currentLng), new google.maps.LatLng(place.geometry.location.hb, place.geometry.location.ib));

    if (place.geometry.viewport) {
      map.fitBounds(place.geometry.viewport);
    } else {
      map.setCenter(place.geometry.location);
      map.setZoom(17);
    }
    var image = {
      url: place.icon,
      size: new google.maps.Size(71, 71),
      origin: new google.maps.Point(0, 0),
      anchor: new google.maps.Point(17, 34),
      scaledSize: new google.maps.Size(35, 35)
    };
    marker.setIcon(image);
    marker.setPosition(place.geometry.location);
    marker.setVisible(true);

    var address = '';
    if (place.address_components) {
      address = [
        (place.address_components[0] && place.address_components[0].short_name || ''),
        (place.address_components[1] && place.address_components[1].short_name || ''),
        (place.address_components[2] && place.address_components[2].short_name || '')
      ].join(' ');
    }

    infowindow.setContent('<div><strong>' + place.name + '</strong><br>' + address + '</div>');
    infowindow.open(map, marker);
  });


}
google.maps.event.addDomListener(window, 'load', initialize);

var db = openDatabase("SavedAddress", "1.0", "Saved Address", 20000);
var selectStatement = "SELECT * FROM SavedAddress ORDER BY id DESC";
var createStatement = "CREATE TABLE IF NOT EXISTS SavedAddress (id INTEGER PRIMARY KEY AUTOINCREMENT, address TEXT, distance INT)";
var selectStatement = "SELECT * FROM SavedAddress ORDER BY id DESC";
var insertStatement = "INSERT INTO SavedAddress (address, distance) VALUES (?, ?)";
var updateStatement = "UPDATE SavedAddress SET address=?, distance=? WHERE id=?";
var dataset, DataType;

function initDatabase(){
  try{
    if(!window.openDatabase){
      console.log("Database are not supported in this browser");
    }else{
      createTable();
    }
  }catch(e) {
    if(e == 2){
      console.log("Invalid database version.");
    } else {
      console.log("Unknown error " + e + ".");
    }
    return;
  }
}
function createTable(){
  db.transaction(function (tx) { tx.executeSql(createStatement); });
}
function insertRecord(){
  db.transaction(function(tx){
    tx.executeSql(insertStatement, [$("#searchTextField").val(), Math.round(total_distance/1000)]);
  });
}

function showRecord(){
  $("#result").html("");
  db.transaction(function(tx){
    tx.executeSql(selectStatement, [], function(tx, result){
      dataset = result.rows;
      var list = '<ul>';
      for (var i = 0, item = null; i < dataset.length; i += 1) {
        item = dataset.item(i);
        list = list + '<li>' + item['address'] + ' ==> ' + item['distance'] +' km.</li>';
      }
      list = list + '</ul>';
      $("#result").append(list);
    });
  });
}

if(geoPosition.init()){
  geoPosition.getCurrentPosition(success_callback,error_callback,{enableHighAccuracy:true});
}else{
  console.log("You cannot use Geolocation in this device");
}

function success_callback(p){
  var currentLat, currentLng;
  currentLat = p.coords.latitude;
  currentLng = p.coords.longitude;

  initialize(currentLat, currentLng);
  showRecord();
}
function error_callback(p){
  console.log("Error: " + p.message);
}

function calculateDistance(originLatLng, destinationLatLng){
  var service = new google.maps.DistanceMatrixService();
  var options = {
    origins: [originLatLng],
    destinations: [destinationLatLng],
    travelMode: google.maps.TravelMode.DRIVING,
    avoidHighways: true,
    avoidTolls: true
  };
  service.getDistanceMatrix(options, callback);

  function callback(response, status){
    if(status === google.maps.DistanceMatrixStatus.OK){
      var origins = response.originAddresses;
      var destinations = response.destinationAddresses;

      for (var i = 0; i < origins.length; i += 1) {
        var total_distance = 0;
        var results = response.rows[i].elements;
        for (var j = 0; j < results.length; j += 1) {
          var element = results[j];
          var distance = element.distance.value;
          var from = origins[i];
          var to = destinations[j];
          total_distance = total_distance + parseFloat(distance);
        }
      }
      var msg = "Distance from " + from + " to " + to + " is: ";
      alert(msg + Math.round(total_distance/1000) + " km.");


      initDatabase();
      insertRecord();
      showRecord();
    }
  }
}
