import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icons (broken in Vite by default)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom colored marker icons
function createColorIcon(color) {
  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="28" height="42">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="${color}" stroke="#fff" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="5" fill="white"/>
    </svg>
  `;
  return L.divIcon({
    html: svgIcon,
    className: '',
    iconSize: [28, 42],
    iconAnchor: [14, 42],
    popupAnchor: [0, -42],
  });
}

const startIcon = createColorIcon('#22c55e');
const endIcon = createColorIcon('#ef4444');

// Auto-fit bounds component
function FitBounds({ positions }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [positions, map]);

  return null;
}

export default function RouteMap({ coordinates }) {
  // coordinates: array of { latitude, longitude, timestamp, is_anomaly, id }
  const positions = useMemo(
    () => coordinates.map(c => [c.latitude, c.longitude]),
    [coordinates]
  );

  const anomalies = useMemo(
    () => coordinates.filter(c => c.is_anomaly),
    [coordinates]
  );

  if (!coordinates || coordinates.length === 0) {
    return (
      <div className="map-container">
        <div className="empty-state">
          <div className="icon">🗺️</div>
          <h3>No Route Data</h3>
          <p>Select an employee and date to view their route</p>
        </div>
      </div>
    );
  }

  const startPos = positions[0];
  const endPos = positions[positions.length - 1];
  const center = startPos;

  return (
    <div className="map-container">
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        <FitBounds positions={positions} />

        {/* Route polyline */}
        {positions.length > 1 && (
          <Polyline positions={positions} color="#3b82f6" weight={4} opacity={0.8} />
        )}

        {/* Start marker (green) */}
        <Marker position={startPos} icon={startIcon}>
          <Popup>
            <strong>🟢 Start</strong><br />
            {coordinates[0].timestamp
              ? new Date(coordinates[0].timestamp).toLocaleTimeString()
              : 'N/A'}
          </Popup>
        </Marker>

        {/* End marker (red) */}
        {positions.length > 1 && (
          <Marker position={endPos} icon={endIcon}>
            <Popup>
              <strong>🔴 End</strong><br />
              {coordinates[coordinates.length - 1].timestamp
                ? new Date(coordinates[coordinates.length - 1].timestamp).toLocaleTimeString()
                : 'N/A'}
            </Popup>
          </Marker>
        )}

        {/* Anomaly markers (pulsing red circles) */}
        {anomalies.map((a) => (
          <CircleMarker
            key={a.id}
            center={[a.latitude, a.longitude]}
            radius={8}
            pathOptions={{
              color: '#ef4444',
              fillColor: '#ef4444',
              fillOpacity: 0.6,
              weight: 2,
            }}
          >
            <Popup>
              <strong>⚠️ Anomaly Detected</strong><br />
              Lat: {a.latitude.toFixed(5)}<br />
              Lng: {a.longitude.toFixed(5)}<br />
              Time: {a.timestamp
                ? new Date(a.timestamp).toLocaleTimeString()
                : 'N/A'}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
