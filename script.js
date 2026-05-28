/**
 * Aero Weather Dashboard v3
 * Features: Open-Meteo API, Chart.js, tsParticles, SortableJS, Web Speech API, Leaflet.js Radar, AQI, Allergies, Immersive Mode
 */

// --- State & Config ---
const state = {
    city: 'London',
    lat: 51.5085,
    lon: -0.1257,
    isCelsius: true,
    theme: 'dark',
    favorites: JSON.parse(localStorage.getItem('aero_favorites')) || [],
    chartInstance: null,
    modalChartInstance: null,
    radarMap: null,
    radarLayer: null,
    searchActiveIndex: -1,
    searchSuggestionsData: [],
    
    hourlyData: null,
    dailyData: null,
    selectedDayIndex: 0,
    modalActiveMetric: 'temperature_2m',
    
    currentWeatherCode: 0,
    isDay: 1
};

// --- DOM Elements ---
const DOM = {
    searchForm: document.getElementById('search-form'),
    searchInput: document.getElementById('search-input'),
    searchSuggestions: document.getElementById('search-suggestions'),
    voiceBtn: document.getElementById('voice-btn'),
    locationBtn: document.getElementById('location-btn'),
    unitToggle: document.getElementById('unit-toggle'),
    themeToggle: document.getElementById('theme-toggle'),
    
    // Time & Greeting
    currentTime: document.getElementById('current-time'),
    currentAmpm: document.getElementById('current-ampm'),
    currentDate: document.getElementById('current-date'),
    greetingText: document.getElementById('greeting-text'),
    greetingIcon: document.getElementById('greeting-icon'),
    
    // AI & Mood
    aiSuggestion: document.getElementById('ai-suggestion'),
    moodQuote: document.getElementById('mood-quote'),
    favoritesList: document.getElementById('favorites-list'),
    
    // Main Dashboard
    widgetContainer: document.getElementById('widget-container'),
    skeletons: document.querySelectorAll('.skeleton-container'),
    
    // Current Weather
    locationName: document.getElementById('location-name'),
    locationCoords: document.getElementById('location-coords'),
    favoriteBtn: document.getElementById('favorite-btn'),
    currentTemp: document.getElementById('current-temp'),
    feelsLikeTemp: document.getElementById('feels-like-temp'),
    currentIcon: document.getElementById('current-icon'),
    currentCondition: document.getElementById('current-condition'),
    currentWidget: document.getElementById('current-widget'),
    
    // Forecast
    forecastList: document.getElementById('forecast-list'),
    
    // AQI
    aqiMainScore: document.getElementById('aqi-main-score'),
    aqiMainStatus: document.getElementById('aqi-main-status'),
    aqiRecommendation: document.getElementById('aqi-recommendation'),
    barPm25: document.getElementById('bar-pm25'), valPm25: document.getElementById('val-pm25'),
    barPm10: document.getElementById('bar-pm10'), valPm10: document.getElementById('val-pm10'),
    barO3: document.getElementById('bar-o3'), valO3: document.getElementById('val-o3'),
    barNo2: document.getElementById('bar-no2'), valNo2: document.getElementById('val-no2'),
    
    // Allergies
    alTree: document.getElementById('al-tree'),
    alGrass: document.getElementById('al-grass'),
    alDust: document.getElementById('al-dust'),
    alUv: document.getElementById('al-uv'),
    
    // Env Insights
    envSunrise: document.getElementById('env-sunrise'),
    envSunset: document.getElementById('env-sunset'),
    envPressure: document.getElementById('env-pressure'),
    envDewpoint: document.getElementById('env-dewpoint'),
    envVisibility: document.getElementById('env-visibility'),
    envVisStatus: document.getElementById('env-vis-status'),
    
    // Chart
    hourlyChartCtx: document.getElementById('hourly-chart'),
    
    // Radar
    radarPlayBtn: document.getElementById('radar-play'),
    
    // Toast
    toast: document.getElementById('toast'),
    toastMsg: document.getElementById('toast-message'),
    toastRetry: document.getElementById('toast-retry'),
    
    // Background
    dynamicBg: document.getElementById('dynamic-bg'),

    // Radar
    radarPlayBtn: document.getElementById('radar-play'),
    radarFullscreenBtn: document.getElementById('radar-fullscreen-btn'),
    radarLayerMenu: document.getElementById('radar-layer-menu'),
    radarLayerMenu: document.getElementById('radar-layer-menu'),
    radarWidget: document.getElementById('radar-widget'),
    radarMapWrapper: document.getElementById('radar-map-wrapper'),
    
    // Modal
    trendModal: document.getElementById('trend-modal'),
    closeModalBtn: document.getElementById('close-modal-btn'),
    modalDayName: document.getElementById('modal-day-name'),
    modalDateText: document.getElementById('modal-date-text'),
    modalTrendChartCtx: document.getElementById('modal-trend-chart'),
    hourlyTimeline: document.getElementById('hourly-timeline'),
    hourlyGrid: document.getElementById('hourly-grid'),
    graphControls: document.getElementById('graph-controls')
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initUnits();
    initClock();
    initSortable();
    initLeafletRadar();
    loadLastSearch();
    renderFavorites();
    fetchWeatherData(state.lat, state.lon, state.city);
    
    setupEventListeners();
});

function setupEventListeners() {
    DOM.searchForm.addEventListener('submit', handleSearch);
    DOM.searchInput.addEventListener('input', debounce(handleSearchInput, 600));
    DOM.searchInput.addEventListener('keydown', handleSearchKeydown);
    DOM.locationBtn.addEventListener('click', getUserLocation);
    DOM.voiceBtn.addEventListener('click', startVoiceSearch);
    DOM.unitToggle.addEventListener('click', toggleUnits);
    DOM.themeToggle.addEventListener('click', toggleTheme);
    DOM.favoriteBtn.addEventListener('click', toggleFavorite);
    DOM.toastRetry.addEventListener('click', () => fetchWeatherData(state.lat, state.lon, state.city));
    
    // Modal events
    DOM.closeModalBtn.addEventListener('click', closeModal);
    DOM.trendModal.addEventListener('click', (e) => {
        if (e.target === DOM.trendModal) closeModal();
    });
    
    // Modal metric toggle
    DOM.graphControls.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            document.querySelectorAll('#graph-controls button').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            state.modalActiveMetric = e.target.dataset.metric;
            renderModalChart();
        }
    });

    document.addEventListener('click', (e) => {
        if (!DOM.searchForm.contains(e.target)) {
            closeSuggestions();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeSuggestions();
            DOM.searchInput.blur();
            closeModal();
            if (DOM.radarWidget.classList.contains('fullscreen')) toggleRadarFullscreen();
        }
    });

    // Radar Events
    DOM.radarFullscreenBtn.addEventListener('click', toggleRadarFullscreen);
    DOM.radarLayerMenu.addEventListener('click', (e) => {
        const btn = e.target.closest('.layer-btn');
        if (btn) {
            document.querySelectorAll('.layer-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            changeRadarLayer(btn.dataset.layer);
        }
    });
    DOM.radarPlayBtn.addEventListener('click', toggleRadarPlayback);
}

// --- Leaflet Radar ---
state.radarFrames = [];
state.radarCurrentFrame = 10;
state.radarPlaybackInterval = null;
state.radarActiveLayer = 'radar';

function initLeafletRadar() {
    state.radarMap = L.map('radar-map', {
        zoomControl: true,
        attributionControl: false,
        zoomAnimation: true,
        minZoom: 3,
        maxZoom: 18, // Increased zoom depth for street-level exploration
        zoomSnap: 0.5,
        zoomDelta: 0.5,
        wheelPxPerZoomLevel: 100, // Smoother interpolation on scroll
        maxBounds: [[-85, -180], [85, 180]]
    }).setView([state.lat, state.lon], 9); 
    
    const isDark = state.theme === 'dark';
    const tileUrl = isDark ? 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png' : 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png';
    
    const emptyTile = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    
    state.baseLayer = L.tileLayer(tileUrl, { 
        maxNativeZoom: 10,
        maxZoom: 18, // High resolution base tiles
        errorTileUrl: emptyTile
    }).addTo(state.radarMap);
    
    loadRainViewerData();
}

async function loadRainViewerData() {
    try {
        const response = await fetch('https://api.rainviewer.com/public/weather-maps.json');
        const data = await response.json();
        state.radarFrames = data.radar.past;
        state.radarFrames = data.radar.past;
        state.radarCurrentFrame = state.radarFrames.length - 1;
        
        changeRadarLayer(state.radarActiveLayer);
    } catch (err) {
        console.error("Failed to load radar data", err);
    }
}

function changeRadarLayer(layerType) {
    state.radarActiveLayer = layerType;
    if (state.radarLayer) {
        state.radarMap.removeLayer(state.radarLayer);
    }

    const emptyTile = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

    if (layerType === 'radar') {
        document.getElementById('radar-playback-container').classList.remove('hidden');
        updateRadarFrame(state.radarCurrentFrame);
    } else {
        document.getElementById('radar-playback-container').classList.add('hidden');
        stopRadarPlayback();
        
        const owmKey = '9fd7a449d055dba26a982a3220f32aa2';
        
        state.radarLayer = L.tileLayer(`https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${owmKey}`, {
            opacity: 0.65,
            transparent: true,
            zIndex: 10,
            maxNativeZoom: 4, // Extremely safe limit to avoid any "Zoom level not supported" tile images
            maxZoom: 18, 
            className: 'radar-tile-fade',
            errorTileUrl: emptyTile
        }).addTo(state.radarMap);
    }
}

function updateRadarFrame(index) {
    if (state.radarActiveLayer !== 'radar') return;
    if (state.radarLayer) {
        state.radarMap.removeLayer(state.radarLayer);
    }
    const frame = state.radarFrames[index];
    if (!frame) return;
    
    const emptyTile = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    
    state.radarLayer = L.tileLayer(`https://tilecache.rainviewer.com${frame.path}/256/{z}/{x}/{y}/4/1_1.png`, {
        opacity: 0.75,
        transparent: true,
        zIndex: 10,
        className: 'radar-tile-fade',
        maxNativeZoom: 8, // Very safe threshold. RainViewer sometimes returns "Zoom level not supported" images at zoom >8 in certain regions
        maxZoom: 18, 
        errorTileUrl: emptyTile
    }).addTo(state.radarMap);
    
    state.radarCurrentFrame = index;
}

function toggleRadarPlayback() {
    if (state.radarPlaybackInterval) {
        stopRadarPlayback();
    } else {
        DOM.radarPlayBtn.querySelector('i').className = 'ri-pause-fill';
        state.radarPlaybackInterval = setInterval(() => {
            let nextFrame = state.radarCurrentFrame + 1;
            if (nextFrame >= state.radarFrames.length) nextFrame = 0;
            updateRadarFrame(nextFrame);
        }, 2000);
    }
}

function stopRadarPlayback() {
    clearInterval(state.radarPlaybackInterval);
    state.radarPlaybackInterval = null;
    if(DOM.radarPlayBtn) DOM.radarPlayBtn.querySelector('i').className = 'ri-play-fill';
}

function toggleRadarFullscreen() {
    DOM.radarWidget.classList.toggle('fullscreen');
    setTimeout(() => {
        state.radarMap.invalidateSize();
    }, 300);
}

function updateRadarLayer() {
    if (state.radarMap) {
        state.radarMap.setView([state.lat, state.lon], 7, { animate: true, duration: 1 });
        setTimeout(() => state.radarMap.invalidateSize(), 300);
    }
}

// --- Local Storage & Settings ---
function initTheme() {
    const savedTheme = localStorage.getItem('aero_theme');
    if (savedTheme) {
        state.theme = savedTheme;
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeIcon();
    }
}

function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    localStorage.setItem('aero_theme', state.theme);
    updateThemeIcon();
    applyTimeBasedTheme(new Date().getHours());
    if (state.radarMap) {
        if (state.baseLayer) state.radarMap.removeLayer(state.baseLayer);
        const tileUrl = state.theme === 'dark' ? 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png' : 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png';
        const emptyTile = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
        state.baseLayer = L.tileLayer(tileUrl, { maxNativeZoom: 10, maxZoom: 18, errorTileUrl: emptyTile }).addTo(state.radarMap);
        if (state.radarLayer) state.radarLayer.bringToFront();
    }
}

function updateThemeIcon() {
    DOM.themeToggle.querySelector('i').className = state.theme === 'dark' ? 'ri-moon-clear-fill' : 'ri-sun-fill';
}

function initUnits() {
    const savedUnits = localStorage.getItem('aero_units');
    if (savedUnits) {
        state.isCelsius = savedUnits === 'C';
        updateUnitToggleUI();
    }
}

function toggleUnits() {
    state.isCelsius = !state.isCelsius;
    localStorage.setItem('aero_units', state.isCelsius ? 'C' : 'F');
    updateUnitToggleUI();
    fetchWeatherData(state.lat, state.lon, state.city);
}

function updateUnitToggleUI() {
    const spans = DOM.unitToggle.querySelectorAll('span');
    if (state.isCelsius) {
        spans[0].classList.add('active'); spans[1].classList.remove('active');
    } else {
        spans[0].classList.remove('active'); spans[1].classList.add('active');
    }
}

function loadLastSearch() {
    const lastCity = localStorage.getItem('aero_last_city');
    const lastLat = localStorage.getItem('aero_last_lat');
    const lastLon = localStorage.getItem('aero_last_lon');
    if (lastCity && lastLat && lastLon) {
        state.city = lastCity; state.lat = parseFloat(lastLat); state.lon = parseFloat(lastLon);
    }
}

function saveLastSearch() {
    localStorage.setItem('aero_last_city', state.city);
    localStorage.setItem('aero_last_lat', state.lat);
    localStorage.setItem('aero_last_lon', state.lon);
}

// --- Sortable & Particles ---
function initSortable() {
    new Sortable(DOM.widgetContainer, {
        animation: 250, ghostClass: 'sortable-ghost', handle: '.widget-header', delay: 100, delayOnTouchOnly: true
    });
}



// --- Date & Time ---
function getCityTime() {
    if (state.utcOffsetSeconds === undefined) return new Date();
    const d = new Date();
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    return new Date(utc + (1000 * state.utcOffsetSeconds));
}

function initClock() {
    state.updateTime = () => {
        const now = getCityTime();
        let hours = now.getHours();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12; 
        const minutes = now.getMinutes().toString().padStart(2, '0');
        
        DOM.currentTime.textContent = `${hours}:${minutes}`;
        DOM.currentAmpm.textContent = ampm;
        
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        DOM.currentDate.textContent = now.toLocaleDateString('en-US', options);
        
        let currentHour = now.getHours();
        let greeting = 'Good Morning';
        let icon = 'ri-sun-line';
        if (currentHour >= 5 && currentHour < 12) { greeting = 'Good Morning ☀️'; icon = 'ri-sun-line'; }
        else if (currentHour >= 12 && currentHour < 17) { greeting = 'Good Afternoon 🌤️'; icon = 'ri-sun-cloudy-line'; }
        else if (currentHour >= 17 && currentHour < 20) { greeting = 'Good Evening 🌇'; icon = 'ri-moon-cloudy-line'; }
        else { greeting = 'Good Night 🌙'; icon = 'ri-moon-line'; }
        
        if (!state.isDay && currentHour >= 5 && currentHour < 20) icon = 'ri-moon-line';
        
        DOM.greetingText.textContent = greeting;
        DOM.greetingIcon.className = icon;
        
        applyTimeBasedTheme(currentHour);
    };
    
    state.updateTime();
    setInterval(state.updateTime, 60000);
}

// --- API Fetching ---
async function fetchWeatherData(lat, lon, cityName) {
    setLoading(true);
    DOM.toast.classList.remove('show');
    try {
        const tempUnit = state.isCelsius ? 'celsius' : 'fahrenheit';
        const windUnit = 'kmh'; 
        
        const [weatherRes, aqiRes] = await Promise.all([
            fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,wind_speed_10m,apparent_temperature,weather_code,is_day,dew_point_2m,visibility&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max&timezone=auto&temperature_unit=${tempUnit}&wind_speed_unit=${windUnit}`),
            fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone,dust,alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen&timezone=auto`)
        ]);

        if (!weatherRes.ok || !aqiRes.ok) throw new Error('API Request Failed');
        
        const weatherData = await weatherRes.json();
        const aqiData = await aqiRes.json();
        
        state.city = cityName || 'Unknown Location';
        state.lat = lat;
        state.lon = lon;
        state.utcOffsetSeconds = weatherData.utc_offset_seconds;
        state.currentWeatherCode = weatherData.current.weather_code;
        state.isDay = weatherData.current.is_day;
        
        if (state.updateTime) state.updateTime();
        
        state.hourlyData = weatherData.hourly;
        state.dailyData = weatherData.daily;
        
        saveLastSearch();
        checkFavorite();
        
        updateUI(weatherData, aqiData);
        updateRadarLayer();
    } catch (error) {
        showToast('Unable to fetch weather data. Please try again.', true, true);
        console.error(error);
    } finally {
        setLoading(false);
    }
}

// --- Update UI ---
function updateUI(data, aqiData) {
    const current = data.current;
    const daily = data.daily;
    const hourly = data.hourly;
    const aqiCurrent = aqiData.current;
    
    const { condition, iconClass, iconColor } = getWeatherIconData(current.weather_code, current.is_day);
    
    // Main
    DOM.locationName.textContent = state.city;
    DOM.locationCoords.textContent = `Lat: ${state.lat.toFixed(2)}, Lon: ${state.lon.toFixed(2)}`;
    DOM.currentTemp.textContent = `${Math.round(current.temperature_2m)}°`;
    DOM.feelsLikeTemp.textContent = `${Math.round(current.apparent_temperature)}°`;
    DOM.currentCondition.textContent = condition;
    DOM.currentIcon.className = `animated-icon ${iconClass}`;
    DOM.currentIcon.style.color = iconColor;
    DOM.currentIcon.style.filter = `drop-shadow(0 0 25px ${iconColor}88)`;
    DOM.currentIcon.classList.remove('hidden');
    
    DOM.currentWidget.style.boxShadow = `0 15px 40px -5px ${iconColor}33`;
    DOM.currentWidget.style.background = `linear-gradient(135deg, var(--bg-glass) 0%, ${iconColor}15 50%, var(--bg-glass) 100%)`;

    // Environmental Insights (Highlights)
    DOM.envPressure.innerHTML = `${Math.round(current.surface_pressure)} <span class="unit">hPa</span>`;
    
    const sr = new Date(daily.sunrise[0]);
    const ss = new Date(daily.sunset[0]);
    DOM.envSunrise.textContent = `${sr.getHours()}:${sr.getMinutes().toString().padStart(2,'0')}`;
    DOM.envSunset.textContent = `${ss.getHours()}:${ss.getMinutes().toString().padStart(2,'0')}`;
    
    const nowHourIndex = new Date().getHours();
    const vis = Math.round((hourly.visibility[nowHourIndex] || 10000) / 1000);
    DOM.envVisibility.innerHTML = `${vis} <span class="unit">km</span>`;
    DOM.envVisStatus.textContent = vis < 2 ? 'Poor' : 'Clear';
    DOM.envDewpoint.textContent = `${Math.round(hourly.dew_point_2m[nowHourIndex] || 0)}°`;

    // AQI Dashboard
    const aqiScore = Math.round(aqiCurrent.us_aqi || 0);
    const { label: aqiStatus, color: aqiColor, recommendation } = getAQIDetails(aqiScore);
    DOM.aqiMainScore.textContent = aqiScore;
    DOM.aqiMainStatus.textContent = aqiStatus;
    DOM.aqiMainStatus.style.color = aqiColor;
    DOM.aqiRecommendation.textContent = recommendation;
    
    updatePollutantBar(DOM.barPm25, DOM.valPm25, aqiCurrent.pm2_5, 50, aqiColor);
    updatePollutantBar(DOM.barPm10, DOM.valPm10, aqiCurrent.pm10, 100, aqiColor);
    updatePollutantBar(DOM.barO3, DOM.valO3, aqiCurrent.ozone, 100, aqiColor);
    updatePollutantBar(DOM.barNo2, DOM.valNo2, aqiCurrent.nitrogen_dioxide, 100, aqiColor);

    // Allergy Outlook
    const uvMax = daily.uv_index_max[0] || 0;
    DOM.alUv.textContent = getUVStatus(uvMax);
    DOM.alUv.style.color = uvMax > 5 ? '#f87171' : 'inherit';
    
    const dust = aqiCurrent.dust || 0;
    DOM.alDust.textContent = dust > 50 ? 'High' : (dust > 20 ? 'Moderate' : 'Low');
    DOM.alDust.style.color = dust > 50 ? '#f87171' : 'inherit';
    
    // Aggregate tree pollens
    const treeVal = (aqiCurrent.alder_pollen || 0) + (aqiCurrent.birch_pollen || 0) + (aqiCurrent.olive_pollen || 0);
    DOM.alTree.textContent = getPollenStatus(treeVal);
    DOM.alTree.style.color = treeVal > 50 ? '#fb923c' : 'inherit';
    
    const grassVal = aqiCurrent.grass_pollen || 0;
    DOM.alGrass.textContent = getPollenStatus(grassVal);
    DOM.alGrass.style.color = grassVal > 50 ? '#fb923c' : 'inherit';

    renderForecast(daily);
    renderChart(hourly);

    updateAIandMood(current.temperature_2m, current.weather_code, condition, aqiScore);
    updateWeatherAtmosphere(current.weather_code, current.is_day);
}

function updateWeatherAtmosphere(code, isDay) {
    // Remove existing weather classes
    document.body.classList.remove('weather-sunny', 'weather-cloudy', 'weather-rainy', 'weather-night');
    
    // Apply new weather class based on condition
    if (!isDay) {
        document.body.classList.add('weather-night');
    } else if ((code >= 61 && code <= 65) || (code >= 80 && code <= 82) || code >= 95) {
        document.body.classList.add('weather-rainy');
    } else if ((code >= 1 && code <= 3) || code === 45 || code === 48 || (code >= 71 && code <= 77)) {
        document.body.classList.add('weather-cloudy');
    } else {
        document.body.classList.add('weather-sunny'); // Code 0 (Clear)
    }
}

function updatePollutantBar(barEl, valEl, val, max, color) {
    if (val === undefined || val === null) val = 0;
    valEl.textContent = val.toFixed(1);
    let pct = (val / max) * 100;
    if (pct > 100) pct = 100;
    barEl.style.width = `${pct}%`;
    barEl.style.backgroundColor = color;
}

function getAQIDetails(aqi) {
    if (aqi <= 50) return { label: 'Good', color: '#4ade80', recommendation: 'Air quality is excellent for outdoor activities.' };
    if (aqi <= 100) return { label: 'Moderate', color: '#facc15', recommendation: 'Acceptable quality. Sensitive groups should limit heavy exertion.' };
    if (aqi <= 150) return { label: 'Unhealthy (Sens)', color: '#fb923c', recommendation: 'Sensitive groups should limit prolonged outdoor exposure.' };
    if (aqi <= 200) return { label: 'Unhealthy', color: '#f87171', recommendation: 'Everyone may begin to experience health effects. Limit outdoors.' };
    return { label: 'Hazardous', color: '#a855f7', recommendation: 'Health warnings of emergency conditions. Avoid outdoor activities entirely.' };
}

function getPollenStatus(val) {
    if (val < 10) return 'Low';
    if (val < 50) return 'Moderate';
    if (val < 100) return 'High';
    return 'Very High';
}

function getUVStatus(uv) {
    if (uv <= 2) return 'Low';
    if (uv <= 5) return 'Moderate';
    if (uv <= 7) return 'High';
    if (uv <= 10) return 'Very High';
    return 'Extreme';
}

// --- Render Helpers ---
function renderForecast(daily) {
    DOM.forecastList.innerHTML = '';
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = 1; i <= 5; i++) {
        const date = new Date(daily.time[i]);
        const dayName = i === 1 ? 'Tmrw' : days[date.getDay()];
        const maxTemp = Math.round(daily.temperature_2m_max[i]);
        const minTemp = Math.round(daily.temperature_2m_min[i]);
        const code = daily.weather_code[i];
        
        const { iconClass, iconColor } = getWeatherIconData(code, 1);
        
        const div = document.createElement('div');
        div.className = 'forecast-item';
        div.dataset.index = i;
        div.innerHTML = `
            <p>${dayName}</p>
            <i class="${iconClass}" style="color: ${iconColor}; font-size: 2rem; filter: drop-shadow(0 0 10px ${iconColor}44);"></i>
            <span class="temp">${maxTemp}°</span>
            <span style="font-size: 0.8rem; color: var(--text-muted);">${minTemp}°</span>
        `;
        
        div.addEventListener('click', () => openModal(i));
        DOM.forecastList.appendChild(div);
    }
}

function renderChart(hourly) {
    const times = [];
    const temps = [];
    
    const nowHour = new Date().getHours();
    
    for (let i = nowHour; i < nowHour + 24; i++) {
        if (!hourly.time[i]) break;
        const t = new Date(hourly.time[i]);
        let hour = t.getHours();
        let ampm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12 || 12;
        times.push(`${hour} ${ampm}`);
        temps.push(hourly.temperature_2m[i]);
    }

    if (state.chartInstance) state.chartInstance.destroy();

    const isDark = state.theme === 'dark';
    const color = isDark ? '#5e6ad2' : '#4351b8';
    
    const ctx = DOM.hourlyChartCtx.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, isDark ? 'rgba(94, 106, 210, 0.6)' : 'rgba(67, 81, 184, 0.6)');
    gradient.addColorStop(1, isDark ? 'rgba(94, 106, 210, 0.0)' : 'rgba(67, 81, 184, 0.0)');
    
    state.chartInstance = new Chart(DOM.hourlyChartCtx, {
        type: 'line',
        data: {
            labels: times,
            datasets: [{
                label: 'Temperature',
                data: temps,
                borderColor: color,
                backgroundColor: gradient,
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: color,
                pointBorderColor: isDark ? '#1a1b20' : '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 25, right: 15, left: 15 } },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: isDark ? 'rgba(20, 20, 29, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                    titleColor: isDark ? '#ffffff' : '#1a1b20',
                    bodyColor: isDark ? '#ffffff' : '#1a1b20',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    displayColors: false,
                    callbacks: { label: (ctx) => `${Math.round(ctx.parsed.y)}°` }
                }
            },
            scales: {
                x: { grid: { display: false, drawBorder: false }, ticks: { color: '#8e95a5', maxTicksLimit: 8, font: { family: "'Outfit', sans-serif" } } },
                y: { display: false, min: Math.min(...temps) - 2, max: Math.max(...temps) + 5 }
            }
        },
        plugins: [{
            id: 'tempLabels',
            afterDatasetsDraw(chart) {
                const { ctx, data, scales: { x, y } } = chart;
                ctx.save();
                ctx.fillStyle = isDark ? '#ffffff' : '#1a1b20';
                ctx.font = '500 12px "Outfit", sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                
                data.datasets[0].data.forEach((datapoint, index) => {
                    if (index % 3 === 0) {
                        const meta = chart.getDatasetMeta(0);
                        if(meta.data[index]) {
                            const xPos = meta.data[index].x;
                            const yPos = meta.data[index].y;
                            ctx.fillText(`${Math.round(datapoint)}°`, xPos, yPos - 10);
                        }
                    }
                });
                ctx.restore();
            }
        }]
    });
}

// --- Modal & 24h Trend ---
function openModal(dayIndex) {
    state.selectedDayIndex = dayIndex;
    const date = new Date(state.dailyData.time[dayIndex]);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    DOM.modalDayName.textContent = dayIndex === 1 ? 'Tomorrow' : days[date.getDay()];
    DOM.modalDateText.textContent = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    
    document.querySelectorAll('.forecast-item').forEach(item => {
        item.classList.remove('active');
        if (parseInt(item.dataset.index) === dayIndex) item.classList.add('active');
    });

    renderModalChart();
    renderHourlyTimeline();
    
    DOM.trendModal.classList.remove('hidden');
    setTimeout(() => { DOM.trendModal.classList.add('show'); }, 10);
}

function closeModal() {
    DOM.trendModal.classList.remove('show');
    setTimeout(() => {
        DOM.trendModal.classList.add('hidden');
        document.querySelectorAll('.forecast-item').forEach(item => item.classList.remove('active'));
    }, 400); 
}

function renderHourlyTimeline() {
    DOM.hourlyTimeline.innerHTML = '';
    DOM.hourlyGrid.innerHTML = '';
    const startIndex = state.selectedDayIndex * 24;
    const endIndex = startIndex + 24;
    
    const now = getCityTime();
    
    for (let i = startIndex; i < endIndex; i++) {
        if (!state.hourlyData.time[i]) continue;
        const time = new Date(state.hourlyData.time[i]);
        const temp = Math.round(state.hourlyData.temperature_2m[i]);
        const rain = state.hourlyData.precipitation_probability[i];
        const wind = state.hourlyData.wind_speed_10m[i];
        const humidity = state.hourlyData.relative_humidity_2m[i];
        const feelsLike = Math.round(state.hourlyData.apparent_temperature[i]);
        const code = state.hourlyData.weather_code[i];
        const isDay = state.hourlyData.is_day[i];
        
        const { iconClass, iconColor } = getWeatherIconData(code, isDay);
        
        let ampm = time.getHours() >= 12 ? 'PM' : 'AM';
        let hr = time.getHours() % 12 || 12;
        
        const isActive = state.selectedDayIndex === 0 && time.getHours() === now.getHours();

        // 1. Time Pill for Horizontal Timeline
        const pill = document.createElement('div');
        pill.className = `time-pill ${isActive ? 'active' : ''}`;
        pill.innerHTML = `${hr} ${ampm}`;
        DOM.hourlyTimeline.appendChild(pill);
        
        // 2. Detailed Card for Grid
        const div = document.createElement('div');
        div.className = `hourly-item ${isActive ? 'active' : ''}`;
        
        div.innerHTML = `
            <div class="time-col">
                <span class="hr">${hr}</span><span class="ampm">${ampm}</span>
            </div>
            <i class="${iconClass}" style="color: ${iconColor}; font-size: 2.2rem; filter: drop-shadow(0 0 10px ${iconColor}66);"></i>
            <div class="temp-col">
                <h3>${temp}°</h3>
            </div>
            <div class="metrics-col">
                <span title="Feels Like"><i class="ri-temp-hot-line"></i> ${feelsLike}°</span>
                <span title="Rain Prob"><i class="ri-showers-line"></i> ${rain}%</span>
                <span title="Wind"><i class="ri-windy-line"></i> ${wind}</span>
                <span title="Humidity"><i class="ri-drop-line"></i> ${humidity}%</span>
            </div>
        `;
        DOM.hourlyGrid.appendChild(div);
        
        pill.addEventListener('click', () => {
            document.querySelectorAll('.time-pill').forEach(p => p.classList.remove('active'));
            document.querySelectorAll('.hourly-item').forEach(c => c.classList.remove('active'));
            pill.classList.add('active');
            div.classList.add('active');
            div.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            pill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        });
        
        div.addEventListener('click', () => {
            document.querySelectorAll('.time-pill').forEach(p => p.classList.remove('active'));
            document.querySelectorAll('.hourly-item').forEach(c => c.classList.remove('active'));
            pill.classList.add('active');
            div.classList.add('active');
            pill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        });
    }
}

function renderModalChart() {
    const startIndex = state.selectedDayIndex * 24;
    const endIndex = startIndex + 24;
    
    const labels = [];
    const dataPoints = [];
    const metric = state.modalActiveMetric;
    
    for (let i = startIndex; i < endIndex; i++) {
        if (!state.hourlyData.time[i]) break;
        const time = new Date(state.hourlyData.time[i]);
        let hour = time.getHours();
        let ampm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12 || 12;
        labels.push(`${hour} ${ampm}`);
        dataPoints.push(state.hourlyData[metric][i]);
    }
    
    if (state.modalChartInstance) state.modalChartInstance.destroy();

    const isDark = state.theme === 'dark';
    let color = isDark ? '#5e6ad2' : '#4351b8';
    let labelText = 'Temperature';
    let suffix = '°';
    
    if (metric === 'precipitation_probability') { color = '#4ea8de'; labelText = 'Rain Probability'; suffix = '%'; } 
    else if (metric === 'relative_humidity_2m') { color = '#ffb703'; labelText = 'Humidity'; suffix = '%'; } 
    else if (metric === 'wind_speed_10m') { color = '#a2d2ff'; labelText = 'Wind Speed'; suffix = ' km/h'; }
    
    const ctx = DOM.modalTrendChartCtx.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 250);
    let hex = color.replace('#', '');
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.6)`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.0)`);

    state.modalChartInstance = new Chart(DOM.modalTrendChartCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: labelText, data: dataPoints,
                borderColor: color, backgroundColor: gradient,
                borderWidth: 3, fill: true, tension: 0.4,
                pointRadius: 3, pointBackgroundColor: color, pointBorderColor: isDark ? '#14141d' : '#fff', pointBorderWidth: 2,
                pointHoverRadius: 8, pointHoverBackgroundColor: color
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            layout: { padding: { top: 30, right: 15, left: 15 } },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: isDark ? 'rgba(20, 20, 29, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                    titleColor: isDark ? '#ffffff' : '#1a1b20', bodyColor: isDark ? '#ffffff' : '#1a1b20',
                    borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, displayColors: false,
                    callbacks: { label: (ctx) => `${Math.round(ctx.parsed.y)}${suffix}` }
                }
            },
            scales: {
                x: { grid: { display: false, drawBorder: false }, ticks: { color: '#8e95a5', maxTicksLimit: 12, font: { family: "'Outfit', sans-serif" } } },
                y: { display: false, min: Math.min(...dataPoints) - (metric==='temperature_2m'?2:5), max: Math.max(...dataPoints) + (metric==='temperature_2m'?5:15) }
            }
        },
        plugins: [{
            id: 'modalLabels',
            afterDatasetsDraw(chart) {
                const { ctx, data, scales: { x, y } } = chart;
                ctx.save();
                ctx.fillStyle = isDark ? '#ffffff' : '#1a1b20';
                ctx.font = '500 12px "Outfit", sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                
                data.datasets[0].data.forEach((datapoint, index) => {
                    if (index % 2 === 0) {
                        const meta = chart.getDatasetMeta(0);
                        if(meta.data[index]) {
                            const xPos = meta.data[index].x;
                            const yPos = meta.data[index].y;
                            ctx.fillText(`${Math.round(datapoint)}${suffix}`, xPos, yPos - 12);
                        }
                    }
                });
                ctx.restore();
            }
        }]
    });
}

// --- Utilities ---
function getWeatherIconData(code, isDay) {
    let condition = 'Clear Sky';
    let iconClass = isDay ? 'ri-sun-fill' : 'ri-moon-clear-fill';
    let iconColor = isDay ? '#ffb703' : '#a2d2ff';

    if (code >= 1 && code <= 3) { condition = 'Partly Cloudy'; iconClass = isDay ? 'ri-sun-cloudy-fill' : 'ri-moon-cloudy-fill'; iconColor = isDay ? '#ffd166' : '#bde0fe'; } 
    else if (code === 45 || code === 48) { condition = 'Foggy'; iconClass = 'ri-mist-fill'; iconColor = '#adb5bd'; } 
    else if (code >= 51 && code <= 55 || code >= 80 && code <= 82) { condition = 'Drizzle'; iconClass = 'ri-drizzle-fill'; iconColor = '#8e9af1'; } 
    else if (code >= 61 && code <= 65) { condition = 'Rain'; iconClass = 'ri-rainy-fill'; iconColor = '#4ea8de'; } 
    else if (code >= 71 && code <= 77) { condition = 'Snow'; iconClass = 'ri-snowy-fill'; iconColor = '#e0fbfc'; } 
    else if (code >= 95) { condition = 'Thunderstorm'; iconClass = 'ri-thunderstorms-fill'; iconColor = '#7b2cbf'; }

    return { condition, iconClass, iconColor };
}

function applyTimeBasedTheme(hour) {
    let bgGrad = '';
    const isDark = state.theme === 'dark';
    
    if (isDark) {
        if (hour >= 5 && hour < 9) bgGrad = 'radial-gradient(circle at 50% 20%, rgba(255, 183, 3, 0.2) 0%, rgba(251, 133, 0, 0.1) 40%, transparent 80%)';
        else if (hour >= 9 && hour < 17) bgGrad = 'radial-gradient(circle at 50% 10%, rgba(33, 158, 188, 0.2) 0%, transparent 70%)';
        else if (hour >= 17 && hour < 20) bgGrad = 'radial-gradient(circle at 50% 30%, rgba(251, 133, 0, 0.25) 0%, rgba(217, 4, 41, 0.1) 60%, transparent 80%)';
        else bgGrad = 'radial-gradient(circle at 50% 10%, rgba(20, 33, 61, 0.6) 0%, rgba(0, 0, 0, 0.1) 80%)';
    } else {
        if (hour >= 5 && hour < 9) bgGrad = 'radial-gradient(circle at 50% 10%, rgba(255, 230, 153, 0.8) 0%, rgba(255, 204, 204, 0.4) 50%, transparent 100%)';
        else if (hour >= 9 && hour < 17) bgGrad = 'radial-gradient(circle at 50% 0%, rgba(135, 206, 250, 0.6) 0%, rgba(240, 248, 255, 0.8) 60%, transparent 100%)';
        else if (hour >= 17 && hour < 20) bgGrad = 'radial-gradient(circle at 50% 20%, rgba(255, 160, 122, 0.6) 0%, rgba(221, 160, 221, 0.4) 60%, transparent 100%)';
        else bgGrad = 'radial-gradient(circle at 50% 10%, rgba(100, 149, 237, 0.5) 0%, rgba(230, 230, 250, 0.8) 80%)';
    }
    
    DOM.dynamicBg.style.background = bgGrad;
}

function updateAIandMood(temp, code, condition, aqi) {
    let aiMsg = "It's a great day to be outside!";
    if (code >= 61 && code <= 65) aiMsg = "Don't forget an umbrella if you're heading out.";
    else if (code >= 71 && code <= 77) aiMsg = "Dress warmly, it's snowing out there.";
    else if (code >= 95) aiMsg = "Thunderstorm alert! Stay indoors if possible.";
    else if (aqi > 100) aiMsg = "Air quality is degraded. Sensitive groups should stay indoors.";
    else if (temp > 30) aiMsg = "Stay hydrated, it's quite hot today.";
    else if (temp < 10) aiMsg = "A bit chilly, grab a jacket.";
    DOM.aiSuggestion.textContent = aiMsg;

    const quotes = [
        "Sunshine is delicious, rain is refreshing.",
        "Wherever you go, no matter what the weather, always bring your own sunshine.",
        "There's no such thing as bad weather, only inappropriate clothing.",
        "A smooth sea never made a skilled sailor."
    ];
    DOM.moodQuote.textContent = `"${quotes[Math.floor(Math.random() * quotes.length)]}"`;
}

// --- Search & Geolocation ---
async function handleSearch(e) {
    if (e) e.preventDefault();
    const query = DOM.searchInput.value.trim();
    if (!query) return;
    
    closeSuggestions();
    await fetchCoordinates(query);
}

function handleSearchInput(e) {
    const query = e.target.value.trim();
    state.searchActiveIndex = -1;
    if (query.length === 0) { closeSuggestions(); return; }
    if (query.length < 3) return;
    fetchSuggestions(query);
}

// --- Utilities for Search ---
function getFlagEmoji(countryCode) {
    if (!countryCode) return '';
    return countryCode.toUpperCase().replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397));
}

async function fetchSuggestions(query) {
    try {
        // Use Nominatim OpenStreetMap API for deep worldwide & Indian village coverage
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=10&accept-language=en`);
        const data = await res.json();
        
        if (data && data.length > 0) {
            // Filter to only include actual locations/settlements (avoid POIs)
            const validTypes = ['city', 'town', 'village', 'hamlet', 'suburb', 'county', 'state', 'administrative'];
            let filtered = data.filter(item => validTypes.includes(item.addresstype) || validTypes.includes(item.type));
            if (filtered.length === 0) filtered = data;

            const unique = [];
            const seen = new Set();
            for (const city of filtered) {
                const name = city.name || city.address.city || city.address.town || city.address.village || city.address.county || query;
                const stateName = city.address.state || city.address.county || city.address.region || '';
                const country = city.address.country || '';
                
                const key = `${name}-${stateName}-${country}`.toLowerCase();
                if (!seen.has(key)) {
                    seen.add(key);
                    unique.push({
                        name: name,
                        admin1: stateName,
                        country: country,
                        country_code: city.address.country_code,
                        latitude: parseFloat(city.lat),
                        longitude: parseFloat(city.lon),
                        importance: city.importance || 0
                    });
                }
            }
            
            // Prioritize by exact match first, then API importance scoring
            const lowerQuery = query.toLowerCase();
            unique.sort((a, b) => {
                const aExact = a.name.toLowerCase() === lowerQuery ? 1 : 0;
                const bExact = b.name.toLowerCase() === lowerQuery ? 1 : 0;
                if (aExact !== bExact) return bExact - aExact;
                return (b.importance || 0) - (a.importance || 0);
            });
            
            state.searchSuggestionsData = unique.slice(0, 6);
            renderSuggestions(query);
        } else {
            showNoSuggestions();
        }
    } catch (error) { console.error('Error fetching suggestions:', error); }
}

function showNoSuggestions() {
    DOM.searchSuggestions.innerHTML = '<div class="suggestion-item"><span style="color:var(--text-muted); padding: 8px;">No locations found</span></div>';
    DOM.searchSuggestions.classList.remove('hidden');
    DOM.searchSuggestions.classList.add('fade-in');
    state.searchSuggestionsData = [];
}

function renderSuggestions(query) {
    DOM.searchSuggestions.innerHTML = '';
    
    state.searchSuggestionsData.forEach((city, index) => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.dataset.index = index;
        
        const region = city.admin1 ? `${city.admin1}, ` : '';
        const flag = getFlagEmoji(city.country_code);
        
        // Highlight matching text safely
        const safeQuery = query ? query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
        const regex = new RegExp(`(${safeQuery})`, 'gi');
        const highlightedName = city.name.replace(regex, '<span style="color:var(--accent); font-weight:700;">$1</span>');

        div.innerHTML = `
            <i class="ri-map-pin-2-fill location-pin"></i> 
            <div style="flex:1; display:flex; flex-direction:column; gap:2px; overflow:hidden;">
                <span style="font-size:1rem; font-weight:500; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">${highlightedName}</span>
                <small style="color:var(--text-muted); font-size:0.8rem; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">${region}${city.country}</small>
            </div>
            <span style="font-size: 1.4rem; padding-left: 8px;">${flag}</span>
        `;
        
        // Use mousedown to prevent input blur before click registers
        div.addEventListener('mousedown', (e) => {
            e.preventDefault(); 
            selectSuggestion(index);
        });
        div.addEventListener('mouseenter', () => updateSearchSelection(index));
        DOM.searchSuggestions.appendChild(div);
    });
    
    DOM.searchSuggestions.classList.remove('hidden');
    DOM.searchSuggestions.classList.add('fade-in');
}

function handleSearchKeydown(e) {
    if (DOM.searchSuggestions.classList.contains('hidden')) return;
    const items = DOM.searchSuggestions.querySelectorAll('.suggestion-item');
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        state.searchActiveIndex = (state.searchActiveIndex + 1) % items.length;
        updateSearchSelection(state.searchActiveIndex);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        state.searchActiveIndex = (state.searchActiveIndex - 1 + items.length) % items.length;
        updateSearchSelection(state.searchActiveIndex);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (state.searchActiveIndex >= 0) selectSuggestion(state.searchActiveIndex);
        else handleSearch();
    }
}

function updateSearchSelection(index) {
    const items = DOM.searchSuggestions.querySelectorAll('.suggestion-item');
    items.forEach(item => item.classList.remove('active'));
    if (index >= 0 && items[index]) {
        items[index].classList.add('active');
        state.searchActiveIndex = index;
        items[index].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
}

function selectSuggestion(index) {
    const city = state.searchSuggestionsData[index];
    if (!city) return;
    DOM.searchInput.value = city.name;
    closeSuggestions();
    DOM.searchInput.blur();
    fetchWeatherData(city.latitude, city.longitude, city.name);
}

function closeSuggestions() {
    DOM.searchSuggestions.classList.remove('fade-in');
    DOM.searchSuggestions.classList.add('fade-out');
    setTimeout(() => {
        DOM.searchSuggestions.classList.add('hidden');
        DOM.searchSuggestions.classList.remove('fade-out');
        state.searchSuggestionsData = [];
        state.searchActiveIndex = -1;
    }, 200);
}

async function fetchCoordinates(city) {
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&addressdetails=1&limit=5&accept-language=en`);
        const data = await res.json();
        
        if (data && data.length > 0) {
            // Sort by exact match first, then importance
            const lowerQuery = city.toLowerCase();
            const sortedResults = data.sort((a, b) => {
                const aName = a.name || a.address?.city || a.address?.town || a.address?.village || "";
                const bName = b.name || b.address?.city || b.address?.town || b.address?.village || "";
                const aExact = aName.toLowerCase() === lowerQuery ? 1 : 0;
                const bExact = bName.toLowerCase() === lowerQuery ? 1 : 0;
                if (aExact !== bExact) return bExact - aExact;
                return (b.importance || 0) - (a.importance || 0);
            });
            const loc = sortedResults[0]; 
            const locName = loc.name || loc.address?.city || loc.address?.town || loc.address?.village || city;
            
            DOM.searchInput.value = '';
            fetchWeatherData(parseFloat(loc.lat), parseFloat(loc.lon), locName);
        } else {
            showNotFound();
        }
    } catch (error) { showToast('Search failed. Please try again.', true); }
}

function showNotFound() {
    DOM.searchForm.classList.add('shake');
    setTimeout(() => DOM.searchForm.classList.remove('shake'), 500);
    showToast(`City "${DOM.searchInput.value}" not found. Try checking the spelling.`, true);
}

function getUserLocation() {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                fetchWeatherData(position.coords.latitude, position.coords.longitude, 'Your Location');
            },
            () => showToast('Location access denied.', true)
        );
    } else { showToast('Geolocation not supported.', true); }
}

// --- Voice Search ---
function startVoiceSearch() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return showToast('Voice search not supported.', true);
    
    const recognition = new SpeechRecognition();
    recognition.onstart = () => { DOM.voiceBtn.style.color = '#ff3c3c'; DOM.voiceBtn.classList.add('pulse-anim'); };
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        DOM.searchInput.value = transcript;
        fetchCoordinates(transcript);
    };
    recognition.onerror = () => showToast('Voice recognition failed.', true);
    recognition.onend = () => { DOM.voiceBtn.style.color = ''; DOM.voiceBtn.classList.remove('pulse-anim'); };
    recognition.start();
}

// --- Favorites ---
function toggleFavorite() {
    const index = state.favorites.findIndex(f => f.name === state.city);
    if (index > -1) {
        state.favorites.splice(index, 1); showToast(`${state.city} removed`);
    } else {
        state.favorites.push({ name: state.city, lat: state.lat, lon: state.lon }); showToast(`${state.city} added`);
    }
    localStorage.setItem('aero_favorites', JSON.stringify(state.favorites));
    checkFavorite(); renderFavorites();
}

function checkFavorite() {
    const isFav = state.favorites.some(f => f.name === state.city);
    DOM.favoriteBtn.innerHTML = isFav ? '<i class="ri-star-fill" style="color:#ffb703; filter: drop-shadow(0 0 5px #ffb703);"></i>' : '<i class="ri-star-line"></i>';
}

function renderFavorites() {
    if (state.favorites.length === 0) { DOM.favoritesList.innerHTML = '<p class="empty-text">No favorites yet.</p>'; return; }
    DOM.favoritesList.innerHTML = '';
    state.favorites.forEach(fav => {
        const div = document.createElement('div');
        div.className = 'favorite-item';
        div.innerHTML = `<span>${fav.name}</span> <i class="ri-arrow-right-s-line"></i>`;
        div.addEventListener('click', () => fetchWeatherData(fav.lat, fav.lon, fav.name));
        DOM.favoritesList.appendChild(div);
    });
}

// --- UI Helpers ---
function setLoading(isLoading) {
    DOM.skeletons.forEach(el => {
        if (isLoading) el.classList.add('loading'); else el.classList.remove('loading');
    });
}

function showToast(msg, isError = false, showRetry = false) {
    DOM.toastMsg.textContent = msg;
    DOM.toast.style.borderLeftColor = isError ? '#ff3c3c' : '#4ade80';
    const icon = DOM.toast.querySelector('i');
    icon.className = isError ? 'ri-error-warning-line' : 'ri-checkbox-circle-line';
    icon.style.color = isError ? '#ff3c3c' : '#4ade80';
    
    if (showRetry) DOM.toastRetry.classList.remove('hidden'); else DOM.toastRetry.classList.add('hidden');

    DOM.toast.classList.add('show');
    if (!showRetry) setTimeout(() => DOM.toast.classList.remove('show'), 4000);
}



function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
