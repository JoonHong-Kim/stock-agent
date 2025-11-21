"use client";

import { FormEvent, useMemo, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

import styles from "./TickerSelector.module.css";

type Props = {
  watchlist: string[];
  selectedSymbols: string[];
  onToggleSymbol: (symbol: string) => void;
  onAdd: (symbol: string) => Promise<void>;
  onRemove: (symbol: string) => Promise<void>;
  isSubmitting: boolean;
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
  canRefresh: boolean;
  refreshError?: string | null;
  tickerOptions: Array<{ symbol: string; name?: string | null }>;
  onSearchTicker: (query: string) => void;
};

export function TickerSelector({
  watchlist,
  selectedSymbols,
  onToggleSymbol,
  onAdd,
  onRemove,
  isSubmitting,
  onRefresh,
  isRefreshing,
  canRefresh,
  refreshError,
  tickerOptions,
  onSearchTicker,
}: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const optionsToRender = useMemo(
    () => tickerOptions.slice(0, 20),
    [tickerOptions]
  );
  const showSuggestions = value.trim().length > 0 && optionsToRender.length > 0;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextValue = value.trim().toUpperCase();
    if (!nextValue) {
      setError("티커를 입력하세요.");
      return;
    }
    if (watchlist.includes(nextValue)) {
      setError("이미 추가된 티커입니다.");
      return;
    }
    try {
      setError(null);
      await onAdd(nextValue);
      setValue("");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <section className={`glass-panel ${styles.container}`}>
      <header className={`panel-header ${styles.header}`}>
        <h2 className={`panel-title ${styles.title}`}>관심 종목</h2>
        <Button
          variant="ghost"
          type="button"
          onClick={() => {
            void onRefresh();
          }}
          disabled={!canRefresh || isRefreshing}
          className={styles.refreshButton}
        >
          {isRefreshing ? "..." : "새로고침"}
        </Button>
      </header>

      <form className={`ticker-form ${styles.form}`} onSubmit={handleSubmit}>
        <div className={styles.inputWrapper}>
          <input
            className={`input ${styles.input}`}
            placeholder="티커 추가 (예: AAPL)"
            value={value}
            onChange={(event) => {
              const next = event.target.value;
              setValue(next);
              onSearchTicker(next);
            }}
            disabled={isSubmitting}
          />
          {showSuggestions && (
            <div className={`ticker-suggestions ${styles.suggestions}`}>
              {optionsToRender.map((option) => (
                <button
                  type="button"
                  key={option.symbol}
                  className={`ticker-suggestion ${styles.suggestionItem}`}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    const symbol = option.symbol.toUpperCase();
                    setValue(symbol);
                    onSearchTicker(symbol);
                  }}
                >
                  <span className={styles.suggestionSymbol}>{option.symbol}</span>
                  {option.name && (
                    <span className={styles.suggestionName}>
                      {option.name}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        <Button type="submit" disabled={isSubmitting} variant="solid" className={styles.addButton}>
          +
        </Button>
      </form>

      {error && <p className={`error-banner ${styles.errorBanner}`}>{error}</p>}
      {refreshError && <p className={`error-banner ${styles.errorBanner}`}>{refreshError}</p>}

      <ul className={`ticker-list ${styles.tickerList}`}>
        {watchlist.length === 0 && <li className={styles.emptyState}>관심 종목을 추가해보세요.</li>}
        {watchlist.map((symbol) => {
          const isSelected = selectedSymbols.includes(symbol);
          return (
            <li key={symbol} className={styles.tickerItem}>
              <button
                type="button"
                onClick={() => onToggleSymbol(symbol)}
                className={`${styles.tickerButton} ${isSelected ? styles.tickerButtonSelected : ""}`}
              >
                <div className={`${styles.checkbox} ${isSelected ? styles.checkboxSelected : ""}`}>
                  {isSelected && <span className={styles.checkmark}>✓</span>}
                </div>
                {symbol}
              </button>
              <button
                type="button"
                onClick={() => {
                  void onRemove(symbol);
                }}
                disabled={isSubmitting}
                className={styles.removeButton}
                title="삭제"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
