/**
 * Init openstreetmap
 */
var map = L.map('map').setView([48.52, 2.19], 5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
}).addTo(map);

/**
 * Disable form submit
 */
document.getElementsByTagName('form')[0].addEventListener('submit', e => e.preventDefault());

/**
 * Find place by name
 * 
 * @param {string} name 
 * @returns array of locations or null
 */
async function findByName(name) {
    if (name.length >= 3) {
      return (await apiCall('https://photon.komoot.io/api/?q=' + name)).features;
    }
}

/**
 * Find place by coordinates
 * 
 * @param {array} coord 
 * @returns one location or null
 */
async function findByCoord(coord) {
    if (coord) {
        return (await apiCall('https://photon.komoot.io/reverse?lon='+ coord.lng +'&lat='+ coord.lat+'&limit=1')).features[0];
    }
}

/**
 * Timer for Api call
 * 
 * @param {function} callback 
 * @param {number} delay 
 * @returns callback return
 */
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
const autocompleteList = autocomplete.querySelector('#autocomplete ul');
autocompleteList.addEventListener("click", clickOnSuggest);

/**
 * Event on map click
 * 
 * @param {event} e 
 */
async function clickOnSuggest(e) {
    let element;

    if (e.path[1].querySelector('strong')) {
        return
    } else if (e.path[0].querySelector('span') == null) {
        element = e.path[1];
    } else {
        element = e.path[0];
    }

    element.querySelector('span').remove()
    makeMarker(element.dataset.lat, element.dataset.lng, element.textContent, true);
    addWeather(await callWeather(element.dataset.lat, element.dataset.lng));
    document.getElementById('search').value = element.textContent;
    removeAutocomplete();
}

/**
 * Hide Autocomplete 
 */
function removeAutocomplete() {
    autocomplete.classList.add('hide');
}

/**
 * Add autocomplete
 * 
 * @param {array} results 
 */
function addAutocomplete(results) {

    if (results && results.length > 0) {
        autocompleteList.innerHTML = '';

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
            return li;
        });
        autocompleteList.append(...suggests);
        autocomplete.classList.remove('hide');
    } else if (results && results.length == 0) {
        autocompleteList.innerHTML = '<p><strong>Aucun résultats</strong></p>';
        autocomplete.classList.remove('hide');
    } else {
        removeAutocomplete()
    }
}

/**
 * Add Listner on form and function on input change
 * 
 */
document.getElementById('search').addEventListener('input', debounce(async function(){
    removeAutocomplete();
    const result = await findByName(this.value)
    addAutocomplete(result);
}, 500));

/*
marker on map
*/

/**
 * On map click event
 * 
 * @param {event} e 
 */
async function onMapClick(e) {
    removeAutocomplete();
    const result = await findByCoord(e.latlng)
    let name;
    if (result) {
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


/**
 * Add marker on map
 * 
 * @param {float} lat 
 * @param {float} lng 
 * @param {string} name 
 * @param {bool} zoom 
 */
function makeMarker(lat, lng, name, zoom) {
    if (marker) {
        map.removeLayer(marker)
    }
    marker = new L.marker({lon: lng, lat: lat}).addTo(map);

    if (zoom) {
        map.setView({lon: lng, lat: lat}, 15)
    }

    marker.bindPopup(name).openPopup();
}

/**
 * Add Listner on map
 */
map.addEventListener('click', onMapClick);

/**
 * Call an API
 * 
 * @param {string} url 
 * @returns result 
 */
async function apiCall(url) {
    spinner(true);

    return await fetch(url, { method: 'GET', mode: 'cors'})
    .then(function(response) {
        spinner(false);
        if (response.ok) {
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
 * Call openweathermap api
 * 
 * @param {float} lat 
 * @param {float} lng 
 * @returns array
 */
 async function callWeather(lat, lng) {
    return await apiCall('https://api.openweathermap.org/data/2.5/weather?lat='+ lat +'&lon='+ lng +'&appid=6f369add17e725b5dc06197f846dc38a&units=metric&lang=fr')
}

/**
 * Add display of weather
 * 
 * @param {array} location 
 */
function addWeather(location) {
    let weather = document.getElementById('weather');
    weather.innerHTML = '<ul><li>'+ location.main.temp +' °C</li><li><img src="http://openweathermap.org/img/wn/'+ location.weather[0].icon +'@2x.png" alt="'+ location.weather[0].description +'"></li><li>'+ location.weather[0].description +'</li></ul>';
}

/**
 * Display error message
 * 
 * @param {string} message 
 */
function sendError(message) {
    if (marker) {
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

/**
 * Add spinenr
 * 
 * @param {bool} active 
 */
function spinner(active) {
    let loader = document.createElement('div');

    if (active) {
        loader.classList.add('loader');
        document.body.appendChild(loader);
    } else {
        let loaders = document.querySelectorAll(".loader");
        loaders.forEach(loader => {
            loader.remove();
        });
    }
}

/**
 * navigator location success
 * 
 * @param {array} pos 
 */
async function navigatorSuccess(pos) {
    const result = await findByCoord({lat: pos.coords.latitude, lng : pos.coords.longitude})
    let name;
    if (result) {
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

/**
 * navigator location error
 * 
 * @param {array} err
 */
function navigatorError(err) {
    sendError(err.message);
}

/**
 * call api navigator location
 */
navigator.geolocation.getCurrentPosition(navigatorSuccess, navigatorError, {enableHighAccuracy: true, timeout: 5000, maximumAge: 0});
