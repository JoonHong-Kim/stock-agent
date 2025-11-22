import { env } from "@/config/env";
import { NewsArticle, TickerOption, WatchlistEntry } from "@/types/news";
import { MarketSummary } from "@/types/market";
import { handleHttpResponse } from "./http";

export async function fetchMarketSummary(): Promise<MarketSummary> {
  const res = await fetch(`${env.backendHttpUrl}/api/market/summary`);
  return handleHttpResponse(res);
}

export async function fetchWatchlist(): Promise<WatchlistEntry[]> {
  const response = await fetch(`${env.backendHttpUrl}/api/watchlist`, {
    next: { revalidate: 0 },
  });
  return handleHttpResponse(response);
}

export async function addToWatchlist(
  symbol: string
): Promise<WatchlistEntry[]> {
  const response = await fetch(`${env.backendHttpUrl}/api/watchlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbols: [symbol] }),
  });
  return handleHttpResponse(response);
}

export async function removeFromWatchlist(symbol: string): Promise<void> {
  const response = await fetch(
    `${env.backendHttpUrl}/api/watchlist/${symbol.toUpperCase()}`,
    {
      method: "DELETE",
    }
  );
  if (!response.ok) {
    throw new Error("Failed to delete symbol");
  }
}

export async function fetchNews(symbols: string[]): Promise<NewsArticle[]> {
  if (!symbols.length) {
    return [];
  }
  const params = new URLSearchParams();
  params.set("symbols", symbols.join(","));
  const response = await fetch(
    `${env.backendHttpUrl}/api/news?${params.toString()}`
  );
  const payload = await handleHttpResponse<NewsApiResponse>(response);
  return payload.map(mapArticle);
}

export async function refreshNewsNow(
  symbols: string[]
): Promise<NewsArticle[]> {
  const response = await fetch(`${env.backendHttpUrl}/api/news/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbols }),
  });
  const payload = await handleHttpResponse<NewsApiResponse>(response);
  return payload.map(mapArticle);
}

export async function fetchTickers(
  query?: string
): Promise<TickerOption[]> {
  const search = new URLSearchParams();
  if (query) {
    search.set("query", query);
  }
  const response = await fetch(
    `${env.backendHttpUrl}/api/tickers?${search.toString()}`
  );
  return handleHttpResponse<TickerOption[]>(response);
}

type NewsApiResponse = Array<{
  id: number;
  symbol: string;
  headline: string;
  summary?: string | null;
  url: string;
  source?: string | null;
  published_at?: string | null;
}>;

function mapArticle(article: NewsApiResponse[number]): NewsArticle {
  return {
    id: article.id,
    symbol: article.symbol,
    headline: article.headline,
    summary: article.summary,
    url: article.url,
    source: article.source,
    publishedAt: article.published_at,
  };
}
