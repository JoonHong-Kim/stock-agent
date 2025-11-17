import { useEffect, useMemo, useState } from "react";

import { fetchNews } from "@/api/client";
import { env } from "@/config/env";
import { NewsArticle } from "@/types/news";

type Status = "idle" | "connecting" | "open" | "error";

export function useNewsStream(symbols: string[]) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [status, setStatus] = useState<Status>("idle");

  const subscriptionKey = useMemo(
    () => symbols.map((symbol) => symbol.toUpperCase()).sort().join(","),
    [symbols]
  );

  useEffect(() => {
    if (!subscriptionKey) {
      setArticles([]);
      setStatus("idle");
      return;
    }
    let cancelled = false;
    setStatus("connecting");

    fetchNews(symbols)
      .then((initial) => {
        if (!cancelled) {
          setArticles(sortArticles(initial));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [subscriptionKey, symbols]);

  useEffect(() => {
    if (!subscriptionKey) {
      return;
    }
    const url = `${env.backendWsUrl}?symbols=${encodeURIComponent(
      subscriptionKey
    )}`;
    const socket = new WebSocket(url);

    socket.onopen = () => setStatus("open");
    socket.onerror = () => setStatus("error");
    socket.onclose = () => setStatus((prev) => (prev === "error" ? prev : "idle"));
    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data) as WebSocketPayload;
      if (!payload.articles) {
        return;
      }
      setArticles((previous) => {
        const merged = new Map<number, NewsArticle>();
        for (const article of previous) {
          merged.set(article.id, article);
        }
        for (const item of payload.articles) {
          merged.set(item.id, mapSocketArticle(item));
        }
        return sortArticles(Array.from(merged.values()));
      });
    };

    return () => {
      socket.close();
    };
  }, [subscriptionKey]);

  return { articles, status };
}

type WebSocketPayload = {
  symbol: string;
  articles: Array<{
    id: number;
    symbol: string;
    headline: string;
    summary?: string | null;
    url: string;
    source?: string | null;
    published_at?: string | null;
  }>;
};

function mapSocketArticle(item: WebSocketPayload["articles"][number]): NewsArticle {
  return {
    id: item.id,
    symbol: item.symbol,
    headline: item.headline,
    summary: item.summary,
    url: item.url,
    source: item.source,
    publishedAt: item.published_at,
  };
}

function sortArticles(entries: NewsArticle[]): NewsArticle[] {
  return [...entries].sort((a, b) => {
    const aTime = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const bTime = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return bTime - aTime;
  });
}
