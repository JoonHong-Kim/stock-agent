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
                        Aggregate Briefing
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
                        워치리스트 종합 브리핑
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
                        관심 종목 전체의 시장 흐름과 주요 테마를 AI가 한눈에 정리합니다.
                    </p>

                    <Button
                        variant="solid"
                        onClick={handleGenerate}
                        disabled={isLoading}
                        style={{ padding: "0.8rem 2rem", fontSize: "1rem" }}
                    >
                        {isLoading ? "분석 중..." : "종합 브리핑 생성"}
                    </Button>
                    {error && <p style={{ color: "#f87171", marginTop: "1rem" }}>{error}</p>}
                </div>
            </section>

            <div className="dashboard-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "2rem" }}>
                {parsedContent ? (
                    <section className="glass-panel" style={{ padding: "2rem" }}>
                        <header style={{ marginBottom: "2rem" }}>
                            <h2 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>시장 요약</h2>
                            <p style={{ color: "#94a3b8" }}>워치리스트 종목들의 전반적인 흐름</p>
                        </header>
                        <div className="glass-card" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
                            <p style={{ fontSize: "1.1rem", lineHeight: "1.7", color: "#cbd5e1" }}>
                                {parsedContent.market_summary}
                            </p>
                        </div>

                        <h3 style={{ fontSize: "1.4rem", marginBottom: "1rem" }}>주요 테마</h3>
                        <ul style={{ listStyle: "none", padding: 0, marginBottom: "2rem" }}>
                            {parsedContent.key_themes.map((theme, idx) => (
                                <li
                                    key={idx}
                                    className="glass-card"
                                    style={{
                                        padding: "1rem 1.5rem",
                                        marginBottom: "0.75rem",
                                        fontSize: "1rem",
                                        display: "flex",
                                        gap: "1rem",
                                        alignItems: "center",
                                    }}
                                >
                                    <span style={{ color: "var(--color-primary)", fontSize: "1.5rem" }}>●</span>
                                    {theme}
                                </li>
                            ))}
                        </ul>

                        <h3 style={{ fontSize: "1.4rem", marginBottom: "1rem" }}>종목별 인사이트</h3>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
                            {Object.entries(parsedContent.individual_insights).map(([symbol, insight]) => (
                                <div key={symbol} className="glass-card" style={{ padding: "1.5rem" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                                        <h4 style={{ fontSize: "1.2rem", fontWeight: "bold" }}>{symbol}</h4>
                                        <Badge
                                            tone={insight.sentiment >= 70 ? "success" : insight.sentiment <= 30 ? "danger" : "warning"}
                                            style={{ fontSize: "0.9rem" }}
                                        >
                                            {insight.sentiment}
                                        </Badge>
                                    </div>
                                    <p style={{ fontSize: "0.95rem", color: "#cbd5e1", lineHeight: "1.5" }}>
                                        {insight.one_liner}
                                    </p>
                                </div>
                            ))}
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
                        종합 브리핑 생성 버튼을 눌러 분석을 시작하거나,<br />오른쪽에서 지난 브리핑을 선택하세요.
                    </div>
                )}

                <aside style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                    <BriefingHistory
                        reports={reportHistory}
                        currentReportId={report?.id || null}
                        onSelectReport={handleSelectReport}
                        label="지난 브리핑"
                    />

                    {parsedContent && (
                        <>
                            <section className="glass-panel" style={{ padding: "2rem", textAlign: "center" }}>
                                <h3 style={{ fontSize: "1.2rem", color: "#94a3b8", marginBottom: "1rem" }}>전체 투자 심리</h3>
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
                                            stroke={sentimentColor(parsedContent.overall_sentiment)}
                                            strokeWidth="3"
                                            strokeDasharray={`${parsedContent.overall_sentiment}, 100`}
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
                                            color: sentimentColor(parsedContent.overall_sentiment),
                                        }}
                                    >
                                        {parsedContent.overall_sentiment}
                                    </div>
                                </div>
                                <p style={{ marginTop: "1rem", fontSize: "0.9rem", color: "#cbd5e1" }}>
                                    {parsedContent.overall_sentiment_reason}
                                </p>
                            </section>

                            <section className="glass-panel" style={{ padding: "2rem" }}>
                                <h3 style={{ fontSize: "1.2rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <span>📈</span> 주요 변동 종목
                                </h3>
                                <ul style={{ listStyle: "none", padding: 0 }}>
                                    {parsedContent.top_movers.map((symbol, idx) => (
                                        <li
                                            key={idx}
                                            style={{
                                                padding: "0.75rem",
                                                marginBottom: "0.5rem",
                                                borderRadius: "0.5rem",
                                                background: "rgba(30, 41, 59, 0.3)",
                                                fontSize: "1.1rem",
                                                fontWeight: "bold",
                                                color: "var(--color-primary)",
                                            }}
                                        >
                                            {symbol}
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
