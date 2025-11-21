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

import styles from "./page.module.css";

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
      <section className={`glass-panel ${styles.heroSection}`}>
        <div className={styles.heroContent}>
          <Badge tone="neutral" className={styles.heroBadge}>
            Smart Briefing
          </Badge>
          <h1 className={styles.heroTitle}>
            AI 투자 브리핑
          </h1>
          <p className={styles.heroDescription}>
            복잡한 뉴스 데이터를 AI가 분석하여 핵심 요약, 투자 심리, 리스크 요인을
            한눈에 보여드립니다.
          </p>

          <div className={styles.controls}>
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className={styles.select}
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
              className={styles.generateButton}
            >
              {isLoading ? "분석 중..." : "브리핑 생성"}
            </Button>
          </div>
          {error && (
            <p className={styles.errorMsg}>{error}</p>
          )}
        </div>
      </section>

      <div className={`dashboard-grid ${styles.gridContainer}`}>
        {parsedContent ? (
          <section className={`glass-panel ${styles.contentPanel}`}>
            <header className={styles.contentHeader}>
              <h2 className={styles.contentTitle}>핵심 요약</h2>
              <p className={styles.contentSubtitle}>AI가 선별한 주요 이슈입니다.</p>
            </header>
            <ul className={styles.summaryList}>
              {parsedContent.summary.map((item, idx) => (
                <li
                  key={idx}
                  className={`glass-card ${styles.summaryItem}`}
                >
                  <span className={styles.summaryNumber}>
                    {idx + 1}
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <div className={styles.outlookSection}>
              <h3 className={styles.sectionTitle}>시장 전망</h3>
              <p className={styles.outlookText}>
                {parsedContent.market_outlook}
              </p>
            </div>
          </section>
        ) : (
          <div className={`glass-panel ${styles.emptyState}`}>
            {selectedSymbol
              ? "브리핑 생성 버튼을 눌러 분석을 시작하거나,\n오른쪽에서 지난 브리핑을 선택하세요."
              : "워치리스트에서 종목을 선택해주세요."}
          </div>
        )}

        <aside className={styles.sidebar}>
          <BriefingHistory
            reports={reportHistory}
            currentReportId={report?.id || null}
            onSelectReport={handleSelectReport}
            label={`${selectedSymbol} 브리핑 히스토리`}
          />

          {parsedContent && (
            <>
              <section className={`glass-panel ${styles.sentimentPanel}`}>
                <h3 className={styles.sentimentTitle}>투자 심리 (Sentiment)</h3>
                <div className={styles.sentimentChart}>
                  <svg viewBox="0 0 36 36" className={styles.sentimentSvg}>
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
                    className={styles.sentimentValue}
                    style={{
                      color: sentimentColor(parsedContent.sentiment_score),
                    }}
                  >
                    {parsedContent.sentiment_score}
                  </div>
                </div>
                <p className={styles.sentimentReason}>
                  {parsedContent.sentiment_reason}
                </p>
              </section>

              <section className={`glass-panel ${styles.riskPanel}`}>
                <h3 className={styles.riskTitle}>
                  <span>⚠</span> 리스크 요인
                </h3>
                <ul className={styles.riskList}>
                  {parsedContent.key_risks.map((risk, idx) => (
                    <li key={idx} className={styles.riskItem}>
                      {risk}
                    </li>
                  ))}
                </ul>
              </section>

              {report && (
                <div className={styles.timestamp}>
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
