import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * iOS home-screen icon. Same mark as `icon.tsx`, but iOS crops to its own
 * squircle and ignores transparency, so this one fills the square edge to edge.
 */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(140deg, #2b1e5c 0%, #0d0a1c 100%)",
        }}
      >
        {[
          { color: "#fb7185", rotate: -18, x: -32 },
          { color: "#facc15", rotate: 0, x: 0 },
          { color: "#38bdf8", rotate: 18, x: 32 },
        ].map((card) => (
          <div
            key={card.color}
            style={{
              position: "absolute",
              width: 60,
              height: 84,
              borderRadius: 12,
              background: card.color,
              border: "4px solid #0d0a1c",
              transform: `translateX(${card.x}px) rotate(${card.rotate}deg)`,
            }}
          />
        ))}
      </div>
    ),
    size,
  );
}
