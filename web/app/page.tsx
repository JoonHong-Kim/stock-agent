"use client";

import { NewsFeed } from "@/components/NewsFeed";
import { TickerSelector } from "@/components/TickerSelector";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { useDashboard } from "@/hook/useDashboard";
import { MarketSummary } from "@/components/MarketSummary";

import styles from "./page.module.css";

const STATUS_TEXT: Record<string, string> = {
  idle: "대기 중",
  connecting: "채널 연결 중",
  open: "🔄 실시간 업데이트 중",
  error: "연결에 문제가 있습니다",
};

export default function HomePage() {
  const {
    watchlist,
    selectedSymbols,
    isSubmitting,
    isRefreshing,
    refreshError,
    tickerOptions,
    marketSummary,
    isMarketLoading,
    articles,
    status,
    handleSearchTickers,
    handleAdd,
    handleRemove,
    handleRefreshNow,
    handleToggle,
  } = useDashboard();

  const streamStatusText = STATUS_TEXT[status] ?? STATUS_TEXT.idle;

  return (
    <AppShell active="stream">
      <section className={`glass-panel ${styles.heroSection}`}>
        <div className={styles.heroContent}>
          <Badge tone="neutral" className={styles.heroBadge}>Real-Time Stream</Badge>
          <h1 className={styles.heroTitle}>실시간 시장 모니터</h1>
          <p className={styles.heroDescription}>
            관심 종목의 뉴스 및 변동성을 실시간으로 감지하여, 잠재적 위험에 즉각 대응할 수 있도록 돕는 스트림 서비스입니다.
          </p>

          <div className={`hero-meta ${styles.heroMeta}`}>
            <span className={styles.heroMetaText}>리스크 관리와 속보 확인을 동시에</span>
            <div className={`dashboard-hero__actions ${styles.heroActions}`}>
              <Button
                type="button"
                variant="solid"
                onClick={() => {
                  void handleRefreshNow();
                }}
                disabled={!selectedSymbols.length || isRefreshing}
              >
                {isRefreshing ? "새로고침 중..." : "스트림 새로고침"}
              </Button>
              <ButtonLink variant="secondary" href="/briefing/aggregate">
                Daily Briefing 보러가기
              </ButtonLink>
            </div>
          </div>
        </div>

        {/* Market Summary */}
        <div className={styles.marketSummaryWrapper}>
          <MarketSummary data={marketSummary} isLoading={isMarketLoading} />
        </div>

        {/* Decorative background element */}
        <div className={styles.heroDecoration} />
      </section>

      <section className={`stream-panel ${styles.streamPanel}`}>
        <div className={`watchlist-panel ${styles.watchlistPanel}`}>
          <TickerSelector
            watchlist={watchlist}
            selectedSymbols={selectedSymbols}
            onToggleSymbol={handleToggle}
            onAdd={handleAdd}
            onRemove={handleRemove}
            isSubmitting={isSubmitting}
            onRefresh={handleRefreshNow}
            isRefreshing={isRefreshing}
            canRefresh={selectedSymbols.length > 0}
            refreshError={refreshError}
            tickerOptions={tickerOptions}
            onSearchTicker={handleSearchTickers}
          />
        </div>
        <NewsFeed
          className={`stream-feed ${styles.streamFeed}`}
          articles={articles}
          symbols={selectedSymbols}
          status={status}
          statusText={streamStatusText}
        />
      </section>
    </AppShell>
  );
}
