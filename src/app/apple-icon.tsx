import { ImageResponse } from "next/og";

export const size = { height: 180, width: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "#0f0f0f",
        borderRadius: 36,
        display: "flex",
        height: "100%",
        justifyContent: "center",
        width: "100%",
      }}
    >
      <span
        style={{
          color: "#fafaf9",
          fontSize: 90,
          fontWeight: 700,
          letterSpacing: "-3px",
        }}
      >
        AS
      </span>
    </div>,
    { ...size },
  );
}
