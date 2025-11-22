export interface MarketIndex {
    symbol: string;
    name: string;
    price: number;
    change: number;
    change_percent: number;
}

export interface TopMover {
    symbol: string;
    price: number;
    change: number;
    change_percent: number;
}

export interface MarketSummary {
    indices: MarketIndex[];
    top_gainers: TopMover[];
    top_losers: TopMover[];
}
