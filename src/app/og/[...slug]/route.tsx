import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const title = slug.map(decodeURIComponent).join(" / ");

  return new ImageResponse(
    <div
      style={{
        background: "#0f0f0f",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Inter, system-ui, sans-serif",
        height: "100%",
        justifyContent: "space-between",
        padding: "60px 80px",
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <span
          style={{
            color: "#a8a29e",
            fontSize: 20,
            fontWeight: 500,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          Agent Surface
        </span>
        <span
          style={{
            color: "#fafaf9",
            fontSize: 56,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
            maxWidth: "900px",
          }}
        >
          {title}
        </span>
      </div>
      <span
        style={{
          color: "#78716c",
          fontSize: 18,
        }}
      >
        agentsurface.dev
      </span>
    </div>,
    { height: 630, width: 1200 },
  );
}
