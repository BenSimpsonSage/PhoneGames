import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

/**
 * Three fanned-out game cards. Drawn with plain boxes rather than an emoji
 * so the build never has to reach the network for a font.
 */
export default function Icon() {
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
          { color: "#fb7185", rotate: -18, x: -92 },
          { color: "#facc15", rotate: 0, x: 0 },
          { color: "#38bdf8", rotate: 18, x: 92 },
        ].map((card) => (
          <div
            key={card.color}
            style={{
              position: "absolute",
              width: 168,
              height: 236,
              borderRadius: 34,
              background: card.color,
              border: "10px solid #0d0a1c",
              transform: `translateX(${card.x}px) rotate(${card.rotate}deg)`,
            }}
          />
        ))}
      </div>
    ),
    size,
  );
}
