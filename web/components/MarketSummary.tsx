import { MarketSummary as MarketSummaryType } from "@/types/market";
import styles from "./MarketSummary.module.css";

interface MarketSummaryProps {
    data: MarketSummaryType | null;
    isLoading: boolean;
}

export function MarketSummary({ data, isLoading }: MarketSummaryProps) {
    if (isLoading) {
        return <div className={styles.loading}>시장 데이터 로딩 중...</div>;
    }

    if (!data) {
        return null;
    }

    return (
        <div className={styles.container}>
            <div className={styles.indicesSection}>
                <h3 className={styles.sectionTitle}>주요 지수</h3>
                <div className={styles.indicesGrid}>
                    {data.indices.map((index) => (
                        <div key={index.symbol} className={`glass-card ${styles.card}`}>
                            <div className={styles.cardHeader}>
                                <span className={styles.symbolName}>{index.name}</span>
                                <span className={styles.price}>{index.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className={`${styles.change} ${index.change >= 0 ? styles.up : styles.down}`}>
                                {index.change > 0 ? "+" : ""}{index.change.toFixed(2)} ({index.change_percent > 0 ? "+" : ""}{index.change_percent.toFixed(2)}%)
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className={styles.moversSection}>
                <h3 className={styles.sectionTitle}>내 관심 종목 급등락</h3>
                <div className={styles.moversGrid}>
                    <div className={styles.moverColumn}>
                        <h4 className={styles.columnTitle}>Top Gainers 🚀</h4>
                        {data.top_gainers.length > 0 ? (
                            data.top_gainers.map((mover) => (
                                <div key={mover.symbol} className={`glass-card ${styles.moverCard}`}>
                                    <span className={styles.moverSymbol}>{mover.symbol}</span>
                                    <span className={`${styles.moverChange} ${styles.up}`}>
                                        +{mover.change_percent.toFixed(2)}%
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div className={styles.emptyText}>상승 종목 없음</div>
                        )}
                    </div>
                    <div className={styles.moverColumn}>
                        <h4 className={styles.columnTitle}>Top Losers 📉</h4>
                        {data.top_losers.length > 0 ? (
                            data.top_losers.map((mover) => (
                                <div key={mover.symbol} className={`glass-card ${styles.moverCard}`}>
                                    <span className={styles.moverSymbol}>{mover.symbol}</span>
                                    <span className={`${styles.moverChange} ${styles.down}`}>
                                        {mover.change_percent.toFixed(2)}%
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div className={styles.emptyText}>하락 종목 없음</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
