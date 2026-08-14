"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  type Ref,
} from "react";

type Point = { x: number; y: number };
type Stroke = { color: string; width: number; points: Point[] };

export type DrawingCanvasHandle = {
  undo: () => void;
  clear: () => void;
};

/**
 * Finger-painting surface.
 *
 * Strokes are kept as data rather than only as pixels, so undo and a canvas
 * resize (rotating the phone, the iOS URL bar collapsing) can both redraw
 * from scratch instead of losing the picture.
 */
export function DrawingCanvas({
  color,
  width = 8,
  ref,
  className,
}: {
  color: string;
  width?: number;
  ref?: Ref<DrawingCanvasHandle>;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const activeRef = useRef<Stroke | null>(null);

  const context = () => canvasRef.current?.getContext("2d") ?? null;

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = context();
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (const stroke of strokesRef.current) {
      if (stroke.points.length === 0) continue;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      if (stroke.points.length === 1) {
        // A single tap should still leave a dot.
        ctx.lineTo(stroke.points[0].x + 0.01, stroke.points[0].y);
      } else {
        for (const point of stroke.points.slice(1)) {
          ctx.lineTo(point.x, point.y);
        }
      }
      ctx.stroke();
    }
  }, []);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    // Only touch the backing store when it actually changed — assigning
    // width/height wipes the canvas.
    const nextWidth = Math.round(rect.width * dpr);
    const nextHeight = Math.round(rect.height * dpr);
    if (canvas.width === nextWidth && canvas.height === nextHeight) return;
    canvas.width = nextWidth;
    canvas.height = nextHeight;
    redraw();
  }, [redraw]);

  useEffect(() => {
    resize();
    const observer = new ResizeObserver(resize);
    if (canvasRef.current) observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, [resize]);

  useImperativeHandle(ref, () => ({
    undo: () => {
      strokesRef.current.pop();
      redraw();
    },
    clear: () => {
      strokesRef.current = [];
      redraw();
    },
  }));

  const pointFrom = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  return (
    <canvas
      ref={canvasRef}
      // `touch-none` matters: without it the browser claims the gesture for
      // scrolling and the drawing stutters or never starts.
      className={`touch-none ${className ?? ""}`}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        const stroke: Stroke = { color, width, points: [pointFrom(event)] };
        activeRef.current = stroke;
        strokesRef.current.push(stroke);
        redraw();
      }}
      onPointerMove={(event) => {
        const stroke = activeRef.current;
        if (!stroke) return;
        // Coalesced events recover the points the browser batched between
        // frames, which is the difference between a smooth line and a polygon.
        const events =
          typeof event.nativeEvent.getCoalescedEvents === "function"
            ? event.nativeEvent.getCoalescedEvents()
            : [event.nativeEvent];
        const rect = event.currentTarget.getBoundingClientRect();
        for (const raw of events) {
          stroke.points.push({
            x: raw.clientX - rect.left,
            y: raw.clientY - rect.top,
          });
        }
        redraw();
      }}
      onPointerUp={() => {
        activeRef.current = null;
      }}
      onPointerCancel={() => {
        activeRef.current = null;
      }}
    />
  );
}
