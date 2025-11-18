"use client";

import { useCallback, useEffect, useState } from "react";

import {
  addToWatchlist,
  fetchWatchlist,
  fetchTickers,
  refreshNewsNow,
  removeFromWatchlist,
} from "@/api/client";
import { NewsFeed } from "@/components/NewsFeed";
import { TickerSelector } from "@/components/TickerSelector";
import { useNewsStream } from "@/hook/useNewsStream";
import { TickerOption, WatchlistEntry } from "@/types/news";

export default function HomePage() {
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [tickerOptions, setTickerOptions] = useState<TickerOption[]>([]);
  const [tickerQuery, setTickerQuery] = useState("");

  useEffect(() => {
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

  return (
    <main className="container">
      <header className="hero">
        <div>
          <p className="eyebrow">실시간 주식 뉴스</p>
          <h1>선택한 종목의 뉴스를 한 곳에서</h1>
          <p>
            관심 있는 티커를 추가하고 실시간 업데이트로 최신 뉴스를
            받아보세요.
          </p>
        </div>
      </header>
      <div className="grid">
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
        <NewsFeed
          articles={articles}
          symbols={selectedSymbols}
          status={status}
        />
      </div>
    </main>
  );
}
