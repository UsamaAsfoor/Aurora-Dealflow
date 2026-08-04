"use client";

import type { PropertyComp } from "@aurora/core";
import { formatCurrency } from "@aurora/core";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef } from "react";

type SubjectPin = {
  latitude: number;
  longitude: number;
  label?: string;
};

function shortPrice(value: number | null | undefined): string {
  if (value == null) return "—";
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return formatCurrency(value);
}

export function CompsMap({
  subject,
  comps,
  selectedId,
  onSelect,
  className,
}: {
  subject: SubjectPin;
  comps: PropertyComp[];
  selectedId?: string | null;
  onSelect?: (attomId: string) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!containerRef.current || !token || token.includes("your_mapbox")) {
      return;
    }

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [subject.longitude, subject.latitude],
      zoom: 13,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");
    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [subject.latitude, subject.longitude]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const paint = () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend([subject.longitude, subject.latitude]);

      const subjectEl = document.createElement("div");
      subjectEl.className = "comps-map-pin comps-map-pin-subject";
      subjectEl.title = subject.label ?? "Subject";
      subjectEl.innerHTML = `<span>S</span>`;
      const subjectMarker = new mapboxgl.Marker({ element: subjectEl })
        .setLngLat([subject.longitude, subject.latitude])
        .addTo(map);
      markersRef.current.push(subjectMarker);

      for (const comp of comps) {
        if (comp.latitude == null || comp.longitude == null) continue;
        bounds.extend([comp.longitude, comp.latitude]);

        const el = document.createElement("div");
        el.className =
          selectedId === comp.attomId
            ? "comps-map-pin comps-map-pin-comp comps-map-pin-selected"
            : "comps-map-pin comps-map-pin-comp";
        el.title = `${comp.address.line1} · ${shortPrice(comp.salePrice)}`;
        el.innerHTML = `<span>${shortPrice(comp.salePrice)}</span>`;
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          onSelectRef.current?.(comp.attomId);
        });

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([comp.longitude, comp.latitude])
          .setPopup(
            new mapboxgl.Popup({ offset: 18 }).setHTML(
              `<strong>${comp.address.line1}</strong><br/>${shortPrice(comp.salePrice)}${
                comp.saleDate
                  ? ` · ${new Date(comp.saleDate).toLocaleDateString()}`
                  : ""
              }`,
            ),
          )
          .addTo(map);
        markersRef.current.push(marker);
      }

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 56, maxZoom: 15 });
      }
    };

    if (map.isStyleLoaded()) paint();
    else map.once("load", paint);
  }, [comps, selectedId, subject.latitude, subject.longitude, subject.label]);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token || token.includes("your_mapbox")) {
    return (
      <div className="flex h-full min-h-[280px] items-center justify-center rounded-xl bg-[var(--color-muted)] text-sm text-[var(--color-muted-foreground)] ring-1 ring-[var(--color-border)]">
        Map unavailable — configure Mapbox token
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className ?? "h-[320px] w-full overflow-hidden rounded-xl"}
    />
  );
}
