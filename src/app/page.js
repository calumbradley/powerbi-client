"use client";

import dynamic from "next/dynamic";
import React, { useEffect, useMemo, useState } from "react";

// ✅ client-only load to avoid `self is not defined`
const PowerBIEmbed = dynamic(
  () => import("powerbi-client-react").then((m) => m.PowerBIEmbed),
  { ssr: false }
);

function safeStringify(value) {
  try {
    return JSON.stringify(
      value,
      (_k, v) => (v instanceof Error ? { name: v.name, message: v.message, stack: v.stack } : v),
      2
    );
  } catch {
    return String(value);
  }
}

class EmbedErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { err: null };
  }
  static getDerivedStateFromError(err) {
    return { err };
  }
  componentDidCatch(err) {
    // Make sure it appears in devtools
    console.error("PowerBIEmbed render error:", err);
  }
  render() {
    if (this.state.err) {
      return (
        <pre style={{ color: "crimson", whiteSpace: "pre-wrap" }}>
          PowerBIEmbed crashed:
          {"\n"}
          {safeStringify(this.state.err)}
        </pre>
      );
    }
    return this.props.children;
  }
}

export default function Home() {
  const [error, setError] = useState(null);

  const [embedInfo, setEmbedInfo] = useState({
    embedToken: null,
    embedUrl: null,
    reportId: null,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setError(null);

        const res = await fetch("http://localhost:3000/embed-token", { cache: "no-store" });
        const json = await res.json();

        if (!res.ok) throw new Error(json?.error || `embed-token failed (${res.status})`);

        const { embedToken, embedUrl, reportId } = json || {};
        if (!embedToken) throw new Error("No embedToken returned from /embed-token");
        if (!embedUrl) throw new Error("No embedUrl returned from /embed-token");
        if (!reportId) throw new Error("No reportId returned from /embed-token");

        if (!cancelled) setEmbedInfo({ embedToken, embedUrl, reportId });
      } catch (e) {
        if (!cancelled) setError(e?.message || String(e));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const embedConfig = useMemo(
    () => ({
      type: "report",
      id: embedInfo.reportId ?? undefined,
      embedUrl: embedInfo.embedUrl ?? undefined,
      accessToken: embedInfo.embedToken ?? undefined,

      // TokenType.Embed === 1
      tokenType: 1,

      settings: {
        panes: { filters: { expanded: false, visible: false } },

        // BackgroundType.Transparent === 1 (2 is invalid and causes the crash)
        background: 1,
      },
    }),
    [embedInfo]
  );

  const eventHandlers = useMemo(
    () =>
      new Map([
        ["loaded", () => console.log("Report loaded")],
        ["rendered", () => console.log("Report rendered")],
        [
          "error",
          (event) => {
            console.log("PowerBI error", event?.detail);
            setError(safeStringify(event?.detail));
          },
        ],
      ]),
    []
  );

  const canEmbed = !!embedInfo.embedToken && !!embedInfo.embedUrl && !!embedInfo.reportId;

  return (
    <main style={{ padding: 16 }}>
      <h1>Power BI Embed</h1>

      {error ? (
        <pre style={{ color: "crimson", whiteSpace: "pre-wrap" }}>Error: {error}</pre>
      ) : !canEmbed ? (
        <div>Loading...</div>
      ) : (
        <div style={{ height: "80vh", border: "1px solid #ddd" }}>
          <EmbedErrorBoundary>
            <PowerBIEmbed embedConfig={embedConfig} eventHandlers={eventHandlers} />
          </EmbedErrorBoundary>
        </div>
      )}
    </main>
  );
}
