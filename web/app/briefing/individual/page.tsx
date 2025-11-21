"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

import { fetchWatchlist } from "@/api/client";
import { fetchReports, generateReport } from "@/api/reports";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { BriefingHistory } from "@/components/briefing/BriefingHistory";
import { WatchlistEntry } from "@/types/news";
import { Report, SmartBriefingContent } from "@/types/reports";

export default function DailyBriefingPage() {
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const [report, setReport] = useState<Report | null>(null);
  const [parsedContent, setParsedContent] = useState<SmartBriefingContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportHistory, setReportHistory] = useState<Report[]>([]);

  useEffect(() => {
    fetchWatchlist()
      .then((entries) => {
        setWatchlist(entries);
        if (entries.length > 0) {
          setSelectedSymbol(entries[0].symbol);
        }
      })
      .catch((err) => setError(err.message));
  }, []);

  // Fetch history when symbol changes
  useEffect(() => {
    if (!selectedSymbol) return;
    fetchReports({ symbol: selectedSymbol, limit: 20 })
      .then((reports) => {
        setReportHistory(reports);
        if (reports.length > 0) {
          setReport(reports[0]); // Show latest by default
        } else {
          setReport(null);
        }
      })
      .catch((err) => console.error("Failed to fetch history:", err));
  }, [selectedSymbol]);

  useEffect(() => {
    if (report) {
      try {
        const parsed = JSON.parse(report.content) as SmartBriefingContent;
        setParsedContent(parsed);
      } catch (e) {
        console.error("Failed to parse report content:", e);
        setParsedContent(null);
      }
    } else {
      setParsedContent(null);
    }
  }, [report]);

  const handleGenerate = async () => {
    if (!selectedSymbol) return;
    setIsLoading(true);
    setError(null);
    try {
      const newReport = await generateReport({
        symbol: selectedSymbol,
        type: "smart_briefing",
        limit: 20,
      });
      setReport(newReport);
      setReportHistory((prev) => [newReport, ...prev]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectReport = (selectedReport: Report) => {
    setReport(selectedReport);
  };

  const sentimentColor = (score: number) => {
    if (score >= 70) return "#34d399"; // Green
    if (score <= 30) return "#f87171"; // Red
    return "#fbbf24"; // Yellow
  };

  return (
    <AppShell active="individual" actionHref="/" actionLabel="실시간 스트림">
      <section
        className="glass-panel"
        style={{
          padding: "3rem",
          background:
            "linear-gradient(135deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%)",
          position: "relative",
          overflow: "hidden",
          marginBottom: "2rem",
        }}
      >
        <div style={{ position: "relative", zIndex: 10 }}>
          <Badge tone="neutral" style={{ marginBottom: "1rem" }}>
            Smart Briefing
          </Badge>
          <h1
            style={{
              fontSize: "3rem",
              marginBottom: "1.5rem",
              background: "var(--gradient-primary)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            AI 투자 브리핑
          </h1>
          <p
            style={{
              fontSize: "1.1rem",
              maxWidth: "600px",
              color: "#94a3b8",
              marginBottom: "2.5rem",
              lineHeight: "1.6",
            }}
          >
            복잡한 뉴스 데이터를 AI가 분석하여 핵심 요약, 투자 심리, 리스크 요인을
            한눈에 보여드립니다.
          </p>

          <div className="controls" style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              style={{
                background: "rgba(30, 41, 59, 0.5)",
                border: "1px solid rgba(148, 163, 184, 0.2)",
                color: "white",
                padding: "0.8rem 1.5rem",
                borderRadius: "0.5rem",
                fontSize: "1rem",
                outline: "none",
                minWidth: "200px",
              }}
            >
              {watchlist.length === 0 && <option value="">워치리스트 없음</option>}
              {watchlist.map((w) => (
                <option key={w.symbol} value={w.symbol}>
                  {w.symbol}
                </option>
              ))}
            </select>
            <Button
              variant="solid"
              onClick={handleGenerate}
              disabled={!selectedSymbol || isLoading}
              style={{ padding: "0.8rem 2rem", fontSize: "1rem" }}
            >
              {isLoading ? "분석 중..." : "브리핑 생성"}
            </Button>
          </div>
          {error && (
            <p style={{ color: "#f87171", marginTop: "1rem" }}>{error}</p>
          )}
        </div>
      </section>

      <div className="dashboard-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "2rem" }}>
        {parsedContent ? (
          <section className="glass-panel" style={{ padding: "2rem" }}>
            <header style={{ marginBottom: "2rem" }}>
              <h2 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>핵심 요약</h2>
              <p style={{ color: "#94a3b8" }}>AI가 선별한 주요 이슈입니다.</p>
            </header>
            <ul style={{ listStyle: "none", padding: 0 }}>
              {parsedContent.summary.map((item, idx) => (
                <li
                  key={idx}
                  className="glass-card"
                  style={{
                    padding: "1.5rem",
                    marginBottom: "1rem",
                    fontSize: "1.1rem",
                    lineHeight: "1.6",
                    display: "flex",
                    gap: "1rem",
                  }}
                >
                  <span
                    style={{
                      color: "var(--color-primary)",
                      fontWeight: "bold",
                      fontSize: "1.2rem",
                    }}
                  >
                    {idx + 1}
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <div style={{ marginTop: "2rem" }}>
              <h3 style={{ fontSize: "1.4rem", marginBottom: "1rem" }}>시장 전망</h3>
              <p style={{ fontSize: "1.1rem", lineHeight: "1.7", color: "#cbd5e1" }}>
                {parsedContent.market_outlook}
              </p>
            </div>
          </section>
        ) : (
          <div
            className="glass-panel"
            style={{
              padding: "4rem",
              textAlign: "center",
              color: "#64748b",
              fontSize: "1.1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "400px"
            }}
          >
            {selectedSymbol
              ? "브리핑 생성 버튼을 눌러 분석을 시작하거나,\n오른쪽에서 지난 브리핑을 선택하세요."
              : "워치리스트에서 종목을 선택해주세요."}
          </div>
        )}

        <aside style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          <BriefingHistory
            reports={reportHistory}
            currentReportId={report?.id || null}
            onSelectReport={handleSelectReport}
            label={`${selectedSymbol} 브리핑 히스토리`}
          />

          {parsedContent && (
            <>
              <section className="glass-panel" style={{ padding: "2rem", textAlign: "center" }}>
                <h3 style={{ fontSize: "1.2rem", color: "#94a3b8", marginBottom: "1rem" }}>투자 심리 (Sentiment)</h3>
                <div style={{ position: "relative", width: "150px", height: "150px", margin: "0 auto" }}>
                  <svg viewBox="0 0 36 36" style={{ transform: "rotate(-90deg)" }}>
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#334155"
                      strokeWidth="3"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke={sentimentColor(parsedContent.sentiment_score)}
                      strokeWidth="3"
                      strokeDasharray={`${parsedContent.sentiment_score}, 100`}
                    />
                  </svg>
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      fontSize: "2rem",
                      fontWeight: "bold",
                      color: sentimentColor(parsedContent.sentiment_score),
                    }}
                  >
                    {parsedContent.sentiment_score}
                  </div>
                </div>
                <p style={{ marginTop: "1rem", fontSize: "0.9rem", color: "#cbd5e1" }}>
                  {parsedContent.sentiment_reason}
                </p>
              </section>

              <section className="glass-panel" style={{ padding: "2rem" }}>
                <h3 style={{ fontSize: "1.2rem", color: "#f87171", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span>⚠</span> 리스크 요인
                </h3>
                <ul style={{ paddingLeft: "1.2rem", color: "#cbd5e1", lineHeight: "1.6" }}>
                  {parsedContent.key_risks.map((risk, idx) => (
                    <li key={idx} style={{ marginBottom: "0.5rem" }}>
                      {risk}
                    </li>
                  ))}
                </ul>
              </section>

              {report && (
                <div style={{ textAlign: "right", fontSize: "0.8rem", color: "#64748b" }}>
                  Generated {formatDistanceToNow(new Date(report.created_at), { addSuffix: true, locale: ko })}
                </div>
              )}
            </>
          )}
        </aside>
      </div>
    </AppShell>
  );
}
