import { readFile } from "node:fs/promises";
import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

const interFont = readFile(new URL("../../fonts/Inter-Regular.ttf", import.meta.url));
const plate = readFile(new URL("../difference-engine.jpg", import.meta.url)).then(
  (data) => `data:image/jpeg;base64,${data.toString("base64")}`,
);

const PAPER = "#f7ecdb";
const INK = "#2b2519";
const MUTED = "#86775a";

// The drawing is 768 x 960. It is scaled to fill the right of the 1200 x 630
// canvas and cropped by the top, right and bottom edges.
const PLATE_LEFT = 610;
const PLATE_SCALE = 0.78;
const PLATE_TOP = -60;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const title = slug.map(decodeURIComponent).join(" / ");
  const fontSize = title.length > 44 ? 50 : title.length > 26 ? 60 : 68;

  return new ImageResponse(
    <div
      style={{
        background: PAPER,
        display: "flex",
        fontFamily: "Inter",
        height: "100%",
        position: "relative",
        width: "100%",
      }}
    >
      <div
        style={{
          backgroundImage: `url(${await plate})`,
          backgroundSize: "100% 100%",
          display: "flex",
          height: 960 * PLATE_SCALE,
          left: PLATE_LEFT,
          position: "absolute",
          top: PLATE_TOP,
          width: 768 * PLATE_SCALE,
        }}
      />
      <div
        style={{
          background: `linear-gradient(to right, ${PAPER}, ${PAPER}00)`,
          display: "flex",
          height: 630,
          left: PLATE_LEFT,
          position: "absolute",
          top: 0,
          width: 110,
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "space-between",
          padding: "64px 0 60px 72px",
          position: "relative",
          width: 680,
        }}
      >
        <span style={{ color: INK, fontSize: 26, letterSpacing: "-0.01em" }}>Agent Surface</span>
        <span
          style={{
            color: INK,
            fontSize,
            letterSpacing: "-0.035em",
            lineHeight: 1.04,
            maxWidth: 560,
          }}
        >
          {title}
        </span>
        <span style={{ color: MUTED, fontSize: 22 }}>agentsurface.dev</span>
      </div>
    </div>,
    {
      fonts: [{ data: await interFont, name: "Inter", style: "normal", weight: 400 }],
      height: 630,
      width: 1200,
    },
  );
}
