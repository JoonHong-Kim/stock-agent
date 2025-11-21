"use client";

import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { NewsArticle } from "@/types/news";

type Props = {
  articles: NewsArticle[];
  symbols: string[];
  status: "idle" | "connecting" | "open" | "error";
  statusText?: string;
  className?: string;
};

type Status = Props["status"];

const statusMap: Record<Status, string> = {
  idle: "대기중",
  connecting: "연결중…",
  open: "실시간 업데이트 중",
  error: "연결 실패",
};

export function NewsFeed({
  articles,
  symbols,
  status,
  statusText,
  className,
}: Props) {
  const [filter, setFilter] = useState<string | null>(null);
  const visibleArticles = useMemo(() => {
    if (!filter) {
      return articles;
    }
    return articles.filter((article) => article.symbol === filter);
  }, [articles, filter]);

  const headline = filter
    ? `${filter} 관련 뉴스만 표시 중`
    : symbols.length
      ? "관심 종목별 최신 기사"
      : "티커를 선택해주세요";

  return (
    <section className={`glass-panel ${className ?? ""}`.trim()} style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
      <header className="panel-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{
              background: 'rgba(239, 68, 68, 0.2)',
              color: '#f87171',
              padding: '0.2rem 0.6rem',
              borderRadius: '999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}>
              <span style={{ width: '6px', height: '6px', background: 'currentColor', borderRadius: '50%', animation: 'pulse 1.5s infinite' }} />
              LIVE
            </span>
            <h2 className="panel-title">뉴스 피드</h2>
          </div>
          <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>{headline}</p>
          {symbols.length > 0 && (
            <div className="symbol-tags" style={{ marginTop: '0.8rem' }}>
              {symbols.map((symbol) => (
                <button
                  type="button"
                  key={symbol}
                  className={`chip ${filter === symbol ? "active" : ""}`}
                  onClick={() =>
                    setFilter((current) => (current === symbol ? null : symbol))
                  }
                  style={{
                    background: filter === symbol ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.05)',
                    color: filter === symbol ? 'white' : 'var(--color-text-secondary)',
                    border: '1px solid rgba(148, 163, 184, 0.1)',
                    padding: '0.3rem 0.8rem',
                    borderRadius: '999px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    transition: 'all 0.2s'
                  }}
                >
                  {symbol}
                </button>
              ))}
            </div>
          )}
        </div>
        <span className={`status-pill ${status}`} style={{
          background: 'rgba(15, 23, 42, 0.4)',
          border: '1px solid rgba(148, 163, 184, 0.1)',
          padding: '0.4rem 0.8rem',
          borderRadius: '999px',
          fontSize: '0.85rem'
        }}>
          {statusText ?? statusMap[status]}
        </span>
      </header>
      <ul className="feed-list" style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
        {visibleArticles.length === 0 && (
          <li className="feed-empty" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            최신 기사를 불러오는 중입니다. 잠시만 기다려 주세요.
          </li>
        )}
        {visibleArticles.map((article) => (
          <li key={`${article.symbol}-${article.id}`} className="glass-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <Badge tone="neutral">{article.symbol}</Badge>
              {article.source && <span className="source" style={{ fontSize: '0.8rem', color: '#64748b' }}>{article.source}</span>}
            </header>
            <a href={article.url} target="_blank" rel="noreferrer" style={{ display: 'block', marginBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', lineHeight: '1.4', color: 'white' }}>{article.headline}</h3>
            </a>
            {article.summary && <p style={{ fontSize: '0.95rem', color: '#94a3b8', lineHeight: '1.6' }}>{article.summary}</p>}
            {article.publishedAt && (
              <time dateTime={article.publishedAt} style={{ display: 'block', marginTop: '0.8rem', fontSize: '0.8rem', color: '#64748b' }}>
                {formatDistanceToNow(new Date(article.publishedAt), {
                  addSuffix: true,
                  locale: ko,
                })}
              </time>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
