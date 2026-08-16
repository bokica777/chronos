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

type LeafletMapProps = {
  latitude: number;
  longitude: number;
  label?: string;
};

export function LeafletMap({ latitude, longitude, label }: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Kreira mapu samo jednom, pri prvom montiranju - ne pri svakoj promeni koordinata.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = L.map(containerRef.current, {
      center: [latitude, longitude],
      zoom: 15,
      scrollWheelZoom: false,
    });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    markerRef.current = L.marker([latitude, longitude], { icon: defaultIcon }).addTo(map);
    if (label) {
      markerRef.current.bindPopup(label);
    }

    return () => {
      try {
        map.remove();
      } catch {
        // Leaflet can throw mid-cleanup under React StrictMode's dev-only
        // mount->cleanup->mount double-invoke - safe to ignore here.
      }

      // Defensively clear Leaflet's own "already initialized" marker on the
      // DOM node, so the next L.map() call on it always succeeds even if
      // remove() above didn't fully finish.
      const container = containerRef.current as (HTMLDivElement & { _leaflet_id?: number }) | null;
      if (container) {
        delete container._leaflet_id;
      }

      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Kad se koordinate/labela promene, samo pomeri postojecu mapu i pin - ne pravi novu mapu.
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) {
      return;
    }

    mapRef.current.setView([latitude, longitude]);
    markerRef.current.setLatLng([latitude, longitude]);
    if (label) {
      markerRef.current.setPopupContent(label);
    }
  }, [latitude, longitude, label]);

  return <div ref={containerRef} className="location-map" role="img" aria-label={label ?? "Mapa lokacije"} />;
}
