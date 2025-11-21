import { format, isToday, isYesterday } from "date-fns";
import { ko } from "date-fns/locale";
import { Report } from "@/types/reports";

import styles from "./BriefingHistory.module.css";

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
        <section className={`glass-panel ${styles.container}`}>
            <h3 className={styles.title}>
                <span>🕒</span> {label}
            </h3>

            <div className={styles.list}>
                {sortedDates.map((dateKey) => (
                    <div key={dateKey}>
                        <div className={styles.dateLabel}>
                            {getDateLabel(dateKey)}
                        </div>
                        <div className={styles.group}>
                            {groupedReports[dateKey].map((report) => {
                                const isActive = report.id === currentReportId;
                                const timeLabel = format(new Date(report.created_at), "a h:mm", { locale: ko });

                                return (
                                    <button
                                        key={report.id}
                                        onClick={() => onSelectReport(report)}
                                        className={`${styles.item} ${isActive ? styles.itemActive : ""}`}
                                    >
                                        <span className={isActive ? styles.itemLabelActive : styles.itemLabel}>
                                            {report.symbol === "WATCHLIST" ? "종합 브리핑" : `${report.symbol} 브리핑`}
                                        </span>
                                        <span className={isActive ? styles.itemTimeActive : styles.itemTime}>
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
