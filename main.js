/*
init map
*/
var map = L.map('map').setView([48.52, 2.19], 5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
}).addTo(map);

/*
search form
*/

// Disable form submit
document.getElementsByTagName('form')[0].addEventListener('submit', e => e.preventDefault());

async function findByName(name) {
    if (name.length >= 3) {
      return (await apiCall('https://photon.komoot.io/api/?q=' + name)).features;
    }
}

async function findByCoord(coord) {
    if (coord) {
        return (await apiCall('https://photon.komoot.io/reverse?lon='+ coord.lng +'&lat='+ coord.lat+'&limit=1')).features[0];
    }
}


function debounce(callback, delay){
    var timer;
    return function(){
        var args = arguments;
        var context = this;
        clearTimeout(timer);
        timer = setTimeout(function(){
            callback.apply(context, args);
        }, delay)
    }
}

const autocomplete = document.getElementById('autocomplete');

async function clickOnSuggest() {
    this.querySelector('span').remove()
    makeMarker(this.dataset.lat, this.dataset.lng, this.textContent, true);
    addWeather(await callWeather(this.dataset.lat, this.dataset.lng));
    document.getElementById('search').value = this.textContent;
    removeAutocomplete();
}

function removeAutocomplete() {
    autocomplete.classList.add('hide');

    autocomplete.querySelectorAll('li').forEach(element => {
        element.removeEventListener("click", clickOnSuggest);
    });
    
    if (autocomplete.querySelector('ul')) {
        autocomplete.querySelector('ul').remove();
    }
}


function addAutocomplete(results) {
    if(results) {
        autocomplete.classList.remove('hide');

        let ul = document.createElement('ul');

        let suggests = results.map(result => {
            let li = document.createElement('li');
            let span = document.createElement('span');

            span.textContent = result.properties.osm_value;

            if (result.properties.city) {
                li.textContent = result.properties.city;
            } else {
                li.textContent = result.properties.name;
            }
            li.dataset.lng = result.geometry.coordinates[0];
            li.dataset.lat = result.geometry.coordinates[1];

            li.append(span)
            li.addEventListener("click", clickOnSuggest);
            return li;
        });
        ul.append(...suggests);
        autocomplete.append(ul);
    } else {
        removeAutocomplete()
    }
}

document.getElementById('search').addEventListener('input', debounce(async function(){
    removeAutocomplete();

    const result = await findByName(this.value)
    addAutocomplete(result);
}, 500));

/*
marker on map
*/
async function onMapClick(e) {
    removeAutocomplete();
    const result = await findByCoord(e.latlng)
    let name;
    if (result){
        if (result.properties.city) {
            name = result.properties.city
        } else {
            name = result.properties.name
        }

        makeMarker(e.latlng.lat, e.latlng.lng, name, false);
        addWeather(await callWeather(e.latlng.lat, e.latlng.lng))
    } else {
        sendError('zone non couverte');
    }
}

let marker;
function makeMarker(lat, lng, name, replace) {
    if(marker) {
        map.removeLayer(marker)
    }
    marker = new L.marker({lon: lng, lat: lat}).addTo(map);

    if(replace) {
        map.setView({lon: lng, lat: lat}, 15)
    }

    marker.bindPopup(name).openPopup();
}

map.addEventListener('click', onMapClick);

/*
apiCall function
*/
async function apiCall(url) {
    spinner(true);

    return await fetch(url, { method: 'GET', mode: 'cors'})
    .then(function(response) {
        spinner(false);
        if(response.ok) {
            return response.json()
        } else {
            sendError(response.statusText);
        }
    })
    .catch(function(error) {
        spinner(false);
        sendError(error.message)
    });

}


/**
 * openweathermap
 */
 async function callWeather(lat, lng) {
    return await apiCall('https://api.openweathermap.org/data/2.5/weather?lat='+ lat +'&lon='+ lng +'&appid=6f369add17e725b5dc06197f846dc38a&units=metric&lang=fr')
}

function addWeather(result) {
    let weather = document.getElementById('weather');
    weather.innerHTML = '<ul><li>'+ result.main.temp +' °C</li><li><img src="http://openweathermap.org/img/wn/'+ result.weather[0].icon +'@2x.png" alt="'+ result.weather[0].description +'"></li><li>'+ result.weather[0].description +'</li></ul>';
}

function sendError(message) {
    if(marker) {
        map.removeLayer(marker)
    }
    removeAutocomplete();
    document.getElementById('weather').innerHTML='';

    let error = document.createElement('p');
    error.classList.add('error');
    error.innerHTML = message;
    document.body.appendChild(error);

    setTimeout(function(){
        error.remove()
    }, 2000);
}

function spinner(active) {
    let loader = document.createElement('div');

    if(active) {
        loader.classList.add('loader');
        document.body.appendChild(loader);
    } else {
        let loaders = document.querySelectorAll(".loader");
        loaders.forEach(loader => {
            loader.remove();
        });
    }
}


var options = {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0
  };
  
async function success(pos) {
    const result = await findByCoord({lat: pos.coords.latitude, lng : pos.coords.longitude})
    let name;
    if (result){
        if (result.properties.city) {
            name = result.properties.city
        } else {
            name = result.properties.name
        }

        makeMarker(pos.coords.latitude, pos.coords.longitude, name, true);
        addWeather(await callWeather(pos.coords.latitude, pos.coords.longitude))
    } else {
        sendError('zone non couverte');
    }
  }
  
  function error(err) {
    sendError(err.code + ' : ' +  err.message);
  }

navigator.geolocation.getCurrentPosition(success, error, options);