# Aero | Premium Weather Dashboard

A polished, futuristic weather dashboard that delivers real-time weather data, interactive radar, Air Quality Index (AQI), allergy outlooks, and environmental insights within a premium glassmorphism UI. 

![Aero Dashboard Preview](screenshot.png)

## 🌟 Key Features

- **Live Weather Data**: Real-time current conditions, "feels like" temperatures, and a 5-day forecast.
- **Interactive Radar**: A high-performance, dynamic weather map built from scratch using Leaflet.js with multi-layer toggles for rain and temperature.
- **24-Hour Trend Charts**: Beautiful, interactive line charts visualizing temperature trends, built with Chart.js.
- **Comprehensive Environmental Insights**: 
  - Real-time Air Quality Index (AQI) with specific pollutant breakdowns.
  - Allergy outlooks (Pollen, Dust, UV Index).
  - Metrics including sunrise/sunset times, atmospheric pressure, dew point, and visibility.
- **Premium UI/UX**: 
  - Dynamic gradient backgrounds based on time of day and weather condition.
  - Smooth microinteractions, skeleton loading shimmers, and sleek glassmorphism panels.
  - Drag-and-drop customizable widget layout powered by Sortable.js.
- **Accessible & Responsive**: Fully mobile-responsive layout and theme toggling (Light/Dark modes).
- **Voice & Geolocation**: Built-in Web Speech API for voice search and Geolocation for fetching local weather.

## 🛠️ Technology Stack

- **Frontend**: HTML5, Vanilla CSS3 (CSS Variables, Grid, Flexbox), Vanilla JavaScript
- **APIs**: [Open-Meteo](https://open-meteo.com/) (Weather & AQI), [Nominatim](https://nominatim.org/) (Geocoding), [RainViewer](https://www.rainviewer.com/) (Radar Frames)
- **Libraries**:
  - [Chart.js](https://www.chartjs.org/) (Data Visualization)
  - [Leaflet.js](https://leafletjs.com/) (Interactive Maps)
  - [SortableJS](https://sortablejs.github.io/Sortable/) (Drag and Drop)
  - [Remix Icons](https://remixicon.com/) (Typography & Icons)

## 🚀 Getting Started

No complex build tools or dependencies are required. It's built entirely with standard web technologies.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/aero-weather-dashboard.git
   cd aero-weather-dashboard
   ```

2. **Run the application locally:**
   You can run this project using any simple local HTTP server.
   
   Using Python:
   ```bash
   python -m http.server 8000
   ```
   *Then navigate to `http://localhost:8000` in your web browser.*

   Alternatively, use the **Live Server** extension in VS Code.

## 💅 Recent Refinements

The project has recently undergone a massive refinement phase focusing on:
- **Optimization & Stability**: Removal of unstable experimental UI layers and continuous particle/audio loops resulting in drastic memory footprint improvements and high FPS.
- **Microinteractions**: Added lightweight, intentional CSS transitions such as soft button hover effects, subtle hover lifts on forecast cards, and an elegant glow.
- **Graceful Loading**: Replaced abrupt rendering with premium shimmer skeleton cards that cleanly transition out as the API data loads in.

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
