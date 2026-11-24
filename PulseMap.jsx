import React, { useEffect } from 'react';
import { MapContainer, TileLayer, ZoomControl, Marker, Popup, useMap, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

// 1. Coordinates lookup dictionary for Indian cities
export const CITY_COORDINATES = {
  mumbai: [19.0760, 72.8777],
  delhi: [28.7041, 77.1025],
  bengaluru: [12.9716, 77.5946],
  chennai: [13.0827, 80.2707],
  kolkata: [22.5726, 88.3639],
  hyderabad: [17.3850, 78.4867],
  pune: [18.5204, 73.8567],
  ahmedabad: [23.0225, 72.5714],
  puducherry: [11.9416, 79.8083],
  national: [22.5937, 78.9629],
  india: [22.5937, 78.9629]
};

// 2. Custom Heatmap Layer using leaflet.heat
function HeatmapLayer({ points }) {
  const map = useMap();
  
  useEffect(() => {
    if (!points || points.length === 0) return;
    if (!L.heatLayer) {
      console.warn("leaflet.heat not loaded");
      return;
    }
    
    // Add heatmap layer with PULSE-R24 gradient
    const layer = L.heatLayer(points, {
      radius: 65,
      blur: 45,
      maxZoom: 8,
      max: 1.0,
      gradient: {
        0.1: "#3b82f6",
        0.3: "#eab308",
        0.5: "#f97316",
        0.7: "#ef4444",
        1.0: "#991b1b"
      }
    }).addTo(map);

    return () => {
      if (layer && map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    };
  }, [map, points]);

  return null;
}

// 3. Custom Animated Pulsing Sensor Marker
function createPulseIcon(severity) {
  const color = severity === 'critical' ? '#ef4444' : (severity === 'high' ? '#f97316' : '#eab308');
  return L.divIcon({
    className: 'custom-pulse-container',
    html: `
      <div style="position:relative; width:16px; height:16px;">
        <div style="width:16px; height:16px; background:${color}; border-radius:50%; box-shadow:0 0 10px ${color};"></div>
        <div style="position:absolute; top:0; left:0; width:16px; height:16px; background:${color}; border-radius:50%; animation: pulse-ring 1.8s infinite ease-out;"></div>
      </div>
    `,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
}

// 4. Main Exported Map Component for PULSE-R24
export default function PulseMap({ alerts = [], geoJsonData = null }) {
  // Format heatmap points [latitude, longitude, intensity]
  const heatmapPoints = alerts.map(alert => {
    const coords = alert.coords || CITY_COORDINATES[alert.city?.toLowerCase()] || CITY_COORDINATES.national;
    const intensity = alert.severity === 'critical' ? 1.0 : (alert.severity === 'high' ? 0.8 : 0.6);
    return [coords[0], coords[1], intensity];
  });

  return (
    <div className="w-full h-full relative" style={{ minHeight: '500px', background: '#090b10' }}>
      <MapContainer
        center={[22.5937, 78.9629]}
        zoom={5}
        minZoom={4}
        maxZoom={12}
        zoomControl={false}
        scrollWheelZoom={true}
        className="w-full h-full z-10"
        style={{ height: '100%', width: '100%', background: '#090b10' }}
      >
        <ZoomControl position="bottomright" />

        {/* ========================================================================= */}
        {/* CORRECTION: Switched from CARTO to OpenStreetMap                          */}
        {/* Completely resolves the "API KEY REQUIRED" error and watermark!            */}
        {/* ========================================================================= */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* GeoJSON Boundary overlay if provided */}
        {geoJsonData && (
          <GeoJSON 
            data={geoJsonData} 
            style={{ color: '#374151', weight: 1, fillOpacity: 0.05 }} 
          />
        )}

        {/* Dynamic Threat Heatmap Layer */}
        <HeatmapLayer points={heatmapPoints} />

        {/* Pulsing Sensor Alerts */}
        {alerts.map((item, idx) => {
          const coords = item.coords || CITY_COORDINATES[item.city?.toLowerCase()] || CITY_COORDINATES.national;
          return (
            <Marker key={item.id || idx} position={coords} icon={createPulseIcon(item.severity)}>
              <Popup className="pulse-intel-popup">
                <div style={{ color: '#111', fontSize: '12px' }}>
                  <strong style={{ textTransform: 'uppercase' }}>[{item.severity || 'INFO'}] {item.title}</strong>
                  <p style={{ margin: '4px 0' }}>{item.summary || item.description || ''}</p>
                  <small style={{ color: '#666' }}>Coords: {coords[0]}, {coords[1]}</small>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
