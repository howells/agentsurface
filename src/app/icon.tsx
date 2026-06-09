import { ImageResponse } from "next/og";

export const size = { height: 32, width: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "#0f0f0f",
        borderRadius: 6,
        display: "flex",
        height: "100%",
        justifyContent: "center",
        width: "100%",
      }}
    >
      <span
        style={{
          color: "#fafaf9",
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: "-0.5px",
        }}
      >
        AS
      </span>
    </div>,
    { ...size },
  );
}
