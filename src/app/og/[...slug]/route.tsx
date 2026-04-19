import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;
  const title = slug.map(decodeURIComponent).join(" / ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px 80px",
          background: "#0f0f0f",
          fontFamily: "Inter, system-ui, sans-serif",
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
              fontSize: 20,
              fontWeight: 500,
              color: "#a8a29e",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Agent Surface
          </span>
          <span
            style={{
              fontSize: 56,
              fontWeight: 700,
              color: "#fafaf9",
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              maxWidth: "900px",
            }}
          >
            {title}
          </span>
        </div>
        <span
          style={{
            fontSize: 18,
            color: "#78716c",
          }}
        >
          agentsurface.dev
        </span>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
