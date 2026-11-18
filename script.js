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
    isDay: 1,
    radarFrames: [],
    radarCurrentFrame: -1,
    radarPlaybackInterval: null,
    radarActiveLayer: 'radar'
};
window.state = state;

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
    aiRecommendations: document.getElementById('ai-recommendations'),
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
    DOM.searchInput.addEventListener('input', debounce(handleSearchInput, 150));
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
        if (btn && !btn.disabled && !btn.classList.contains('disabled')) {
            document.querySelectorAll('.layer-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            changeRadarLayer(btn.dataset.layer);
        }
    });
    DOM.radarPlayBtn.addEventListener('click', toggleRadarPlayback);
}

// --- Leaflet Radar ---
state.radarFrames = [];
state.radarCurrentFrame = -1; // -1 means not initialized yet
state.radarPlaybackInterval = null;
state.radarActiveLayer = 'radar';
state.radarHost = '';
state.radarMetadataCache = null;
state.radarMetadataTimestamp = 0;
state.radarRefreshInterval = null;
state.radarTileLoadState = 'idle'; // 'idle' | 'loading' | 'loaded' | 'error' | 'no-coverage'

function initLeafletRadar() {
    state.radarMap = L.map('radar-map', {
        zoomControl: true,
        attributionControl: false,
        zoomAnimation: true,
        minZoom: 3,
        maxZoom: 18,
        zoomSnap: 0.5,
        zoomDelta: 0.5,
        wheelPxPerZoomLevel: 100,
        maxBounds: [[-85, -180], [85, 180]]
    }).setView([state.lat, state.lon], 9);

    // OpenStreetMap base tile provider (publicly accessible, no API key required)
    const osmTileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const emptyTile = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

    state.baseLayer = L.tileLayer(osmTileUrl, {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxNativeZoom: 18,
        maxZoom: 18,
        className: 'osm-base-tiles',
        errorTileUrl: emptyTile
    }).addTo(state.radarMap);

    // Set up periodic metadata refresh (every 10 minutes)
    setupRadarRefresh();

    // Initial load
    loadRadarMetadata();
}

function setupRadarRefresh() {
    if (state.radarRefreshInterval) {
        clearInterval(state.radarRefreshInterval);
    }
    // Refresh metadata every 10 minutes (600,000 ms)
    state.radarRefreshInterval = setInterval(() => {
        loadRadarMetadata(true);
    }, 600000);
}

async function loadRadarMetadata(isRefresh = false) {
    const timestampEl = document.getElementById('radar-timestamp');
    const statusEl = document.getElementById('radar-status');

    // Show loading state (only on initial load, not on refresh)
    if (!isRefresh) {
        if (timestampEl) timestampEl.textContent = 'Loading radar...';
        if (statusEl) {
            statusEl.textContent = 'Loading';
            statusEl.classList.remove('hidden');
        }
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch('https://api.rainviewer.com/public/weather-maps.json', {
            signal: controller.signal,
            cache: 'no-cache'
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Store metadata
        state.radarHost = data.host || 'https://tilecache.rainviewer.com';
        state.radarFrames = data.radar.past || [];
        state.radarMetadataCache = data;
        state.radarMetadataTimestamp = Date.now();

        if (state.radarFrames.length === 0) {
            throw new Error('No radar frames available');
        }

        // Set to most recent frame
        state.radarCurrentFrame = state.radarFrames.length - 1;

        if (!isRefresh) {
            // Update timestamp display for initial load
            updateRadarTimestampDisplay();
        }

        // Apply current layer
        changeRadarLayer(state.radarActiveLayer);

        // Check coverage for current viewport
        checkRadarCoverage();

    } catch (err) {
        console.error('Failed to load radar metadata:', err);

        if (!isRefresh) {
            if (timestampEl) timestampEl.textContent = 'Failed to load radar';
            if (statusEl) {
                statusEl.textContent = 'Error';
                statusEl.classList.remove('hidden');
            }
        }

        // If we have cached data, use it
        if (state.radarMetadataCache && state.radarFrames.length > 0) {
            console.log('Using cached radar metadata');
            changeRadarLayer(state.radarActiveLayer);
            if (timestampEl) timestampEl.textContent = 'Radar unavailable (cached)';
        }
    }
}

function checkRadarCoverage() {
    const statusEl = document.getElementById('radar-status');
    if (!state.radarMap || !statusEl) return;

    if (!state.radarFrames || state.radarFrames.length === 0) {
        statusEl.textContent = 'No radar data';
        statusEl.classList.remove('hidden');
        return;
    }

    // Default to active when frames are populated; Leaflet tileload/tileerror listeners refine state dynamically
    if (state.radarLayer) {
        statusEl.textContent = 'Coverage: Active';
        statusEl.classList.remove('hidden');
    }
}

function latLngToTileCoords(lat, lng, zoom) {
    const latRad = lat * Math.PI / 180;
    const n = Math.pow(2, zoom);
    const x = Math.floor((lng + 180) / 360 * n);
    const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
    return { x, y, z: zoom };
}

function changeRadarLayer(layerType) {
    if (layerType === 'temp') {
        const timestampEl = document.getElementById('radar-timestamp');
        if (timestampEl) timestampEl.textContent = 'Temperature layer disabled (API key required)';
        showToast('Temperature radar layer is disabled (API key required).', false);
        return;
    }

    state.radarActiveLayer = layerType;

    // Clean up existing radar layer
    if (state.radarLayer) {
        state.radarMap.removeLayer(state.radarLayer);
        state.radarLayer = null;
    }

    const playbackContainer = document.getElementById('radar-playback-container');
    if (layerType === 'radar') {
        if (playbackContainer) playbackContainer.classList.remove('hidden');
        updateRadarFrame(state.radarCurrentFrame);
    } else {
        if (playbackContainer) playbackContainer.classList.add('hidden');
        stopRadarPlayback();
        const owmKey = '';
    }
}

function updateRadarFrame(index) {
    if (state.radarActiveLayer !== 'radar') return;
    if (state.radarFrames.length === 0) return;

    // Clamp index
    index = Math.max(0, Math.min(index, state.radarFrames.length - 1));

    const frame = state.radarFrames[index];
    if (!frame) return;

    // Clean up old layer
    if (state.radarLayer) {
        state.radarMap.removeLayer(state.radarLayer);
        state.radarLayer = null;
    }

    const emptyTile = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

    // Build tile URL using metadata host and frame path
    const tileUrl = `${state.radarHost}${frame.path}/256/{z}/{x}/{y}/4/1_1.png`;

    state.radarLayer = L.tileLayer(tileUrl, {
        opacity: 0.75,
        transparent: true,
        zIndex: 10,
        className: 'radar-tile-fade',
        maxNativeZoom: 7, // RainViewer's official max native zoom
        maxZoom: 18,      // Allow upscaling for higher map zoom levels
        errorTileUrl: emptyTile
    }).addTo(state.radarMap);

    // Handle tile loading events for status feedback
    let tilesLoaded = 0;
    let tilesError = 0;
    let checkedCoverage = false;

    state.radarLayer.on('tileload', () => {
        tilesLoaded++;
        if (tilesLoaded === 1 && !checkedCoverage) {
            checkedCoverage = true;
            // First tile loaded successfully - we have coverage
            const statusEl = document.getElementById('radar-status');
            if (statusEl && statusEl.textContent !== 'Coverage: Active') {
                statusEl.textContent = 'Coverage: Active';
                statusEl.classList.remove('hidden');
            }
        }
    });

    state.radarLayer.on('tileerror', (e) => {
        tilesError++;
        if (tilesError > 3 && tilesLoaded === 0) {
            // Multiple errors, no successes - likely no coverage
            const statusEl = document.getElementById('radar-status');
            if (statusEl) {
                statusEl.textContent = 'No radar coverage';
                statusEl.classList.remove('hidden');
            }
        }
    });

    state.radarCurrentFrame = index;
    updateRadarTimestampDisplay();
}

function updateRadarTimestampDisplay() {
    const timestampEl = document.getElementById('radar-timestamp');
    if (!timestampEl || state.radarFrames.length === 0) return;

    const frame = state.radarFrames[state.radarCurrentFrame];
    if (!frame || !frame.time) return;

    const date = new Date(frame.time * 1000);
    const options = {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZoneName: 'short'
    };

    timestampEl.textContent = date.toLocaleTimeString('en-GB', options) + ' UTC';
}

function toggleRadarPlayback() {
    if (state.radarPlaybackInterval) {
        stopRadarPlayback();
    } else {
        if (state.radarFrames.length <= 1) return;

        DOM.radarPlayBtn.querySelector('i').className = 'ri-pause-fill';
        state.radarPlaybackInterval = setInterval(() => {
            let nextFrame = state.radarCurrentFrame + 1;
            if (nextFrame >= state.radarFrames.length) nextFrame = 0;
            updateRadarFrame(nextFrame);
        }, 2000);
    }
}

function stopRadarPlayback() {
    if (state.radarPlaybackInterval) {
        clearInterval(state.radarPlaybackInterval);
        state.radarPlaybackInterval = null;
    }
    if (DOM.radarPlayBtn) {
        DOM.radarPlayBtn.querySelector('i').className = 'ri-play-fill';
    }
}

function toggleRadarFullscreen() {
    DOM.radarWidget.classList.toggle('fullscreen');
    setTimeout(() => {
        if (state.radarMap) {
            state.radarMap.invalidateSize();
        }
    }, 300);
}

function updateRadarLayer() {
    if (state.radarMap) {
        state.radarMap.setView([state.lat, state.lon], 7, { animate: true, duration: 1 });
        setTimeout(() => {
            state.radarMap.invalidateSize();
            // Re-check coverage for new location
            if (state.radarActiveLayer === 'radar') {
                checkRadarCoverage();
            }
        }, 300);
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (state.radarRefreshInterval) {
        clearInterval(state.radarRefreshInterval);
    }
    if (state.radarPlaybackInterval) {
        clearInterval(state.radarPlaybackInterval);
    }
});

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
    if (state.radarMap && state.radarLayer) {
        state.radarLayer.bringToFront();
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
    const savedOrder = localStorage.getItem('aero_widget_order');
    if (savedOrder && DOM.widgetContainer) {
        try {
            const order = JSON.parse(savedOrder);
            order.forEach(id => {
                const el = document.getElementById(id);
                if (el && el.parentElement === DOM.widgetContainer) {
                    DOM.widgetContainer.appendChild(el);
                }
            });
        } catch (e) { }
    }
    new Sortable(DOM.widgetContainer, {
        animation: 250,
        ghostClass: 'sortable-ghost',
        handle: '.widget-header',
        delay: 100,
        delayOnTouchOnly: true,
        onEnd: () => {
            const currentOrder = Array.from(DOM.widgetContainer.children)
                .filter(el => el.id)
                .map(el => el.id);
            localStorage.setItem('aero_widget_order', JSON.stringify(currentOrder));
        }
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
    DOM.currentIcon.style.filter = `drop-shadow(0 0 20px ${iconColor}66)`;
    DOM.currentIcon.classList.remove('hidden');

    // Update current widget accent based on condition
    DOM.currentWidget.style.borderColor = 'var(--border-emphasis)';

    // Environmental Insights (Highlights)
    DOM.envPressure.innerHTML = `${Math.round(current.surface_pressure)} <span class="unit">hPa</span>`;

    const sr = new Date(daily.sunrise[0]);
    const ss = new Date(daily.sunset[0]);
    DOM.envSunrise.textContent = `${sr.getHours()}:${sr.getMinutes().toString().padStart(2, '0')}`;
    DOM.envSunset.textContent = `${ss.getHours()}:${ss.getMinutes().toString().padStart(2, '0')}`;

    const nowHourIndex = new Date().getHours();
    const vis = Math.round((hourly.visibility[nowHourIndex] || 10000) / 1000);
    DOM.envVisibility.innerHTML = `${vis} <span class="unit">km</span>`;
    DOM.envVisStatus.textContent = vis < 2 ? 'Poor' : 'Clear';
    DOM.envDewpoint.textContent = `${Math.round(hourly.dew_point_2m[nowHourIndex] || 0)}°`;

    // AQI Dashboard - Handle missing/unavailable data gracefully
    const aqiScore = (aqiCurrent && aqiCurrent.us_aqi !== null && aqiCurrent.us_aqi !== undefined) ? Math.round(aqiCurrent.us_aqi) : null;
    if (aqiScore !== null) {
        const { label: aqiStatus, color: aqiColor, recommendation } = getAQIDetails(aqiScore);
        DOM.aqiMainScore.textContent = aqiScore;
        DOM.aqiMainStatus.textContent = aqiStatus;
        DOM.aqiMainStatus.style.color = aqiColor;
        DOM.aqiRecommendation.textContent = recommendation;

        updatePollutantBar(DOM.barPm25, DOM.valPm25, aqiCurrent.pm2_5, 50, aqiColor);
        updatePollutantBar(DOM.barPm10, DOM.valPm10, aqiCurrent.pm10, 100, aqiColor);
        updatePollutantBar(DOM.barO3, DOM.valO3, aqiCurrent.ozone, 100, aqiColor);
        updatePollutantBar(DOM.barNo2, DOM.valNo2, aqiCurrent.nitrogen_dioxide, 100, aqiColor);
    } else {
        DOM.aqiMainScore.textContent = '--';
        DOM.aqiMainStatus.textContent = 'Unavailable';
        DOM.aqiMainStatus.style.color = 'var(--fg-dim)';
        DOM.aqiRecommendation.textContent = 'Air quality data is currently unavailable for this location.';

        updatePollutantBar(DOM.barPm25, DOM.valPm25, null, 50, 'var(--fg-dim)');
        updatePollutantBar(DOM.barPm10, DOM.valPm10, null, 100, 'var(--fg-dim)');
        updatePollutantBar(DOM.barO3, DOM.valO3, null, 100, 'var(--fg-dim)');
        updatePollutantBar(DOM.barNo2, DOM.valNo2, null, 100, 'var(--fg-dim)');
    }

    // Allergy Outlook - Clearly identify unavailable pollen data
    const uvMax = daily.uv_index_max && daily.uv_index_max[0] !== null && daily.uv_index_max[0] !== undefined ? daily.uv_index_max[0] : null;
    DOM.alUv.textContent = uvMax !== null ? getUVStatus(uvMax) : 'N/A';
    DOM.alUv.style.color = (uvMax !== null && uvMax > 5) ? 'var(--accent-red)' : 'inherit';

    const dust = aqiCurrent && aqiCurrent.dust !== null && aqiCurrent.dust !== undefined ? aqiCurrent.dust : null;
    if (dust !== null) {
        DOM.alDust.textContent = dust > 50 ? 'High' : (dust > 20 ? 'Moderate' : 'Low');
        DOM.alDust.style.color = dust > 50 ? 'var(--accent-red)' : 'inherit';
    } else {
        DOM.alDust.textContent = 'N/A';
        DOM.alDust.style.color = 'var(--fg-dim)';
    }

    // Aggregate tree pollens (available in European models; identify when unavailable elsewhere)
    const hasTreeData = aqiCurrent && (aqiCurrent.alder_pollen !== null || aqiCurrent.birch_pollen !== null || aqiCurrent.olive_pollen !== null);
    if (hasTreeData) {
        const treeVal = (aqiCurrent.alder_pollen || 0) + (aqiCurrent.birch_pollen || 0) + (aqiCurrent.olive_pollen || 0);
        DOM.alTree.textContent = getPollenStatus(treeVal);
        DOM.alTree.style.color = treeVal > 50 ? 'var(--accent-amber)' : 'inherit';
    } else {
        DOM.alTree.textContent = 'N/A';
        DOM.alTree.style.color = 'var(--fg-dim)';
    }

    const hasGrassData = aqiCurrent && aqiCurrent.grass_pollen !== null && aqiCurrent.grass_pollen !== undefined;
    if (hasGrassData) {
        DOM.alGrass.textContent = getPollenStatus(aqiCurrent.grass_pollen);
        DOM.alGrass.style.color = aqiCurrent.grass_pollen > 50 ? 'var(--accent-amber)' : 'inherit';
    } else {
        DOM.alGrass.textContent = 'N/A';
        DOM.alGrass.style.color = 'var(--fg-dim)';
    }

    renderForecast(daily);
    renderChart(hourly);

    updateAIandMood(current.temperature_2m, current.weather_code, condition, aqiScore);
    updatePlaceRecommendations(state.lat, state.lon, state.city, current.temperature_2m, current.weather_code);
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
    if (val === undefined || val === null || isNaN(val)) {
        valEl.textContent = 'N/A';
        barEl.style.width = '0%';
        barEl.style.backgroundColor = 'var(--border-subtle)';
        return;
    }
    valEl.textContent = val.toFixed(1);
    let pct = Math.min((val / max) * 100, 100);
    barEl.style.width = `${pct}%`;
    barEl.style.backgroundColor = color;
}

function getAQIDetails(aqi) {
    if (aqi <= 50) return { label: 'Good', color: 'var(--accent-cyan)', recommendation: 'Air quality is excellent for outdoor activities.' };
    if (aqi <= 100) return { label: 'Moderate', color: 'var(--accent-amber)', recommendation: 'Acceptable quality. Sensitive groups should limit heavy exertion.' };
    if (aqi <= 150) return { label: 'Unhealthy (Sens)', color: 'var(--accent-amber)', recommendation: 'Sensitive groups should limit prolonged outdoor exposure.' };
    if (aqi <= 200) return { label: 'Unhealthy', color: 'var(--accent-red)', recommendation: 'Everyone may begin to experience health effects. Limit outdoors.' };
    return { label: 'Hazardous', color: 'var(--accent-red)', recommendation: 'Health warnings of emergency conditions. Avoid outdoor activities entirely.' };
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
    const rootStyles = getComputedStyle(document.documentElement);
    const color = rootStyles.getPropertyValue('--accent-cyan').trim();
    const colorDim = rootStyles.getPropertyValue('--accent-cyan-dim').trim();

    const ctx = DOM.hourlyChartCtx.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 220);
    gradient.addColorStop(0, colorDim.replace('0.12', '0.5').replace('0.1', '0.4'));
    gradient.addColorStop(1, colorDim.replace('0.12', '0').replace('0.1', '0'));

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
                pointBorderColor: isDark ? '#080a0f' : '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 20, right: 20, left: 20 } },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: isDark ? 'rgba(13, 17, 23, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                    titleColor: isDark ? '#e8ecf4' : '#0f172a',
                    bodyColor: isDark ? '#e8ecf4' : '#0f172a',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.1)',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: { label: (ctx) => `${Math.round(ctx.parsed.y)}°` }
                }
            },
            scales: {
                x: { grid: { display: false, drawBorder: false }, ticks: { color: isDark ? '#4a5a6e' : '#94a3b8', maxTicksLimit: 8, font: { family: "'Outfit', sans-serif", size: 11 } } },
                y: { display: false, min: Math.min(...temps) - 2, max: Math.max(...temps) + 5 }
            }
        },
        plugins: [{
            id: 'tempLabels',
            afterDatasetsDraw(chart) {
                const { ctx, data, scales: { x, y } } = chart;
                ctx.save();
                ctx.fillStyle = isDark ? '#e8ecf4' : '#0f172a';
                ctx.font = '500 11px "Outfit", sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';

                data.datasets[0].data.forEach((datapoint, index) => {
                    if (index % 3 === 0) {
                        const meta = chart.getDatasetMeta(0);
                        if (meta.data[index]) {
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
    const rootStyles = getComputedStyle(document.documentElement);

    // Metric-specific colors from CSS variables
    let color, labelText, suffix, colorDim;
    if (metric === 'precipitation_probability') {
        color = rootStyles.getPropertyValue('--accent-cyan').trim();
        colorDim = rootStyles.getPropertyValue('--accent-cyan-dim').trim();
        labelText = 'Rain Probability';
        suffix = '%';
    } else if (metric === 'relative_humidity_2m') {
        color = rootStyles.getPropertyValue('--accent-amber').trim();
        colorDim = rootStyles.getPropertyValue('--accent-amber-dim').trim();
        labelText = 'Humidity';
        suffix = '%';
    } else if (metric === 'wind_speed_10m') {
        color = rootStyles.getPropertyValue('--accent-cyan').trim();
        colorDim = rootStyles.getPropertyValue('--accent-cyan-dim').trim();
        labelText = 'Wind Speed';
        suffix = ' km/h';
    } else {
        color = rootStyles.getPropertyValue('--accent-cyan').trim();
        colorDim = rootStyles.getPropertyValue('--accent-cyan-dim').trim();
        labelText = 'Temperature';
        suffix = '°';
    }

    const ctx = DOM.modalTrendChartCtx.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 280);
    const dimValue = parseFloat(colorDim.match(/[\d.]+/)[0]);
    gradient.addColorStop(0, colorDim.replace(dimValue, Math.min(dimValue * 4, 0.5).toString()));
    gradient.addColorStop(1, colorDim.replace(dimValue, '0'));

    state.modalChartInstance = new Chart(DOM.modalTrendChartCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: labelText, data: dataPoints,
                borderColor: color, backgroundColor: gradient,
                borderWidth: 3, fill: true, tension: 0.4,
                pointRadius: 0, pointBackgroundColor: color, pointBorderColor: isDark ? '#080a0f' : '#ffffff', pointBorderWidth: 2,
                pointHoverRadius: 8, pointHoverBackgroundColor: color
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            layout: { padding: { top: 24, right: 20, left: 20 } },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: isDark ? 'rgba(13, 17, 23, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                    titleColor: isDark ? '#e8ecf4' : '#0f172a', bodyColor: isDark ? '#e8ecf4' : '#0f172a',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.1)', borderWidth: 1, displayColors: false,
                    padding: 12,
                    callbacks: { label: (ctx) => `${Math.round(ctx.parsed.y)}${suffix}` }
                }
            },
            scales: {
                x: { grid: { display: false, drawBorder: false }, ticks: { color: isDark ? '#4a5a6e' : '#94a3b8', maxTicksLimit: 12, font: { family: "'Outfit', sans-serif", size: 11 } } },
                y: { display: false, min: Math.min(...dataPoints) - (metric === 'temperature_2m' ? 2 : 5), max: Math.max(...dataPoints) + (metric === 'temperature_2m' ? 5 : 15) }
            }
        },
        plugins: [{
            id: 'modalLabels',
            afterDatasetsDraw(chart) {
                const { ctx, data, scales: { x, y } } = chart;
                ctx.save();
                ctx.fillStyle = isDark ? '#e8ecf4' : '#0f172a';
                ctx.font = '500 11px "Outfit", sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';

                data.datasets[0].data.forEach((datapoint, index) => {
                    if (index % 2 === 0) {
                        const meta = chart.getDatasetMeta(0);
                        if (meta.data[index]) {
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
    const isDark = state.theme === 'dark';
    let condition = 'Clear Sky';
    let iconClass = isDay ? 'ri-sun-fill' : 'ri-moon-clear-fill';
    let iconColor = isDay ? '#ffb700' : '#00d4aa';

    if (code >= 1 && code <= 3) { condition = 'Partly Cloudy'; iconClass = isDay ? 'ri-sun-cloudy-fill' : 'ri-moon-cloudy-fill'; iconColor = isDay ? '#ffb700' : '#00d4aa'; }
    else if (code === 45 || code === 48) { condition = 'Foggy'; iconClass = 'ri-mist-fill'; iconColor = isDark ? '#4a5a6e' : '#94a3b8'; }
    else if (code >= 51 && code <= 55 || code >= 80 && code <= 82) { condition = 'Drizzle'; iconClass = 'ri-drizzle-fill'; iconColor = '#00d4aa'; }
    else if (code >= 61 && code <= 65) { condition = 'Rain'; iconClass = 'ri-rainy-fill'; iconColor = '#00d4aa'; }
    else if (code >= 71 && code <= 77) { condition = 'Snow'; iconClass = 'ri-snowy-fill'; iconColor = isDark ? '#e8ecf4' : '#475569'; }
    else if (code >= 95) { condition = 'Thunderstorm'; iconClass = 'ri-thunderstorms-fill'; iconColor = '#ffb700'; }

    return { condition, iconClass, iconColor };
}

function applyTimeBasedTheme(hour) {
    let bgGrad = '';
    const isDark = state.theme === 'dark';

    if (isDark) {
        if (hour >= 5 && hour < 9) bgGrad = 'radial-gradient(circle at 50% 20%, var(--accent-amber-dim) 0%, transparent 70%)';
        else if (hour >= 9 && hour < 17) bgGrad = 'radial-gradient(circle at 50% 10%, var(--accent-cyan-dim) 0%, transparent 70%)';
        else if (hour >= 17 && hour < 20) bgGrad = 'radial-gradient(circle at 50% 30%, var(--accent-amber-dim) 0%, transparent 70%)';
        else bgGrad = 'radial-gradient(circle at 50% 10%, var(--bg-panel-subtle) 0%, transparent 70%)';
    } else {
        if (hour >= 5 && hour < 9) bgGrad = 'radial-gradient(circle at 50% 10%, var(--accent-amber-dim) 0%, transparent 70%)';
        else if (hour >= 9 && hour < 17) bgGrad = 'radial-gradient(circle at 50% 0%, var(--accent-cyan-dim) 0%, transparent 70%)';
        else if (hour >= 17 && hour < 20) bgGrad = 'radial-gradient(circle at 50% 20%, var(--accent-amber-dim) 0%, transparent 70%)';
        else bgGrad = 'radial-gradient(circle at 50% 10%, var(--bg-panel-subtle) 0%, transparent 70%)';
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

// --- Contextual Place Recommendations ---
const recommendationCache = new Map();
let recommendationAbortController = null;

// Curated geographic database of regional hubs across the world
const REGIONAL_HUBS = [
    // UK & Ireland
    { name: "Reading", region: "Berkshire", country: "United Kingdom", country_code: "GB", lat: 51.4543, lon: -0.9781 },
    { name: "Brighton", region: "East Sussex", country: "United Kingdom", country_code: "GB", lat: 50.8225, lon: -0.1372 },
    { name: "Oxford", region: "Oxfordshire", country: "United Kingdom", country_code: "GB", lat: 51.7520, lon: -1.2577 },
    { name: "Cambridge", region: "Cambridgeshire", country: "United Kingdom", country_code: "GB", lat: 52.2053, lon: 0.1218 },
    { name: "Bristol", region: "South West", country: "United Kingdom", country_code: "GB", lat: 51.4545, lon: -2.5879 },
    { name: "Bath", region: "Somerset", country: "United Kingdom", country_code: "GB", lat: 51.3811, lon: -2.3590 },
    { name: "Southampton", region: "Hampshire", country: "United Kingdom", country_code: "GB", lat: 50.9097, lon: -1.4044 },
    { name: "Birmingham", region: "West Midlands", country: "United Kingdom", country_code: "GB", lat: 52.4862, lon: -1.8904 },
    { name: "Manchester", region: "Greater Manchester", country: "United Kingdom", country_code: "GB", lat: 53.4808, lon: -2.2426 },
    { name: "Liverpool", region: "Merseyside", country: "United Kingdom", country_code: "GB", lat: 53.4084, lon: -2.9916 },
    { name: "Leeds", region: "West Yorkshire", country: "United Kingdom", country_code: "GB", lat: 53.8008, lon: -1.5491 },
    { name: "Newcastle", region: "Tyne and Wear", country: "United Kingdom", country_code: "GB", lat: 54.9783, lon: -1.6178 },
    { name: "Edinburgh", region: "Scotland", country: "United Kingdom", country_code: "GB", lat: 55.9533, lon: -3.1883 },
    { name: "Glasgow", region: "Scotland", country: "United Kingdom", country_code: "GB", lat: 55.8642, lon: -4.2518 },
    { name: "Dublin", region: "Leinster", country: "Ireland", country_code: "IE", lat: 53.3498, lon: -6.2603 },
    // France & Benelux
    { name: "Versailles", region: "Île-de-France", country: "France", country_code: "FR", lat: 48.8049, lon: 2.1204 },
    { name: "Rouen", region: "Normandy", country: "France", country_code: "FR", lat: 49.4432, lon: 1.0999 },
    { name: "Reims", region: "Grand Est", country: "France", country_code: "FR", lat: 49.2583, lon: 4.0317 },
    { name: "Orléans", region: "Centre-Val de Loire", country: "France", country_code: "FR", lat: 47.9029, lon: 1.9093 },
    { name: "Lille", region: "Hauts-de-France", country: "France", country_code: "FR", lat: 50.6292, lon: 3.0573 },
    { name: "Lyon", region: "Auvergne-Rhône-Alpes", country: "France", country_code: "FR", lat: 45.7640, lon: 4.8357 },
    { name: "Marseille", region: "Provence-Alpes-Côte d'Azur", country: "France", country_code: "FR", lat: 43.2965, lon: 5.3698 },
    { name: "Nice", region: "Provence-Alpes-Côte d'Azur", country: "France", country_code: "FR", lat: 43.7102, lon: 7.2620 },
    { name: "Brussels", region: "Brussels", country: "Belgium", country_code: "BE", lat: 50.8503, lon: 4.3517 },
    { name: "Antwerp", region: "Flanders", country: "Belgium", country_code: "BE", lat: 51.2194, lon: 4.4025 },
    { name: "Amsterdam", region: "North Holland", country: "Netherlands", country_code: "NL", lat: 52.3676, lon: 4.9041 },
    { name: "Rotterdam", region: "South Holland", country: "Netherlands", country_code: "NL", lat: 51.9244, lon: 4.4777 },
    { name: "Utrecht", region: "Utrecht", country: "Netherlands", country_code: "NL", lat: 52.0907, lon: 5.1214 },
    // Germany, Switzerland, Austria
    { name: "Potsdam", region: "Brandenburg", country: "Germany", country_code: "DE", lat: 52.3906, lon: 13.0645 },
    { name: "Frankfurt", region: "Hesse", country: "Germany", country_code: "DE", lat: 50.1109, lon: 8.6821 },
    { name: "Cologne", region: "North Rhine-Westphalia", country: "Germany", country_code: "DE", lat: 50.9375, lon: 6.9603 },
    { name: "Düsseldorf", region: "North Rhine-Westphalia", country: "Germany", country_code: "DE", lat: 51.2277, lon: 6.7735 },
    { name: "Munich", region: "Bavaria", country: "Germany", country_code: "DE", lat: 48.1351, lon: 11.5820 },
    { name: "Augsburg", region: "Bavaria", country: "Germany", country_code: "DE", lat: 48.3705, lon: 10.8978 },
    { name: "Zurich", region: "Zurich", country: "Switzerland", country_code: "CH", lat: 47.3769, lon: 8.5417 },
    { name: "Geneva", region: "Geneva", country: "Switzerland", country_code: "CH", lat: 46.2044, lon: 6.1432 },
    { name: "Vienna", region: "Vienna", country: "Austria", country_code: "AT", lat: 48.2082, lon: 16.3738 },
    // Italy & Spain
    { name: "Rome", region: "Lazio", country: "Italy", country_code: "IT", lat: 41.9028, lon: 12.4964 },
    { name: "Milan", region: "Lombardy", country: "Italy", country_code: "IT", lat: 45.4642, lon: 9.1900 },
    { name: "Florence", region: "Tuscany", country: "Italy", country_code: "IT", lat: 43.7696, lon: 11.2558 },
    { name: "Naples", region: "Campania", country: "Italy", country_code: "IT", lat: 40.8518, lon: 14.2681 },
    { name: "Madrid", region: "Madrid", country: "Spain", country_code: "ES", lat: 40.4168, lon: -3.7038 },
    { name: "Toledo", region: "Castilla-La Mancha", country: "Spain", country_code: "ES", lat: 39.8628, lon: -4.0273 },
    { name: "Barcelona", region: "Catalonia", country: "Spain", country_code: "ES", lat: 41.3879, lon: 2.1699 },
    { name: "Valencia", region: "Valencia", country: "Spain", country_code: "ES", lat: 39.4699, lon: -0.3763 },
    { name: "Seville", region: "Andalusia", country: "Spain", country_code: "ES", lat: 37.3891, lon: -5.9845 },
    // USA & Canada
    { name: "Jersey City", region: "New Jersey", country: "United States", country_code: "US", lat: 40.7178, lon: -74.0431 },
    { name: "Newark", region: "New Jersey", country: "United States", country_code: "US", lat: 40.7357, lon: -74.1724 },
    { name: "Philadelphia", region: "Pennsylvania", country: "United States", country_code: "US", lat: 39.9526, lon: -75.1652 },
    { name: "Boston", region: "Massachusetts", country: "United States", country_code: "US", lat: 42.3601, lon: -71.0589 },
    { name: "Washington DC", region: "District of Columbia", country: "United States", country_code: "US", lat: 38.9072, lon: -77.0369 },
    { name: "Baltimore", region: "Maryland", country: "United States", country_code: "US", lat: 39.2904, lon: -76.6122 },
    { name: "Chicago", region: "Illinois", country: "United States", country_code: "US", lat: 41.8781, lon: -87.6298 },
    { name: "Milwaukee", region: "Wisconsin", country: "United States", country_code: "US", lat: 43.0389, lon: -87.9065 },
    { name: "Los Angeles", region: "California", country: "United States", country_code: "US", lat: 34.0522, lon: -118.2437 },
    { name: "Long Beach", region: "California", country: "United States", country_code: "US", lat: 33.7701, lon: -118.1937 },
    { name: "San Diego", region: "California", country: "United States", country_code: "US", lat: 32.7157, lon: -117.1611 },
    { name: "San Francisco", region: "California", country: "United States", country_code: "US", lat: 37.7749, lon: -122.4194 },
    { name: "San Jose", region: "California", country: "United States", country_code: "US", lat: 37.3382, lon: -121.8863 },
    { name: "Seattle", region: "Washington", country: "United States", country_code: "US", lat: 47.6062, lon: -122.3321 },
    { name: "Portland", region: "Oregon", country: "United States", country_code: "US", lat: 45.5152, lon: -122.6784 },
    { name: "Toronto", region: "Ontario", country: "Canada", country_code: "CA", lat: 43.6532, lon: -79.3832 },
    { name: "Mississauga", region: "Ontario", country: "Canada", country_code: "CA", lat: 43.5890, lon: -79.6441 },
    { name: "Hamilton", region: "Ontario", country: "Canada", country_code: "CA", lat: 43.2557, lon: -79.8711 },
    // Japan & East Asia
    { name: "Yokohama", region: "Kanagawa", country: "Japan", country_code: "JP", lat: 35.4437, lon: 139.6380 },
    { name: "Chiba", region: "Chiba", country: "Japan", country_code: "JP", lat: 35.6074, lon: 140.1065 },
    { name: "Saitama", region: "Saitama", country: "Japan", country_code: "JP", lat: 35.8617, lon: 139.6455 },
    { name: "Kamakura", region: "Kanagawa", country: "Japan", country_code: "JP", lat: 35.3197, lon: 139.5467 },
    { name: "Osaka", region: "Osaka", country: "Japan", country_code: "JP", lat: 34.6937, lon: 135.5023 },
    { name: "Kyoto", region: "Kyoto", country: "Japan", country_code: "JP", lat: 35.0116, lon: 135.7681 },
    { name: "Kobe", region: "Hyogo", country: "Japan", country_code: "JP", lat: 34.6901, lon: 135.1955 },
    { name: "Seoul", region: "Seoul", country: "South Korea", country_code: "KR", lat: 37.5665, lon: 126.9780 },
    { name: "Incheon", region: "Incheon", country: "South Korea", country_code: "KR", lat: 37.4563, lon: 126.7052 },
    // India
    { name: "Thane", region: "Maharashtra", country: "India", country_code: "IN", lat: 19.2183, lon: 72.9781 },
    { name: "Navi Mumbai", region: "Maharashtra", country: "India", country_code: "IN", lat: 19.0330, lon: 73.0297 },
    { name: "Pune", region: "Maharashtra", country: "India", country_code: "IN", lat: 18.5204, lon: 73.8567 },
    { name: "Noida", region: "Uttar Pradesh", country: "India", country_code: "IN", lat: 28.5355, lon: 77.3910 },
    { name: "Gurgaon", region: "Haryana", country: "India", country_code: "IN", lat: 28.4595, lon: 77.0266 },
    { name: "Faridabad", region: "Haryana", country: "India", country_code: "IN", lat: 28.4089, lon: 77.3178 },
    { name: "Chennai", region: "Tamil Nadu", country: "India", country_code: "IN", lat: 13.0827, lon: 80.2707 },
    { name: "Coimbatore", region: "Tamil Nadu", country: "India", country_code: "IN", lat: 11.0168, lon: 76.9558 },
    { name: "Mysore", region: "Karnataka", country: "India", country_code: "IN", lat: 12.2958, lon: 76.6394 },
    { name: "Bangalore", region: "Karnataka", country: "India", country_code: "IN", lat: 12.9716, lon: 77.5946 },
    // Australia
    { name: "Wollongong", region: "New South Wales", country: "Australia", country_code: "AU", lat: -34.4278, lon: 150.8931 },
    { name: "Newcastle", region: "New South Wales", country: "Australia", country_code: "AU", lat: -32.9283, lon: 151.7817 },
    { name: "Central Coast", region: "New South Wales", country: "Australia", country_code: "AU", lat: -33.3210, lon: 151.3414 },
    { name: "Canberra", region: "Australian Capital Territory", country: "Australia", country_code: "AU", lat: -35.2809, lon: 149.1300 },
    { name: "Geelong", region: "Victoria", country: "Australia", country_code: "AU", lat: -38.1499, lon: 144.3617 },
    // Middle East
    { name: "Sharjah", region: "Sharjah", country: "United Arab Emirates", country_code: "AE", lat: 25.3573, lon: 55.4033 },
    { name: "Abu Dhabi", region: "Abu Dhabi", country: "United Arab Emirates", country_code: "AE", lat: 24.4539, lon: 54.3773 },
    { name: "Ajman", region: "Ajman", country: "United Arab Emirates", country_code: "AE", lat: 25.4052, lon: 55.5136 }
];

function calculateHaversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
}

async function updatePlaceRecommendations(lat, lon, currentCity, currentTemp, currentCode) {
    if (!DOM.aiRecommendations) return;

    const cacheKey = `${lat.toFixed(2)}_${lon.toFixed(2)}`;
    if (recommendationCache.has(cacheKey)) {
        renderPlaceRecommendations(recommendationCache.get(cacheKey));
        return;
    }

    if (recommendationAbortController) {
        recommendationAbortController.abort();
    }
    recommendationAbortController = new AbortController();

    // 1. Calculate distances to regional hubs
    let candidates = REGIONAL_HUBS
        .map(h => ({ ...h, distance: calculateHaversineKm(lat, lon, h.lat, h.lon) }))
        .filter(h => h.distance >= 12 && h.distance <= 350)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3);

    // If fewer than 2 hubs within 350km, expand to 800km
    if (candidates.length < 2) {
        const expanded = REGIONAL_HUBS
            .map(h => ({ ...h, distance: calculateHaversineKm(lat, lon, h.lat, h.lon) }))
            .filter(h => h.distance >= 12 && h.distance <= 800)
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 3);
        candidates = [...candidates, ...expanded.filter(e => !candidates.some(c => c.name === e.name))].slice(0, 3);
    }

    if (candidates.length === 0) {
        DOM.aiRecommendations.innerHTML = '';
        DOM.aiRecommendations.classList.add('hidden');
        return;
    }

    try {
        // Query Open-Meteo in a SINGLE parallel batch request
        const lats = candidates.map(c => c.lat).join(',');
        const lons = candidates.map(c => c.lon).join(',');
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,apparent_temperature,precipitation,weather_code&forecast_days=1`;

        const res = await fetch(url, { signal: recommendationAbortController.signal });
        const data = await res.json();
        const resultsArray = Array.isArray(data) ? data : [data];

        const recommendations = candidates.map((cand, idx) => {
            const w = resultsArray[idx]?.current || {};
            const temp = Math.round(w.temperature_2m || 0);
            const code = w.weather_code || 0;
            const { condition, iconClass, iconColor } = getWeatherIconData(code, 1);

            // Contextual comparison reason based on actual data
            let reason = `${cand.distance} km away`;
            const tempDiff = temp - Math.round(currentTemp);

            if (currentCode >= 51 && code < 51) {
                reason = "☀️ Drier skies · No rain";
            } else if (tempDiff >= 3) {
                reason = `🌡️ +${tempDiff}°C warmer · Pleasant`;
            } else if (tempDiff <= -3 && currentTemp > 28) {
                reason = `🍃 ${Math.abs(tempDiff)}°C cooler · Refreshing`;
            } else if (code <= 2) {
                reason = `🌤️ Clear/mild · ${condition}`;
            } else {
                reason = `📍 ${condition} · ${cand.distance} km`;
            }

            return {
                name: cand.name,
                region: cand.region,
                country: cand.country,
                lat: cand.lat,
                lon: cand.lon,
                distance: cand.distance,
                temp,
                condition,
                iconClass,
                iconColor,
                reason
            };
        });

        recommendationCache.set(cacheKey, recommendations);
        renderPlaceRecommendations(recommendations);
    } catch (err) {
        if (err.name === 'AbortError') return;
        console.warn('Place recommendations fetch skipped:', err);
    }
}

function renderPlaceRecommendations(items) {
    if (!DOM.aiRecommendations) return;
    if (!items || items.length === 0) {
        DOM.aiRecommendations.innerHTML = '';
        DOM.aiRecommendations.classList.add('hidden');
        return;
    }

    DOM.aiRecommendations.classList.remove('hidden');
    DOM.aiRecommendations.innerHTML = `
        <div class="ai-rec-title"><i class="ri-compass-3-line"></i> Recommended Nearby Places</div>
    `;

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'ai-rec-item';
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('title', `View weather in ${item.name}`);
        card.innerHTML = `
            <div class="ai-rec-info">
                <div class="ai-rec-header">
                    <span class="ai-rec-name">${item.name}</span>
                    <span class="ai-rec-distance">${item.distance} km</span>
                </div>
                <span class="ai-rec-reason">${item.reason}</span>
            </div>
            <div class="ai-rec-weather" style="color: ${item.iconColor}">
                <i class="${item.iconClass}"></i>
                <span>${item.temp}°</span>
            </div>
        `;
        card.addEventListener('click', () => {
            fetchWeatherData(item.lat, item.lon, item.name);
        });
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fetchWeatherData(item.lat, item.lon, item.name);
            }
        });
        DOM.aiRecommendations.appendChild(card);
    });
}

// --- Search & Geolocation ---
const suggestionsCache = new Map();
let searchAbortController = null;

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
    if (query.length === 0) {
        closeSuggestions();
        return;
    }

    // Check contextual matches first:
    const lower = query.toLowerCase();
    const contextualMatches = [];

    // 1. Current City if matches query
    if (state.city && state.city.toLowerCase().startsWith(lower)) {
        contextualMatches.push({
            name: state.city,
            admin1: "Current Selection",
            country: "",
            country_code: "",
            latitude: state.lat,
            longitude: state.lon,
            population: 10000000
        });
    }

    // 2. Saved favorites matching query
    try {
        const savedFavs = JSON.parse(localStorage.getItem('aero_favorites') || '[]');
        savedFavs.forEach(fav => {
            if (fav.name && fav.name.toLowerCase().startsWith(lower) && !contextualMatches.some(m => m.name === fav.name)) {
                contextualMatches.push({
                    name: fav.name,
                    admin1: "Saved Favorite",
                    country: "",
                    country_code: "",
                    latitude: fav.lat,
                    longitude: fav.lon,
                    population: 9000000
                });
            }
        });
    } catch (_) {}

    // 3. Nearby regional hubs matching query
    REGIONAL_HUBS.forEach(hub => {
        if ((hub.name.toLowerCase().startsWith(lower) || (hub.region && hub.region.toLowerCase().startsWith(lower))) &&
            !contextualMatches.some(m => m.name === hub.name)) {
            const dist = calculateHaversineKm(state.lat, state.lon, hub.lat, hub.lon);
            contextualMatches.push({
                name: hub.name,
                admin1: `${hub.region} (${dist} km)`,
                country: hub.country,
                country_code: hub.country_code,
                latitude: hub.lat,
                longitude: hub.lon,
                population: Math.max(0, 5000000 - dist * 1000)
            });
        }
    });

    if (contextualMatches.length > 0) {
        state.searchSuggestionsData = contextualMatches.slice(0, 6);
        renderSuggestions(query);
    }

    // Trigger fast Open-Meteo geocoding lookup
    fetchSuggestions(query);
}

// --- Utilities for Search ---
function getFlagEmoji(countryCode) {
    if (!countryCode) return '';
    return countryCode.toUpperCase().replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397));
}

async function fetchSuggestions(query) {
    const trimmed = query.trim();
    if (!trimmed) return;
    const cacheKey = trimmed.toLowerCase();

    // Serve from cache if already fetched
    if (suggestionsCache.has(cacheKey)) {
        const cached = suggestionsCache.get(cacheKey);
        if (cached && cached.length > 0) {
            state.searchSuggestionsData = cached;
            renderSuggestions(trimmed);
        } else if (!state.searchSuggestionsData || state.searchSuggestionsData.length === 0) {
            showNoSuggestions();
        }
        return;
    }

    // Cancel any previous pending request to prevent lag and stale results
    if (searchAbortController) {
        searchAbortController.abort();
    }
    searchAbortController = new AbortController();

    try {
        // High-speed Open-Meteo Geocoding API (30-80ms response time)
        const res = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=10&language=en&format=json`,
            { signal: searchAbortController.signal }
        );
        const data = await res.json();

        if (data && data.results && data.results.length > 0) {
            const unique = [];
            const seen = new Set();
            for (const city of data.results) {
                const key = `${city.name}-${city.admin1 || ''}-${city.country || ''}`.toLowerCase();
                if (!seen.has(key)) {
                    seen.add(key);
                    unique.push({
                        name: city.name,
                        admin1: city.admin1 || '',
                        country: city.country || '',
                        country_code: city.country_code || '',
                        latitude: city.latitude,
                        longitude: city.longitude,
                        population: city.population || 0
                    });
                }
            }

            // Smart ranking: prioritize major cities by population for short queries (< 4 chars)
            // and prevent small hamlets (< 50k) from displacing major global metropolises (> 500k)
            const lowerQuery = trimmed.toLowerCase();
            unique.sort((a, b) => {
                const aName = a.name.toLowerCase();
                const bName = b.name.toLowerCase();
                const aPop = a.population || 0;
                const bPop = b.population || 0;

                // For short prefix queries, large metropolitan population wins
                if (lowerQuery.length < 4) {
                    const popDiff = bPop - aPop;
                    if (Math.abs(popDiff) > 100000) return popDiff;
                }

                // If one is exact match and other is prefix match
                const aExact = aName === lowerQuery ? 1 : 0;
                const bExact = bName === lowerQuery ? 1 : 0;
                if (aExact !== bExact) {
                    if (aExact && aPop < 50000 && bPop > 500000) return 1;
                    if (bExact && bPop < 50000 && aPop > 500000) return -1;
                    return bExact - aExact;
                }

                const aPrefix = aName.startsWith(lowerQuery) ? 1 : 0;
                const bPrefix = bName.startsWith(lowerQuery) ? 1 : 0;
                if (aPrefix !== bPrefix) return bPrefix - aPrefix;

                return bPop - aPop;
            });

            const results = unique.slice(0, 6);
            suggestionsCache.set(cacheKey, results);
            state.searchSuggestionsData = results;
            renderSuggestions(trimmed);
            return;
        }

        // Fallback to Nominatim for obscure settlements/villages if Open-Meteo returns empty
        if (trimmed.length >= 2) {
            const nomRes = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmed)}&format=json&addressdetails=1&limit=6&accept-language=en`,
                { signal: searchAbortController.signal }
            );
            const nomData = await nomRes.json();
            if (nomData && nomData.length > 0) {
                const unique = [];
                const seen = new Set();
                for (const item of nomData) {
                    const name = item.name || item.address?.city || item.address?.town || item.address?.village || trimmed;
                    const admin1 = item.address?.state || item.address?.county || '';
                    const country = item.address?.country || '';
                    const key = `${name}-${admin1}-${country}`.toLowerCase();
                    if (!seen.has(key)) {
                        seen.add(key);
                        unique.push({
                            name,
                            admin1,
                            country,
                            country_code: item.address?.country_code || '',
                            latitude: parseFloat(item.lat),
                            longitude: parseFloat(item.lon)
                        });
                    }
                }
                const results = unique.slice(0, 6);
                suggestionsCache.set(cacheKey, results);
                state.searchSuggestionsData = results;
                renderSuggestions(trimmed);
                return;
            }
        }

        if (!state.searchSuggestionsData || state.searchSuggestionsData.length === 0) {
            showNoSuggestions();
        }
    } catch (error) {
        if (error.name === 'AbortError') return;
        console.error('Error fetching suggestions:', error);
    }
}

function showNoSuggestions() {
    DOM.searchSuggestions.innerHTML = '<div class="suggestion-item"><span style="color:var(--fg-dim); padding: 8px;">No locations found</span></div>';
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
        const highlightedName = city.name.replace(regex, '<span style="color:var(--accent-cyan); font-weight:700;">$1</span>');

        div.innerHTML = `
            <i class="ri-map-pin-2-fill location-pin"></i> 
            <div style="flex:1; display:flex; flex-direction:column; gap:2px; overflow:hidden;">
                <span style="font-size:0.95rem; font-weight:500; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">${highlightedName}</span>
                <small style="color:var(--fg-muted); font-size:0.75rem; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">${region}${city.country}</small>
            </div>
            <span style="font-size: 1.3rem; padding-left: 8px;">${flag}</span>
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
    }, 150);
}

async function fetchCoordinates(city) {
    try {
        // Fast Open-Meteo Geocoding
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=5&language=en&format=json`);
        const data = await res.json();

        if (data && data.results && data.results.length > 0) {
            const lowerQuery = city.toLowerCase();
            const sorted = data.results.sort((a, b) => {
                const aName = a.name.toLowerCase();
                const bName = b.name.toLowerCase();
                const aPop = a.population || 0;
                const bPop = b.population || 0;
                if (lowerQuery.length < 4) {
                    const popDiff = bPop - aPop;
                    if (Math.abs(popDiff) > 100000) return popDiff;
                }
                const aExact = aName === lowerQuery ? 1 : 0;
                const bExact = bName === lowerQuery ? 1 : 0;
                if (aExact !== bExact) {
                    if (aExact && aPop < 50000 && bPop > 500000) return 1;
                    if (bExact && bPop < 50000 && aPop > 500000) return -1;
                    return bExact - aExact;
                }
                return bPop - aPop;
            });
            const loc = sorted[0];
            DOM.searchInput.value = '';
            fetchWeatherData(loc.latitude, loc.longitude, loc.name);
            return;
        }

        // Fallback to Nominatim
        const nomRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&addressdetails=1&limit=5&accept-language=en`);
        const nomData = await nomRes.json();
        if (nomData && nomData.length > 0) {
            const loc = nomData[0];
            const locName = loc.name || loc.address?.city || loc.address?.town || loc.address?.village || city;
            DOM.searchInput.value = '';
            fetchWeatherData(parseFloat(loc.lat), parseFloat(loc.lon), locName);
        } else {
            showNotFound();
        }
    } catch (error) {
        showNotFound();
    }
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
