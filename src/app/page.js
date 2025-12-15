"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// ✅ client-only load to avoid `self is not defined`
const PowerBIEmbed = dynamic(
  () => import("powerbi-client-react").then((m) => m.PowerBIEmbed),
  { ssr: false }
);

export default function Home() {
  const [error, setError] = useState(null);
  const [embedInfo, setEmbedInfo] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("http://localhost:3000/embed-token", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || `embed-token failed (${res.status})`);

        const { embedToken, embedUrl, reportId } = json || {};
        if (!embedToken || !embedUrl || !reportId) {
          throw new Error("embed-token response must include embedToken, embedUrl, reportId");
        }

        setEmbedInfo({ embedToken, embedUrl, reportId });
      } catch (e) {
        setError(e?.message || String(e));
      }
    })();
  }, []);

  if (error) return <pre style={{ color: "crimson" }}>{error}</pre>;
  if (!embedInfo) return <div>Loading...</div>;

  return (
    <main
      style={{
        height: "100dvh",
        padding: 12,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <h1 style={{ margin: 0, fontSize: 18 }}>Power BI Embed</h1>

      <div style={{ flex: 1, minHeight: 0, border: "1px solid #ddd" }}>
        <PowerBIEmbed
          cssClassName="pbiFill"
          embedConfig={{
            type: "report",
            id: embedInfo.reportId,
            embedUrl: embedInfo.embedUrl,
            accessToken: embedInfo.embedToken,
            tokenType: 1, // Embed
            settings: {
              panes: {
                filters: { expanded: false, visible: false },
                pageNavigation: { visible: true },
              },
              background: 1,
            },
          }}
        />
      </div>

      <style jsx global>{`
        .pbiFill,
        .pbiFill > div,
        .pbiFill iframe {
          width: 100% !important;
          height: 100% !important;
        }
      `}</style>
    </main>
  );
}
