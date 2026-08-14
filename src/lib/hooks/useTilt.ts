"use client";

import { useEffect, useRef, useState } from "react";

type PermissionCapableDeviceOrientation = {
  requestPermission?: () => Promise<"granted" | "denied">;
};

/**
 * iOS 13+ refuses motion events until the user grants permission, and the
 * request only works from inside a tap handler. Returns false when the API
 * isn't available at all, so callers can fall back to tapping.
 */
export async function requestTiltPermission(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("DeviceOrientationEvent" in window)) return false;

  const api =
    DeviceOrientationEvent as unknown as PermissionCapableDeviceOrientation;
  if (typeof api.requestPermission !== "function") {
    // Android and desktop Chrome expose the events with no gate.
    return true;
  }
  try {
    return (await api.requestPermission()) === "granted";
  } catch {
    return false;
  }
}

/** Beyond these, a tilt counts. Between them, the phone is "neutral" again. */
const DOWN_THRESHOLD = 140;
const UP_THRESHOLD = 40;
const NEUTRAL_LOW = 55;
const NEUTRAL_HIGH = 125;

/**
 * Detects the phone being tipped forward or back while held against a
 * forehead, in portrait.
 *
 * `beta` is rotation around the phone's left-right axis: 90° is upright,
 * 180° is screen-down, 0° is screen-up. A tilt only fires once and then has
 * to pass back through the neutral band before it can fire again, otherwise a
 * single nod registers a dozen times.
 */
export function useTilt({
  enabled,
  inverted = false,
  onDown,
  onUp,
}: {
  enabled: boolean;
  inverted?: boolean;
  onDown: () => void;
  onUp: () => void;
}) {
  const [supported, setSupported] = useState(false);
  const armedRef = useRef(true);

  // Refs so callers can pass inline handlers without re-binding the listener
  // on every render.
  const onDownRef = useRef(onDown);
  const onUpRef = useRef(onUp);
  const invertedRef = useRef(inverted);

  // Updated in an effect rather than during render — the listener only reads
  // these when an orientation event fires, which is always after commit.
  useEffect(() => {
    onDownRef.current = onDown;
    onUpRef.current = onUp;
    invertedRef.current = inverted;
  });

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) {
      return;
    }

    armedRef.current = true;

    const handle = (event: DeviceOrientationEvent) => {
      const beta = event.beta;
      if (beta === null || beta === undefined) return;
      setSupported(true);

      if (beta > NEUTRAL_LOW && beta < NEUTRAL_HIGH) {
        armedRef.current = true;
        return;
      }
      if (!armedRef.current) return;

      if (beta >= DOWN_THRESHOLD) {
        armedRef.current = false;
        (invertedRef.current ? onUpRef.current : onDownRef.current)();
      } else if (beta <= UP_THRESHOLD) {
        armedRef.current = false;
        (invertedRef.current ? onDownRef.current : onUpRef.current)();
      }
    };

    window.addEventListener("deviceorientation", handle);
    return () => window.removeEventListener("deviceorientation", handle);
  }, [enabled]);

  return { supported };
}
