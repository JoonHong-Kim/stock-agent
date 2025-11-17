"use client";

import { FormEvent, useState } from "react";

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
}: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

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
    <section className="panel">
      <header className="panel__header">
        <div>
          <h2>관심 종목</h2>
          <p>추가하거나 선택하여 실시간 뉴스를 확인하세요.</p>
        </div>
        <button
          type="button"
          className="refresh-btn"
          onClick={() => {
            void onRefresh();
          }}
          disabled={!canRefresh || isRefreshing}
        >
          {isRefreshing ? "가져오는 중..." : "지금 뉴스 가져오기"}
        </button>
        {refreshError && <span className="error">{refreshError}</span>}
        <form className="ticker-form" onSubmit={handleSubmit}>
          <input
            placeholder="예: AAPL"
            value={value}
            onChange={(event) => setValue(event.target.value.toUpperCase())}
            disabled={isSubmitting}
          />
          <button type="submit" disabled={isSubmitting}>
            추가
          </button>
        </form>
        {error && <span className="error">{error}</span>}
      </header>
      <ul className="ticker-list">
        {watchlist.length === 0 && <li>추가된 티커가 없습니다.</li>}
        {watchlist.map((symbol) => {
          const isSelected = selectedSymbols.includes(symbol);
          return (
            <li key={symbol} className={isSelected ? "selected" : ""}>
              <label>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSymbol(symbol)}
                />
                {symbol}
              </label>
              <div className="actions">
                <button
                  type="button"
                  onClick={() => {
                    void onRemove(symbol);
                  }}
                  disabled={isSubmitting}
                >
                  삭제
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
