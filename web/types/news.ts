export interface NewsArticle {
  id: number;
  symbol: string;
  headline: string;
  summary?: string | null;
  url: string;
  source?: string | null;
  publishedAt?: string | null;
}

export interface WatchlistEntry {
  id: number;
  symbol: string;
  created_at: string;
}
