mapboxgl.accessToken =
  "pk.eyJ1IjoibmlzYW50aDIwMDciLCJhIjoiY2tuaXE5a2doMmNjZjJ6bWlweHRvMTkyaiJ9.nDUYZocGpmxWxWHLuM-hSA"
  

navigator.geolocation.getCurrentPosition(successLocation, errorLocation, {
  enableHighAccuracy: true
})

function successLocation(position) {
  setupMap([position.coords.longitude, position.coords.latitude])
}

function errorLocation() {
  setupMap([-2.24, 53.48])
}

function setupMap(center) {
  const map = new mapboxgl.Map({
    container: "map",
    style: 'mapbox://styles/mapbox/streets-v11',
    fadeDuration: 0,
    testMode: true,
    center: center,
    zoom: 12
  })

  

  var nav = new mapboxgl.NavigationControl();
  map.addControl(nav)

var directions = new MapboxDirections({
  accessToken: mapboxgl.accessToken,
  unit: "metric",
  profile: "mapbox/driving",
  alternatives: "true",
  geometries: "geojson",
});

map.scrollZoom.enable();
map.addControl(directions, "top-left");

var draw = new MapboxDraw({
    // Instead of showing all the draw tools, show only the line string and delete tools
    displayControlsDefault: false,
    controls: {
      line_string: true,
      trash: true
    },
    styles: [
      // Set the line style for the user-input coordinates
      {
        'id': 'gl-draw-line',
        'type': 'line',
        'filter': [
          'all',
          ['==', '$type', 'LineString'],
          ['!=', 'mode', 'static']
        ],
        'layout': {
          'line-cap': 'round',
          'line-join': 'round'
        },
        'paint': {
          'line-color': '#438EE4',
          'line-dasharray': [0.2, 2],
          'line-width': 2,
          'line-opacity': 0.7
        }
      },
      // Style the vertex point halos
      {
        'id': 'gl-draw-polygon-and-line-vertex-halo-active',
        'type': 'circle',
        'filter': [
          'all',
          ['==', 'meta', 'vertex'],
          ['==', '$type', 'Point'],
          ['!=', 'mode', 'static']
        ],
        'paint': {
          'circle-radius': 12,
          'circle-color': '#FFF'
        }
      },
      // Style the vertex points
      {
        'id': 'gl-draw-polygon-and-line-vertex-active',
        'type': 'circle',
        'filter': [
          'all',
          ['==', 'meta', 'vertex'],
          ['==', '$type', 'Point'],
          ['!=', 'mode', 'static']
        ],
        'paint': {
          'circle-radius': 8,
          'circle-color': '#438EE4'
        }
      }
    ]
  });

  // Add the draw tool to the map
  map.addControl(draw);

  // Add create, update, or delete actions
  map.on('draw.create', updateRoute);
  map.on('draw.update', updateRoute);
  map.on('draw.delete', removeRoute);

  // Use the coordinates you just drew to make the Map Matching API request
  function updateRoute() {
    removeRoute(); // Overwrite any existing layers

    var profile = 'driving'; // Set the profile

    // Get the coordinates
    var data = draw.getAll();
    var lastFeature = data.features.length - 1;
    var coords = data.features[lastFeature].geometry.coordinates;
    // Format the coordinates
    var newCoords = coords.join(';');
    // Set the radius for each coordinate pair to 25 meters
    var radius = [];
    coords.forEach((element) => {
      radius.push(25);
    });

    getMatch(newCoords, radius, profile);
  }

  // Make a Map Matching request
  function getMatch(coordinates, radius, profile) {
    // Separate the radiuses with semicolons
    var radiuses = radius.join(';');
    // Create the query
    var query =
      'https://api.mapbox.com/matching/v5/mapbox/' +
      profile +
      '/' +
      coordinates +
      '?geometries=geojson&radiuses=' +
      radiuses +
      '&steps=true&access_token=' +
      mapboxgl.accessToken;

    $.ajax({
      method: 'GET',
      url: query
    }).done(function (data) {
      var coords = data.matchings[0].geometry;
      // Draw the route on the map
      addRoute(coords);
      getInstructions(data.matchings[0]);
    });
  }

  function getInstructions(data) {
    // Target the sidebar to add the instructions
    var directions = document.getElementById('directions');

    var legs = data.legs;
    var tripDirections = [];
    // Output the instructions for each step of each leg in the response object
    for (var i = 0; i < legs.length; i++) {
      var steps = legs[i].steps;
      for (var j = 0; j < steps.length; j++) {
        tripDirections.push('<br><li>' + steps[j].maneuver.instruction) + '</li>';
      }
    }
    directions.innerHTML =
      '<br><h2>Trip duration: ' +
      Math.floor(data.duration / 60) +
      ' min.</h2>' +
      tripDirections;
  }

  // Draw the Map Matching route as a new layer on the map
  function addRoute(coords) {
    // If a route is already loaded, remove it
    if (map.getSource('route')) {
      map.removeLayer('route');
      map.removeSource('route');
    } else {
      map.addLayer({
        'id': 'route',
        'type': 'line',
        'source': {
          'type': 'geojson',
          'data': {
            'type': 'Feature',
            'properties': {},
            'geometry': coords
          }
        },
        'layout': {
          'line-join': 'round',
          'line-cap': 'round'
        },
        'paint': {
          'line-color': '#03AA46',
          'line-width': 8,
          'line-opacity': 0.8
        }
      });
    }
  }

  // If the user clicks the delete draw button, remove the layer if it exists
  function removeRoute() {
    if (map.getSource('route')) {
      map.removeLayer('route');
      map.removeSource('route');
    } else {
      return;
    }
  }
}