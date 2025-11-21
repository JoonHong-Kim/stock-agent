import { format, isToday, isYesterday } from "date-fns";
import { ko } from "date-fns/locale";
import { Report } from "@/types/reports";

type Props = {
    reports: Report[];
    currentReportId: number | null;
    onSelectReport: (report: Report) => void;
    label?: string;
};

export function BriefingHistory({ reports, currentReportId, onSelectReport, label = "히스토리" }: Props) {
    if (reports.length === 0) {
        return null;
    }

    // Group reports by date
    const groupedReports = reports.reduce((groups, report) => {
        const date = new Date(report.created_at);
        const dateKey = format(date, "yyyy-MM-dd");
        if (!groups[dateKey]) {
            groups[dateKey] = [];
        }
        groups[dateKey].push(report);
        return groups;
    }, {} as Record<string, Report[]>);

    const sortedDates = Object.keys(groupedReports).sort((a, b) => b.localeCompare(a));

    const getDateLabel = (dateStr: string) => {
        const date = new Date(dateStr);
        if (isToday(date)) return "오늘";
        if (isYesterday(date)) return "어제";
        return format(date, "M월 d일 (eee)", { locale: ko });
    };

    return (
        <section className="glass-panel" style={{ padding: "1.5rem", maxHeight: "600px", overflowY: "auto" }}>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "1.5rem", color: "#94a3b8", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span>🕒</span> {label}
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                {sortedDates.map((dateKey) => (
                    <div key={dateKey}>
                        <div style={{
                            fontSize: "0.85rem",
                            color: "#64748b",
                            marginBottom: "0.75rem",
                            paddingLeft: "0.5rem",
                            borderLeft: "2px solid #334155"
                        }}>
                            {getDateLabel(dateKey)}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            {groupedReports[dateKey].map((report) => {
                                const isActive = report.id === currentReportId;
                                const timeLabel = format(new Date(report.created_at), "a h:mm", { locale: ko });

                                return (
                                    <button
                                        key={report.id}
                                        onClick={() => onSelectReport(report)}
                                        style={{
                                            padding: "0.75rem 1rem",
                                            borderRadius: "0.75rem",
                                            background: isActive
                                                ? "linear-gradient(90deg, rgba(59, 130, 246, 0.15), rgba(59, 130, 246, 0.05))"
                                                : "rgba(30, 41, 59, 0.3)",
                                            border: isActive
                                                ? "1px solid rgba(59, 130, 246, 0.4)"
                                                : "1px solid transparent",
                                            color: isActive ? "#60a5fa" : "#cbd5e1",
                                            cursor: "pointer",
                                            textAlign: "left",
                                            transition: "all 0.2s ease",
                                            fontSize: "0.9rem",
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            width: "100%"
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isActive) {
                                                e.currentTarget.style.background = "rgba(30, 41, 59, 0.5)";
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isActive) {
                                                e.currentTarget.style.background = "rgba(30, 41, 59, 0.3)";
                                            }
                                        }}
                                    >
                                        <span style={{ fontWeight: isActive ? "600" : "400" }}>
                                            {report.symbol === "WATCHLIST" ? "종합 브리핑" : `${report.symbol} 브리핑`}
                                        </span>
                                        <span style={{ fontSize: "0.8rem", color: isActive ? "#93c5fd" : "#64748b" }}>
                                            {timeLabel}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
