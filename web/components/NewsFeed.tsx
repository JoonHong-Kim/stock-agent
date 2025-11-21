"use client";

import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { NewsArticle } from "@/types/news";

import styles from "./NewsFeed.module.css";

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
    <section className={`glass-panel ${styles.container} ${className ?? ""}`.trim()}>
      <header className={`panel-header ${styles.header}`}>
        <div>
          <div className={styles.titleRow}>
            <span className={styles.liveBadge}>
              <span className={styles.liveDot} />
              LIVE
            </span>
            <h2 className="panel-title">뉴스 피드</h2>
          </div>
          <p className={styles.headline}>{headline}</p>
          {symbols.length > 0 && (
            <div className={`symbol-tags ${styles.symbolTags}`}>
              {symbols.map((symbol) => (
                <button
                  type="button"
                  key={symbol}
                  className={`chip ${filter === symbol ? "active" : ""} ${styles.symbolChip} ${filter === symbol ? styles.symbolChipActive : ""}`}
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
        <span className={`status-pill ${status} ${styles.statusPill}`}>
          {statusText ?? statusMap[status]}
        </span>
      </header>
      <ul className={`feed-list ${styles.feedList}`}>
        {visibleArticles.length === 0 && (
          <li className={`feed-empty ${styles.emptyState}`}>
            최신 기사를 불러오는 중입니다. 잠시만 기다려 주세요.
          </li>
        )}
        {visibleArticles.map((article) => (
          <li key={`${article.symbol}-${article.id}`} className={`glass-card ${styles.articleCard}`}>
            <header className={styles.articleHeader}>
              <Badge tone="neutral">{article.symbol}</Badge>
              {article.source && <span className={`source ${styles.source}`}>{article.source}</span>}
            </header>
            <a href={article.url} target="_blank" rel="noreferrer" className={styles.articleLink}>
              <h3 className={styles.articleTitle}>{article.headline}</h3>
            </a>
            {article.summary && <p className={styles.articleSummary}>{article.summary}</p>}
            {article.publishedAt && (
              <time dateTime={article.publishedAt} className={styles.articleTime}>
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
