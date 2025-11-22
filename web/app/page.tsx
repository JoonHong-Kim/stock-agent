"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  addToWatchlist,
  fetchWatchlist,
  fetchTickers,
  refreshNewsNow,
  removeFromWatchlist,
  fetchMarketSummary,
} from "@/api/client";
import { NewsFeed } from "@/components/NewsFeed";
import { TickerSelector } from "@/components/TickerSelector";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { useNewsStream } from "@/hook/useNewsStream";
import { TickerOption, WatchlistEntry } from "@/types/news";
import { MarketSummary } from "@/components/MarketSummary";
import { MarketSummary as MarketSummaryType } from "@/types/market";

import styles from "./page.module.css";

const STATUS_TEXT: Record<string, string> = {
  idle: "대기 중",
  connecting: "채널 연결 중",
  open: "🔄 실시간 업데이트 중",
  error: "연결에 문제가 있습니다",
};

export default function HomePage() {
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [tickerOptions, setTickerOptions] = useState<TickerOption[]>([]);
  const [tickerQuery, setTickerQuery] = useState("");
  const previousArticleCount = useRef(0);
  const [newsDelta, setNewsDelta] = useState(0);

  // Market Summary State
  const [marketSummary, setMarketSummary] = useState<MarketSummaryType | null>(null);
  const [isMarketLoading, setIsMarketLoading] = useState(true);

  useEffect(() => {
    // Fetch market summary
    fetchMarketSummary()
      .then(setMarketSummary)
      .catch((err) => console.error("Failed to fetch market summary", err))
      .finally(() => setIsMarketLoading(false));

    fetchWatchlist()
      .then((entries) => {
        const symbols = entries.map((entry) => entry.symbol);
        setWatchlist(symbols);
        setSelectedSymbols(symbols);
      })
      .catch(() => {
        setWatchlist([]);
      });
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchTickers(tickerQuery || undefined)
        .then((options) => setTickerOptions(options))
        .catch(() => setTickerOptions([]));
    }, 200);
    return () => clearTimeout(handler);
  }, [tickerQuery]);

  useEffect(() => {
    setRefreshError((current) => (current ? null : current));
  }, [selectedSymbols]);

  const { articles, status } = useNewsStream(selectedSymbols);
  useEffect(() => {
    const previous = previousArticleCount.current;
    setNewsDelta(articles.length - previous);
    previousArticleCount.current = articles.length;
  }, [articles.length]);

  const handleSearchTickers = useCallback((query: string) => {
    setTickerQuery(query.trim());
  }, []);

  const handleAdd = async (symbol: string) => {
    setIsSubmitting(true);
    try {
      const entries = await addToWatchlist(symbol);
      updateWatchlist(entries);
      setSelectedSymbols((prev) =>
        prev.includes(symbol) ? prev : [...prev, symbol]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (symbol: string) => {
    setIsSubmitting(true);
    try {
      await removeFromWatchlist(symbol);
      setWatchlist((prev) => prev.filter((item) => item !== symbol));
      setSelectedSymbols((prev) => prev.filter((item) => item !== symbol));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefreshNow = async () => {
    if (!selectedSymbols.length) {
      return;
    }
    setIsRefreshing(true);
    setRefreshError(null);
    try {
      await refreshNewsNow(selectedSymbols);
    } catch (error) {
      setRefreshError((error as Error).message || "뉴스를 불러오지 못했습니다.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const updateWatchlist = (entries: WatchlistEntry[]) => {
    const symbols = entries.map((entry) => entry.symbol);
    setWatchlist(symbols);
  };

  const handleToggle = (symbol: string) => {
    setSelectedSymbols((prev) =>
      prev.includes(symbol)
        ? prev.filter((item) => item !== symbol)
        : [...prev, symbol]
    );
  };

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
