"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";

type ApiResponse = {
  timestamp: string;
  values: {
    altins1: number;
    usdtry: number;
    xauusd: number;
    gram_altin: number;
  };
  calculations: {
    teorik_altins1: number;
    prim_yuzde: number;
  };
  error?: boolean;
  message?: string;
};

type HistoryItem = {
  id: number;
  created_at: string;
  altins1: string | number;
  usdtry: string | number;
  xauusd: string | number;
  gram_altin: string | number;
  teorik_altins1: string | number;
  prim_yuzde: string | number;
};

function fmt(n: number, digits = 2) {
  return n.toLocaleString("tr-TR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function badgeForPrim(p: number) {
  if (p >= 10) return { text: "Pahalı", bg: "#ecfdf5", fg: "#065f46" };
  if (p >= 3) return { text: "Primli", bg: "#eff6ff", fg: "#1d4ed8" };
  if (p <= -10) return { text: "Ucuz", bg: "#fef2f2", fg: "#991b1b" };
  if (p <= -3) return { text: "İskontolu", bg: "#fff7ed", fg: "#9a3412" };
  return { text: "Nötr", bg: "#f3f4f6", fg: "#111827" };
}

export default function Page() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const [analysisRes, historyRes] = await Promise.all([
        fetch("/api/analysis", { cache: "no-store" }),
        fetch("/api/history", { cache: "no-store" }),
      ]);

      const analysisJson = (await analysisRes.json()) as ApiResponse;
      const historyJson = await historyRes.json();

      if ((analysisJson as any).error) {
        throw new Error((analysisJson as any).message || "Analysis API hata döndürdü");
      }

      if ((historyJson as any).error) {
        throw new Error((historyJson as any).message || "History API hata döndürdü");
      }

      setData(analysisJson);
      setHistory(historyJson.items ?? []);
    } catch (e: any) {
      setErr(e?.message ?? "Bilinmeyen hata");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const prim = data?.calculations?.prim_yuzde;
  const primBadge = useMemo(() => {
    if (prim == null) return { text: "-", bg: "#f3f4f6", fg: "#111827" };
    return badgeForPrim(prim);
  }, [prim]);

  const detail = useMemo(() => {
    if (!data) return null;

    const gramUsd = data.values.xauusd / 31.1034768;
    const gramTry = gramUsd * data.values.usdtry;
    const s1Theo = gramTry * 0.01;

    return {
      gramUsd,
      gramTry,
      s1Theo,
    };
  }, [data]);

  const chartData = useMemo(() => {
    return history.map((item) => ({
      time: new Date(item.created_at).toLocaleDateString("tr-TR"),
      datetime: new Date(item.created_at).toLocaleString("tr-TR"),
      altins1: Number(item.altins1),
      teorik: Number(item.teorik_altins1),
      prim: Number(item.prim_yuzde),
    }));
  }, [history]);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        color: "#0f172a",
        padding: "28px 16px",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"',
      }}
    >
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 34,
                lineHeight: 1.1,
                margin: 0,
                letterSpacing: -0.5,
              }}
            >
              ALTIN.S1 Analyzer
            </h1>
            <p style={{ margin: "8px 0 0", color: "#475569" }}>
              Mynet verileriyle teorik değer ve prim takibi
            </p>
          </div>

          <button
            onClick={load}
            disabled={loading}
            style={{
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              padding: "10px 14px",
              borderRadius: 12,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 1px 2px rgba(15,23,42,0.06)",
              opacity: loading ? 0.6 : 1,
              minWidth: 96,
            }}
            title="Verileri yeniden çek"
          >
            {loading ? "Yükleniyor…" : "Yenile"}
          </button>
        </div>

        {err && (
          <div
            style={{
              marginTop: 18,
              padding: 14,
              borderRadius: 14,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#991b1b",
            }}
          >
            <strong>Hata:</strong> {err}
          </div>
        )}

        <div
          style={{
            marginTop: 18,
            display: "grid",
            gridTemplateColumns: "repeat(12, 1fr)",
            gap: 14,
          }}
        >
          <Card title="ALTIN.S1 (BIST)" value={data ? `${fmt(data.values.altins1, 2)} TL` : "—"} span={6} />
          <Card title="Teorik ALTIN.S1" value={data ? `${fmt(data.calculations.teorik_altins1, 2)} TL` : "—"} span={6} />

          <Card
            title="Prim"
            value={data ? `${fmt(data.calculations.prim_yuzde, 2)}%` : "—"}
            span={4}
            right={
              <span
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: primBadge.bg,
                  color: primBadge.fg,
                  fontWeight: 800,
                  fontSize: 13,
                }}
              >
                {primBadge.text}
              </span>
            }
          />
          <Card title="USD/TRY" value={data ? fmt(data.values.usdtry, 4) : "—"} span={4} />
          <Card title="XAU/USD (Ons)" value={data ? fmt(data.values.xauusd, 2) : "—"} span={4} />

          <Card title="Gram Altın (TL/gr)" value={data ? fmt(data.values.gram_altin, 2) : "—"} span={4} />
          <Card
            title="Hesap Detayı"
            value=""
            span={8}
            body={
              data && detail ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(12, 1fr)",
                    gap: 10,
                  }}
                >
                  <MiniRow label="Gram (USD) = XAUUSD / 31.1035" value={fmt(detail.gramUsd, 4)} span={6} />
                  <MiniRow label="Gram (TL) = GramUSD × USDTRY" value={fmt(detail.gramTry, 2)} span={6} />
                  <MiniRow label="Teorik S1 = GramTL × 0.01" value={fmt(detail.s1Theo, 4)} span={6} />
                  <MiniRow
                    label="Fark = S1 - Teorik"
                    value={fmt(data.values.altins1 - data.calculations.teorik_altins1, 4)}
                    span={6}
                  />
                </div>
              ) : (
                <div style={{ color: "#64748b", fontSize: 13 }}>—</div>
              )
            }
          />

          <Card
            title="ALTIN.S1 vs Teorik Fiyat"
            value=""
            span={12}
            body={
              chartData.length > 0 ? (
                <div style={{ width: "100%", height: 340 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="altins1"
                        name="ALTIN.S1"
                        stroke="#2563eb"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="teorik"
                        name="Teorik"
                        stroke="#16a34a"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ color: "#64748b", fontSize: 13 }}>Grafik için henüz yeterli veri yok.</div>
              )
            }
          />

          <Card
            title="Prim (%) Grafiği"
            value=""
            span={12}
            body={
              chartData.length > 0 ? (
                <div style={{ width: "100%", height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="prim"
                        name="Prim %"
                        stroke="#dc2626"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ color: "#64748b", fontSize: 13 }}>Grafik için henüz yeterli veri yok.</div>
              )
            }
          />
        </div>

        <div style={{ marginTop: 14, color: "#64748b", fontSize: 12 }}>
          Not: Bu araç bilgilendirme amaçlıdır. Yatırım tavsiyesi değildir.
        </div>
      </div>
    </main>
  );
}

function Card({
  title,
  value,
  span,
  right,
  body,
}: {
  title: string;
  value: string;
  span: number;
  right?: React.ReactNode;
  body?: React.ReactNode;
}) {
  return (
    <section
      style={{
        gridColumn: `span ${span} / span ${span}`,
        border: "1px solid #e2e8f0",
        background: "#ffffff",
        borderRadius: 16,
        padding: 16,
        boxShadow: "0 1px 2px rgba(15,23,42,0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div>
          <div style={{ color: "#64748b", fontSize: 13 }}>{title}</div>
          {value ? (
            <div
              style={{
                marginTop: 8,
                fontSize: 26,
                fontWeight: 850,
                letterSpacing: -0.3,
              }}
            >
              {value}
            </div>
          ) : null}
        </div>
        {right}
      </div>
      {body ? <div style={{ marginTop: 12 }}>{body}</div> : null}
    </section>
  );
}

function MiniRow({
  label,
  value,
  span,
}: {
  label: string;
  value: string;
  span: number;
}) {
  return (
    <div
      style={{
        gridColumn: `span ${span} / span ${span}`,
        border: "1px dashed #e2e8f0",
        borderRadius: 12,
        padding: 10,
      }}
    >
      <div style={{ fontSize: 12, color: "#64748b" }}>{label}</div>
      <div style={{ marginTop: 4, fontSize: 16, fontWeight: 800 }}>{value}</div>
    </div>
  );
}