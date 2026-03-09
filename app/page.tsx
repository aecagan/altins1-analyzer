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

type HistoryResponse = {
  count: number;
  latest: HistoryItem | null;
  items: HistoryItem[];
  error?: boolean;
  message?: string;
};

type StatusItem = {
  id: number;
  last_cron_run_at: string | null;
  last_cron_status: string | null;
  last_insert_at: string | null;
  last_insert_count: number;
  last_message: string | null;
  updated_at: string | null;
};

type StatusResponse = {
  item: StatusItem | null;
  active: boolean;
  error?: boolean;
  message?: string;
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

function cronBadge(active: boolean) {
  if (active) {
    return {
      text: "Veri alımı aktif",
      bg: "#ecfdf5",
      fg: "#065f46",
    };
  }

  return {
    text: "Veri alımı pasif",
    bg: "#fef2f2",
    fg: "#991b1b",
  };
}

export default function Page() {
  const [latest, setLatest] = useState<HistoryItem | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [status, setStatus] = useState<StatusItem | null>(null);
  const [statusActive, setStatusActive] = useState(false);
  const [count, setCount] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const [historyRes, statusRes] = await Promise.all([
        fetch(`/api/history?t=${Date.now()}`, { cache: "no-store" }),
        fetch(`/api/status?t=${Date.now()}`, { cache: "no-store" }),
      ]);

      const historyJson = (await historyRes.json()) as HistoryResponse;
      const statusJson = (await statusRes.json()) as StatusResponse;

      if (historyJson.error) {
        throw new Error(historyJson.message || "History API hatası");
      }

      if (statusJson.error) {
        throw new Error(statusJson.message || "Status API hatası");
      }

      setHistory(historyJson.items ?? []);
      setLatest(historyJson.latest ?? null);
      setCount(historyJson.count ?? 0);

      setStatus(statusJson.item ?? null);
      setStatusActive(Boolean(statusJson.active));
    } catch (e: any) {
      setErr(e?.message ?? "Bilinmeyen hata");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();

    const interval = setInterval(() => {
      load();
    }, 60_000);

    return () => clearInterval(interval);
  }, []);

  const latestData = useMemo(() => {
    if (!latest) return null;

    return {
      altins1: Number(latest.altins1),
      usdtry: Number(latest.usdtry),
      xauusd: Number(latest.xauusd),
      gram_altin: Number(latest.gram_altin),
      teorik_altins1: Number(latest.teorik_altins1),
      prim_yuzde: Number(latest.prim_yuzde),
    };
  }, [latest]);

  const primVisual = useMemo(() => {
    if (!latestData) return { text: "-", bg: "#f3f4f6", fg: "#111827" };
    return badgeForPrim(latestData.prim_yuzde);
  }, [latestData]);

  const cronVisual = useMemo(() => cronBadge(statusActive), [statusActive]);

  const chartData = useMemo(() => {
    return history.map((item) => ({
      time: new Date(item.created_at).toLocaleString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
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
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div>
            <h1 style={{ fontSize: 32, margin: 0 }}>ALTIN.S1 Analyzer</h1>
            <p style={{ marginTop: 6, color: "#475569" }}>
              Kartlar son veriyi, grafikler tüm arşivi gösterir
            </p>
          </div>

          <button
            onClick={load}
            disabled={loading}
            style={{
              border: "1px solid #e2e8f0",
              background: "#fff",
              padding: "10px 14px",
              borderRadius: 12,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Yükleniyor…" : "Yenile"}
          </button>
        </div>

        {err && (
          <div
            style={{
              marginTop: 16,
              background: "#fee2e2",
              padding: 12,
              borderRadius: 10,
            }}
          >
            Hata: {err}
          </div>
        )}

        <div
          style={{
            marginTop: 20,
            display: "grid",
            gridTemplateColumns: "repeat(12, 1fr)",
            gap: 14,
          }}
        >
          <Card
            title="Veri Toplama Durumu"
            span={12}
            value=""
            body={
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(12, 1fr)",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <div style={{ gridColumn: "span 12" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 12px",
                      borderRadius: 999,
                      background: cronVisual.bg,
                      color: cronVisual.fg,
                      fontWeight: 800,
                      fontSize: 14,
                    }}
                  >
                    ● {cronVisual.text}
                  </span>
                </div>

                <MiniRow
                  label="Toplam kayıt"
                  value={String(count)}
                  span={3}
                />
                <MiniRow
                  label="Son cron çalışması"
                  value={
                    status?.last_cron_run_at
                      ? new Date(status.last_cron_run_at).toLocaleString("tr-TR")
                      : "—"
                  }
                  span={3}
                />
                <MiniRow
                  label="Son başarılı kayıt"
                  value={
                    status?.last_insert_at
                      ? new Date(status.last_insert_at).toLocaleString("tr-TR")
                      : latest
                        ? new Date(latest.created_at).toLocaleString("tr-TR")
                        : "—"
                  }
                  span={3}
                />
                <MiniRow
                  label="Son durum"
                  value={status?.last_cron_status ?? "—"}
                  span={3}
                />

                <div
                  style={{
                    gridColumn: "span 12",
                    border: "1px dashed #e2e8f0",
                    borderRadius: 12,
                    padding: 12,
                    color: "#475569",
                    fontSize: 14,
                  }}
                >
                  {status?.last_message ?? "Henüz durum mesajı yok."}
                </div>
              </div>
            }
          />

          <Card
            title="ALTIN.S1"
            value={latestData ? `${fmt(latestData.altins1, 2)} TL` : "—"}
            span={4}
          />
          <Card
            title="Teorik ALTIN.S1"
            value={latestData ? `${fmt(latestData.teorik_altins1, 2)} TL` : "—"}
            span={4}
          />
          <Card
            title="Prim"
            value={latestData ? `${fmt(latestData.prim_yuzde, 2)}%` : "—"}
            span={4}
            right={
              <span
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: primVisual.bg,
                  color: primVisual.fg,
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                {primVisual.text}
              </span>
            }
          />

          <Card
            title="USDTRY"
            value={latestData ? fmt(latestData.usdtry, 4) : "—"}
            span={4}
          />
          <Card
            title="XAUUSD"
            value={latestData ? fmt(latestData.xauusd, 2) : "—"}
            span={4}
          />
          <Card
            title="Gram Altın"
            value={latestData ? fmt(latestData.gram_altin, 2) : "—"}
            span={4}
          />

          <Card
            title="ALTIN.S1 vs Teorik"
            span={12}
            value=""
            body={
              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" minTickGap={24} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="altins1"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={false}
                      name="ALTIN.S1"
                    />
                    <Line
                      type="monotone"
                      dataKey="teorik"
                      stroke="#16a34a"
                      strokeWidth={2}
                      dot={false}
                      name="Teorik"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            }
          />

          <Card
            title="Prim (%)"
            span={12}
            value=""
            body={
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" minTickGap={24} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="prim"
                      stroke="#dc2626"
                      strokeWidth={2}
                      dot={false}
                      name="Prim %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            }
          />
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
  value?: string;
  span: number;
  right?: React.ReactNode;
  body?: React.ReactNode;
}) {
  return (
    <section
      style={{
        gridColumn: `span ${span}`,
        border: "1px solid #e2e8f0",
        borderRadius: 14,
        padding: 16,
        background: "#fff",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <div>
          <div style={{ fontSize: 13, color: "#64748b" }}>{title}</div>
          {value && (
            <div
              style={{
                marginTop: 6,
                fontSize: 24,
                fontWeight: 800,
              }}
            >
              {value}
            </div>
          )}
        </div>
        {right}
      </div>

      {body && <div style={{ marginTop: 14 }}>{body}</div>}
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
        gridColumn: `span ${span}`,
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