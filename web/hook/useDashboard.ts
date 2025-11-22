import { useCallback, useEffect, useRef, useState } from "react";
import {
    addToWatchlist,
    fetchWatchlist,
    fetchTickers,
    refreshNewsNow,
    removeFromWatchlist,
    fetchMarketSummary,
} from "@/api/client";
import { useNewsStream } from "@/hook/useNewsStream";
import { TickerOption, WatchlistEntry } from "@/types/news";
import { MarketSummary as MarketSummaryType } from "@/types/market";

export function useDashboard() {
    const [watchlist, setWatchlist] = useState<string[]>([]);
    const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [refreshError, setRefreshError] = useState<string | null>(null);
    const [tickerOptions, setTickerOptions] = useState<TickerOption[]>([]);
    const [tickerQuery, setTickerQuery] = useState("");
    const previousArticleCount = useRef(0);
    const [newsDelta, setNewsDelta] = useState(0);

    // Market Summary State
    const [marketSummary, setMarketSummary] = useState<MarketSummaryType | null>(null);
    const [isMarketLoading, setIsMarketLoading] = useState(true);

    useEffect(() => {
        // Fetch market summary
        fetchMarketSummary()
            .then(setMarketSummary)
            .catch((err) => console.error("Failed to fetch market summary", err))
            .finally(() => setIsMarketLoading(false));

        fetchWatchlist()
            .then((entries) => {
                const symbols = entries.map((entry) => entry.symbol);
                setWatchlist(symbols);
                setSelectedSymbols(symbols);
            })
            .catch(() => {
                setWatchlist([]);
            });
    }, []);

    useEffect(() => {
        const handler = setTimeout(() => {
            fetchTickers(tickerQuery || undefined)
                .then((options) => setTickerOptions(options))
                .catch(() => setTickerOptions([]));
        }, 200);
        return () => clearTimeout(handler);
    }, [tickerQuery]);

    useEffect(() => {
        setRefreshError((current) => (current ? null : current));
    }, [selectedSymbols]);

    const { articles, status } = useNewsStream(selectedSymbols);
    useEffect(() => {
        const previous = previousArticleCount.current;
        setNewsDelta(articles.length - previous);
        previousArticleCount.current = articles.length;
    }, [articles.length]);

    const handleSearchTickers = useCallback((query: string) => {
        setTickerQuery(query.trim());
    }, []);

    const updateWatchlist = (entries: WatchlistEntry[]) => {
        const symbols = entries.map((entry) => entry.symbol);
        setWatchlist(symbols);
    };

    const handleAdd = async (symbol: string) => {
        setIsSubmitting(true);
        try {
            const entries = await addToWatchlist(symbol);
            updateWatchlist(entries);
            setSelectedSymbols((prev) =>
                prev.includes(symbol) ? prev : [...prev, symbol]
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemove = async (symbol: string) => {
        setIsSubmitting(true);
        try {
            await removeFromWatchlist(symbol);
            setWatchlist((prev) => prev.filter((item) => item !== symbol));
            setSelectedSymbols((prev) => prev.filter((item) => item !== symbol));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRefreshNow = async () => {
        if (!selectedSymbols.length) {
            return;
        }
        setIsRefreshing(true);
        setRefreshError(null);
        try {
            await refreshNewsNow(selectedSymbols);
        } catch (error) {
            setRefreshError((error as Error).message || "뉴스를 불러오지 못했습니다.");
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleToggle = (symbol: string) => {
        setSelectedSymbols((prev) =>
            prev.includes(symbol)
                ? prev.filter((item) => item !== symbol)
                : [...prev, symbol]
        );
    };

    return {
        watchlist,
        selectedSymbols,
        isSubmitting,
        isRefreshing,
        refreshError,
        tickerOptions,
        marketSummary,
        isMarketLoading,
        articles,
        status,
        newsDelta,
        handleSearchTickers,
        handleAdd,
        handleRemove,
        handleRefreshNow,
        handleToggle,
    };
}
