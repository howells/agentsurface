import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

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
          background: "#0f0f0f",
          borderRadius: 36,
        }}
      >
        <span
          style={{
            fontSize: 90,
            fontWeight: 700,
            color: "#fafaf9",
            letterSpacing: "-3px",
          }}
        >
          AS
        </span>
      </div>
    ),
    { ...size },
  );
}
