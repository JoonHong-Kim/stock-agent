"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

import { generateAggregateReport, fetchReports } from "@/api/reports";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { BriefingHistory } from "@/components/briefing/BriefingHistory";
import { Report, AggregateBriefingContent } from "@/types/reports";

import styles from "./page.module.css";

export default function AggregateBriefingPage() {
    const [report, setReport] = useState<Report | null>(null);
    const [parsedContent, setParsedContent] = useState<AggregateBriefingContent | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [reportHistory, setReportHistory] = useState<Report[]>([]);

    useEffect(() => {
        // Load all aggregate reports (symbol = WATCHLIST)
        fetchReports({ symbol: "WATCHLIST", limit: 20 })
            .then((reports) => {
                setReportHistory(reports);
                if (reports.length > 0) {
                    setReport(reports[0]); // Show latest by default
                }
            })
            .catch((err) => console.error("Failed to fetch aggregates:", err));
    }, []);

    useEffect(() => {
        if (report) {
            try {
                const parsed = JSON.parse(report.content) as AggregateBriefingContent;
                setParsedContent(parsed);
            } catch (e) {
                console.error("Failed to parse aggregate content:", e);
                setParsedContent(null);
            }
        } else {
            setParsedContent(null);
        }
    }, [report]);

    const handleGenerate = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const newReport = await generateAggregateReport();
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
        if (score >= 70) return "#34d399";
        if (score <= 30) return "#f87171";
        return "#fbbf24";
    };

    return (
        <AppShell active="aggregate" actionHref="/" actionLabel="실시간 스트림">
            <section className={`glass-panel ${styles.heroSection}`}>
                <div className={styles.heroContent}>
                    <Badge tone="neutral" className={styles.heroBadge}>
                        Aggregate Briefing
                    </Badge>
                    <h1 className={styles.heroTitle}>
                        워치리스트 종합 브리핑
                    </h1>
                    <p className={styles.heroDescription}>
                        관심 종목 전체의 시장 흐름과 주요 테마를 AI가 한눈에 정리합니다.
                    </p>

                    <Button
                        variant="solid"
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className={styles.generateButton}
                    >
                        {isLoading ? "분석 중..." : "종합 브리핑 생성"}
                    </Button>
                    {error && <p className={styles.errorMsg}>{error}</p>}
                </div>
            </section>

            <div className={`dashboard-grid ${styles.gridContainer}`}>
                {parsedContent ? (
                    <section className={`glass-panel ${styles.contentPanel}`}>
                        <header className={styles.contentHeader}>
                            <h2 className={styles.contentTitle}>시장 요약</h2>
                            <p className={styles.contentSubtitle}>워치리스트 종목들의 전반적인 흐름</p>
                        </header>
                        <div className={`glass-card ${styles.marketSummaryCard}`}>
                            <p className={styles.marketSummaryText}>
                                {parsedContent.market_summary}
                            </p>
                        </div>

                        <h3 className={styles.sectionTitle}>주요 테마</h3>
                        <ul className={styles.themeList}>
                            {parsedContent.key_themes.map((theme, idx) => (
                                <li
                                    key={idx}
                                    className={`glass-card ${styles.themeItem}`}
                                >
                                    <span className={styles.themeBullet}>●</span>
                                    {theme}
                                </li>
                            ))}
                        </ul>

                        <h3 className={styles.sectionTitle}>종목별 인사이트</h3>
                        <div className={styles.insightsGrid}>
                            {Object.entries(parsedContent.individual_insights).map(([symbol, insight]) => (
                                <div key={symbol} className={`glass-card ${styles.insightCard}`}>
                                    <div className={styles.insightHeader}>
                                        <h4 className={styles.insightSymbol}>{symbol}</h4>
                                        <Badge
                                            tone={insight.sentiment >= 70 ? "success" : insight.sentiment <= 30 ? "danger" : "warning"}
                                            className={styles.insightBadge}
                                        >
                                            {insight.sentiment}
                                        </Badge>
                                    </div>
                                    <p className={styles.insightText}>
                                        {insight.one_liner}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : (
                    <div className={`glass-panel ${styles.emptyState}`}>
                        종합 브리핑 생성 버튼을 눌러 분석을 시작하거나,<br />오른쪽에서 지난 브리핑을 선택하세요.
                    </div>
                )}

                <aside className={styles.sidebar}>
                    <BriefingHistory
                        reports={reportHistory}
                        currentReportId={report?.id || null}
                        onSelectReport={handleSelectReport}
                        label="지난 브리핑"
                    />

                    {parsedContent && (
                        <>
                            <section className={`glass-panel ${styles.sentimentPanel}`}>
                                <h3 className={styles.sentimentTitle}>전체 투자 심리</h3>
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
                                            stroke={sentimentColor(parsedContent.overall_sentiment)}
                                            strokeWidth="3"
                                            strokeDasharray={`${parsedContent.overall_sentiment}, 100`}
                                        />
                                    </svg>
                                    <div
                                        className={styles.sentimentValue}
                                        style={{
                                            color: sentimentColor(parsedContent.overall_sentiment),
                                        }}
                                    >
                                        {parsedContent.overall_sentiment}
                                    </div>
                                </div>
                                <p className={styles.sentimentReason}>
                                    {parsedContent.overall_sentiment_reason}
                                </p>
                            </section>

                            <section className={`glass-panel ${styles.moversPanel}`}>
                                <h3 className={styles.moversTitle}>
                                    <span>📈</span> 주요 변동 종목
                                </h3>
                                <ul className={styles.moversList}>
                                    {parsedContent.top_movers.map((symbol, idx) => (
                                        <li
                                            key={idx}
                                            className={styles.moverItem}
                                        >
                                            {symbol}
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
