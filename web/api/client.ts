import { env } from "@/config/env";
import { NewsArticle, TickerOption, WatchlistEntry } from "@/types/news";

async function handleResponse<T>(response: Response): Promise<T> {
  const body = await response.text();
  if (!response.ok) {
    let message = "API request failed";
    if (body) {
      try {
        const parsed = JSON.parse(body);
        if (typeof parsed?.detail === "string") {
          message = parsed.detail;
        } else if (typeof parsed?.message === "string") {
          message = parsed.message;
        } else {
          message = body;
        }
      } catch {
        message = body;
      }
    }
    throw new Error(message);
  }

  if (!body) {
    return {} as T;
  }
  try {
    return JSON.parse(body) as T;
  } catch {
    return body as unknown as T;
  }
}

export async function fetchWatchlist(): Promise<WatchlistEntry[]> {
  const response = await fetch(`${env.backendHttpUrl}/api/watchlist`, {
    next: { revalidate: 0 },
  });
  return handleResponse(response);
}

export async function addToWatchlist(
  symbol: string
): Promise<WatchlistEntry[]> {
  const response = await fetch(`${env.backendHttpUrl}/api/watchlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbols: [symbol] }),
  });
  return handleResponse(response);
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
  const payload = await handleResponse<NewsApiResponse>(response);
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
  const payload = await handleResponse<NewsApiResponse>(response);
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
  return handleResponse<TickerOption[]>(response);
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
