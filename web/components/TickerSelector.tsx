"use client";

import { FormEvent, useMemo, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

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
    <section className="glass-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
      <header className="panel-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="panel-title" style={{ fontSize: '1.2rem', fontWeight: '600' }}>관심 종목</h2>
        <Button
          variant="ghost"
          type="button"
          onClick={() => {
            void onRefresh();
          }}
          disabled={!canRefresh || isRefreshing}
          style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
        >
          {isRefreshing ? "..." : "새로고침"}
        </Button>
      </header>

      <form className="ticker-form" onSubmit={handleSubmit} style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            className="input"
            placeholder="티커 추가 (예: AAPL)"
            value={value}
            onChange={(event) => {
              const next = event.target.value;
              setValue(next);
              onSearchTicker(next);
            }}
            disabled={isSubmitting}
            style={{
              width: '100%',
              background: 'rgba(30, 41, 59, 0.3)',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              color: 'white',
              padding: '0.6rem 1rem',
              borderRadius: '0.5rem',
              outline: 'none',
              transition: 'all 0.2s',
              fontSize: '0.95rem'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
            onBlur={(e) => e.target.style.borderColor = 'rgba(148, 163, 184, 0.2)'}
          />
          {showSuggestions && (
            <div className="ticker-suggestions" style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '0.5rem',
              background: '#1e293b',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              borderRadius: '0.5rem',
              zIndex: 20,
              maxHeight: '200px',
              overflowY: 'auto',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
            }}>
              {optionsToRender.map((option) => (
                <button
                  type="button"
                  key={option.symbol}
                  className="ticker-suggestion"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: 'transparent',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    textAlign: 'left',
                    borderBottom: '1px solid rgba(148, 163, 184, 0.1)'
                  }}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    const symbol = option.symbol.toUpperCase();
                    setValue(symbol);
                    onSearchTicker(symbol);
                  }}
                >
                  <span style={{ fontWeight: '600' }}>{option.symbol}</span>
                  {option.name && (
                    <span style={{ color: '#94a3b8', fontSize: '0.85rem', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {option.name}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        <Button type="submit" disabled={isSubmitting} variant="solid" style={{ padding: '0.6rem 1rem' }}>
          +
        </Button>
      </form>

      {error && <p className="error-banner" style={{ marginBottom: '1rem', color: '#f87171', fontSize: '0.9rem' }}>{error}</p>}
      {refreshError && <p className="error-banner" style={{ marginBottom: '1rem', color: '#f87171', fontSize: '0.9rem' }}>{refreshError}</p>}

      <ul className="ticker-list" style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem', listStyle: 'none', padding: 0 }}>
        {watchlist.length === 0 && <li style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.9rem' }}>관심 종목을 추가해보세요.</li>}
        {watchlist.map((symbol) => {
          const isSelected = selectedSymbols.includes(symbol);
          return (
            <li key={symbol} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.75rem 0.5rem',
              marginBottom: '0.25rem',
              borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
              transition: 'background 0.2s'
            }}>
              <button
                type="button"
                onClick={() => onToggleSymbol(symbol)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: isSelected ? 'white' : '#94a3b8',
                  fontWeight: isSelected ? 600 : 400,
                  fontSize: '1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  flex: 1,
                  textAlign: 'left'
                }}
              >
                <div style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '4px',
                  border: isSelected ? 'none' : '2px solid #475569',
                  background: isSelected ? 'var(--color-primary)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}>
                  {isSelected && <span style={{ color: 'white', fontSize: '12px' }}>✓</span>}
                </div>
                {symbol}
              </button>
              <button
                type="button"
                onClick={() => {
                  void onRemove(symbol);
                }}
                disabled={isSubmitting}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '0.4rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0.6,
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
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
