import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const defaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Novi Sad - koristi se kao pocetni centar mape kad partner jos nema sacuvanu lokaciju.
const DEFAULT_CENTER: [number, number] = [45.2671, 19.8335];

type LocationPickerMapProps = {
  latitude: number | null;
  longitude: number | null;
  onChange: (latitude: number, longitude: number) => void;
};

// Interaktivna mapa za biranje lokacije: klik na mapu (ili prevlacenje pina)
// postavlja marker i javlja nove koordinate kroz onChange. Namerno se kreira
// samo jednom pri montiranju (roditelj treba da je remontira preko `key` ako
// zeli da resetuje pocetnu poziciju), da izbegnemo isti "map already
// initialized" problem koji smo imali kod read-only LeafletMap-a.
export function LocationPickerMap({ latitude, longitude, onChange }: LocationPickerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const hasInitial = typeof latitude === "number" && typeof longitude === "number";
    const center: [number, number] = hasInitial ? [latitude as number, longitude as number] : DEFAULT_CENTER;

    const map = L.map(containerRef.current, {
      center,
      zoom: hasInitial ? 15 : 12,
      scrollWheelZoom: false,
    });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    const placeMarker = (lat: number, lng: number) => {
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
        return;
      }
      const marker = L.marker([lat, lng], { icon: defaultIcon, draggable: true }).addTo(map);
      marker.on("dragend", () => {
        const position = marker.getLatLng();
        onChangeRef.current(position.lat, position.lng);
      });
      markerRef.current = marker;
    };

    if (hasInitial) {
      placeMarker(latitude as number, longitude as number);
    }

    map.on("click", (event: L.LeafletMouseEvent) => {
      placeMarker(event.latlng.lat, event.latlng.lng);
      onChangeRef.current(event.latlng.lat, event.latlng.lng);
    });

    return () => {
      try {
        map.remove();
      } catch {
        // isto defanzivno ciscenje kao u LeafletMap.tsx
      }
      const container = containerRef.current as (HTMLDivElement & { _leaflet_id?: number }) | null;
      if (container) {
        delete container._leaflet_id;
      }
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="location-picker">
      <div ref={containerRef} className="location-map location-map--picker" role="application" aria-label="Izaberi lokaciju na mapi" />
      <p className="location-picker-hint">Klikni na mapu da postaviš lokaciju ili prevuci pin.</p>
    </div>
  );
}
