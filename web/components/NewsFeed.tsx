"use client";

import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

import { useMemo, useState } from "react";

import { NewsArticle } from "@/types/news";

type Props = {
  articles: NewsArticle[];
  symbols: string[];
  status: "idle" | "connecting" | "open" | "error";
};

type Status = Props["status"];

const statusMap: Record<Status, string> = {
  idle: "대기중",
  connecting: "연결중…",
  open: "실시간 업데이트 중",
  error: "연결 실패",
};

export function NewsFeed({ articles, symbols, status }: Props) {
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
    <section className="panel">
      <header className="panel__header">
        <div>
          <h2>뉴스 피드</h2>
          <p>{headline}</p>
          {symbols.length > 0 && (
            <div className="symbol-tags">
              {symbols.map((symbol) => (
                <button
                  type="button"
                  key={symbol}
                  className={`symbol-tag ${
                    filter === symbol ? "symbol-tag--active" : ""
                  }`}
                  onClick={() =>
                    setFilter((current) => (current === symbol ? null : symbol))
                  }
                >
                  {symbol}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="feed-controls">
          {filter && (
            <button
              type="button"
              className="clear-filter"
              onClick={() => setFilter(null)}
            >
              전체 보기
            </button>
          )}
          <span className={`status status--${status}`}>{statusMap[status]}</span>
        </div>
      </header>
      <div className="feed">
        {visibleArticles.length === 0 && (
          <p className="empty">
            최신 기사를 불러오는 중입니다. 잠시만 기다려 주세요.
          </p>
        )}
        {visibleArticles.map((article) => (
          <article key={`${article.symbol}-${article.id}`} className="card">
            <header>
              <span className="badge">{article.symbol}</span>
              {article.source && <span className="source">{article.source}</span>}
            </header>
            <a href={article.url} target="_blank" rel="noreferrer">
              <h3>{article.headline}</h3>
            </a>
            {article.summary && <p>{article.summary}</p>}
            <footer>
              {article.publishedAt && (
                <time dateTime={article.publishedAt}>
                  {formatDistanceToNow(new Date(article.publishedAt), {
                    addSuffix: true,
                    locale: ko,
                  })}
                </time>
              )}
            </footer>
          </article>
        ))}
      </div>
    </section>
  );
}
