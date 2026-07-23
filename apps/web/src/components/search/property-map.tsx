"use client";

import type { SearchResultItem } from "@/components/search/property-results-list";
import { formatCurrency } from "@aurora/core";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import { useEffect, useRef } from "react";

interface PropertyMapProps {
  results: SearchResultItem[];
  onPropertyClick?: (attomId: string) => void;
  onPolygonChange?: (polygon: Array<{ lat: number; lng: number }> | null) => void;
  selectedId?: string | null;
  center?: [number, number];
  className?: string;
}

function shortPrice(value: number | null): string {
  if (value == null) return "—";
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return formatCurrency(value);
}

export function PropertyMap({
  results,
  onPropertyClick,
  onPolygonChange,
  selectedId,
  center = [-89.65, 39.78],
  className,
}: PropertyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const onPropertyClickRef = useRef(onPropertyClick);
  const onPolygonChangeRef = useRef(onPolygonChange);

  useEffect(() => {
    onPropertyClickRef.current = onPropertyClick;
  }, [onPropertyClick]);

  useEffect(() => {
    onPolygonChangeRef.current = onPolygonChange;
  }, [onPolygonChange]);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!containerRef.current || !token || token.includes("your_mapbox")) {
      return;
    }

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center,
      zoom: 11,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true,
      },
    });

    map.addControl(draw, "bottom-right");
    mapRef.current = map;
    drawRef.current = draw;

    map.on("load", () => {
      map.addSource("properties", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "properties",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step",
            ["get", "point_count"],
            "#93c5fd",
            5,
            "#3b82f6",
            15,
            "#1d4ed8",
          ],
          "circle-radius": ["step", ["get", "point_count"], 18, 5, 24, 15, 30],
        },
      });

      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "properties",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-size": 12,
          "text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
        },
        paint: { "text-color": "#ffffff" },
      });

      map.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: "properties",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": [
            "case",
            ["==", ["get", "selected"], 1],
            "#1d4ed8",
            "#2563eb",
          ],
          "circle-radius": [
            "case",
            ["==", ["get", "selected"], 1],
            10,
            7,
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      map.addLayer({
        id: "unclustered-label",
        type: "symbol",
        source: "properties",
        filter: ["!", ["has", "point_count"]],
        layout: {
          "text-field": ["get", "priceShort"],
          "text-size": 11,
          "text-offset": [0, -1.6],
          "text-anchor": "bottom",
          "text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
        },
        paint: {
          "text-color": "#0f172a",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.5,
        },
      });

      map.on("click", "clusters", (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ["clusters"],
        });
        const clusterId = features[0]?.properties?.cluster_id;
        if (clusterId == null) return;

        const source = map.getSource("properties") as mapboxgl.GeoJSONSource;
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err || zoom == null) return;
          const geometry = features[0]?.geometry;
          if (geometry?.type === "Point") {
            map.easeTo({
              center: geometry.coordinates as [number, number],
              zoom,
            });
          }
        });
      });

      map.on("click", "unclustered-point", (e) => {
        const feature = e.features?.[0];
        const attomId = feature?.properties?.attomId as string | undefined;
        if (attomId) onPropertyClickRef.current?.(attomId);
      });

      map.on("click", "unclustered-label", (e) => {
        const feature = e.features?.[0];
        const attomId = feature?.properties?.attomId as string | undefined;
        if (attomId) onPropertyClickRef.current?.(attomId);
      });

      map.on("mouseenter", "unclustered-point", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "unclustered-point", () => {
        map.getCanvas().style.cursor = "";
      });

      function updatePolygon() {
        const data = draw.getAll();
        const polygon = data.features[0]?.geometry;
        if (polygon?.type === "Polygon") {
          const coords = polygon.coordinates[0]
            ?.filter(
              (point): point is [number, number] =>
                point[0] != null && point[1] != null,
            )
            .map(([lng, lat]) => ({ lat, lng }));
          onPolygonChangeRef.current?.(coords ?? null);
        }
      }

      map.on("draw.create", updatePolygon);
      map.on("draw.update", updatePolygon);
      map.on("draw.delete", () => onPolygonChangeRef.current?.(null));
    });

    return () => {
      map.remove();
      mapRef.current = null;
      drawRef.current = null;
    };
    // center only used for initial map — avoid remount loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      const source = map.getSource("properties") as mapboxgl.GeoJSONSource | undefined;
      if (!source) return;

      const demoCoords: Record<string, [number, number]> = {
        "demo-1001": [-89.6501, 39.7817],
        "demo-1002": [-77.0365, 38.8977],
        "demo-1003": [-106.6504, 35.0844],
        "demo-1004": [-158.0001, 21.4389],
        "demo-1005": [-73.9857, 40.7484],
      };

      const featuresWithCoords = results.map((result, index) => {
        const coords: [number, number] =
          result.latitude && result.longitude
            ? [result.longitude, result.latitude]
            : (demoCoords[result.attomId] ?? [
                center[0] + index * 0.01,
                center[1] + index * 0.005,
              ]);

        return {
          type: "Feature" as const,
          properties: {
            attomId: result.attomId,
            price: formatCurrency(result.estimatedValue),
            priceShort: shortPrice(result.estimatedValue),
            score: result.score ?? 0,
            selected: selectedId === result.attomId ? 1 : 0,
          },
          geometry: {
            type: "Point" as const,
            coordinates: coords,
          },
        };
      });

      source.setData({
        type: "FeatureCollection",
        features: featuresWithCoords,
      });

      if (featuresWithCoords.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        featuresWithCoords.forEach((f) => {
          const [lng, lat] = f.geometry.coordinates as [number, number];
          bounds.extend([lng, lat]);
        });
        map.fitBounds(bounds, { padding: 80, maxZoom: 14 });
      }
    };

    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [results, center, selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const selected = results.find((r) => r.attomId === selectedId);
    if (!selected?.latitude || !selected.longitude) return;
    map.easeTo({
      center: [selected.longitude, selected.latitude],
      zoom: Math.max(map.getZoom(), 14),
    });
  }, [selectedId, results]);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token || token.includes("your_mapbox")) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-100 p-6 text-center text-sm text-slate-500">
        Set NEXT_PUBLIC_MAPBOX_TOKEN to enable the map. Search results still
        appear in the list.
      </div>
    );
  }

  return <div ref={containerRef} className={className ?? "h-full w-full"} />;
}

interface SinglePropertyMapProps {
  latitude: number;
  longitude: number;
  label?: string;
}

export function SinglePropertyMap({
  latitude,
  longitude,
  label,
}: SinglePropertyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!containerRef.current || !token || token.includes("your_mapbox")) {
      return;
    }

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [longitude, latitude],
      zoom: 15,
    });

    new mapboxgl.Marker().setLngLat([longitude, latitude]).addTo(map);

    if (label) {
      new mapboxgl.Popup({ offset: 24 })
        .setText(label)
        .setLngLat([longitude, latitude])
        .addTo(map);
    }

    return () => map.remove();
  }, [latitude, longitude, label]);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token || token.includes("your_mapbox")) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500 ring-1 ring-slate-200">
        Map unavailable — configure Mapbox token
      </div>
    );
  }

  return <div ref={containerRef} className="h-64 w-full rounded-lg" />;
}
