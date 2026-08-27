import { ImageResponse } from "next/og";

// Original dark editorial OG card. Built-in next/og renderer, zero new
// dependencies, no third-party marks (docs/UI_DESIGN.md mark rules).
export const runtime = "edge";
export const alt = "Verdiqt. Put your SaaS idea on trial before you build it.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#111214",
          color: "#F4F3F1",
          padding: "56px 64px",
          border: "16px solid #17181B",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 26,
            letterSpacing: "0.14em",
            color: "#A5A6A9",
          }}
        >
          <span>VERDIQT</span>
          <span style={{ color: "#6E8BFF" }}>[01] EVIDENCE COURT</span>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <div
            style={{
              fontSize: 84,
              fontWeight: 600,
              lineHeight: 1.02,
              letterSpacing: "-0.04em",
              maxWidth: 980,
              display: "flex",
            }}
          >
            Put your SaaS idea on trial before you build it.
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderTop: "1px solid #35373C",
            paddingTop: 28,
            fontSize: 24,
            letterSpacing: "0.12em",
            color: "#A5A6A9",
          }}
        >
          <span>CITED EVIDENCE</span>
          <span>SIX DIMENSIONS</span>
          <span>ONE VERDICT</span>
          <span style={{ color: "#6E8BFF" }}>ONE NEXT STEP</span>
        </div>
      </div>
    ),
    size,
  );
}
