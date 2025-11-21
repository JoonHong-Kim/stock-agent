export type ReportType = "smart_briefing" | "morning_briefing" | "sentiment_action" | "deep_dive";

export interface Report {
  id: number;
  symbol: string;
  type: ReportType;
  content: string;
  created_at: string;
}

export interface GenerateReportPayload {
  symbol: string;
  type: ReportType;
  limit?: number;
}
export interface SmartBriefingContent {
  summary: string[];
  sentiment_score: number;
  sentiment_reason: string;
  key_risks: string[];
  market_outlook: string;
}

export interface AggregateBriefingContent {
  overall_sentiment: number;
  overall_sentiment_reason: string;
  market_summary: string;
  top_movers: string[];
  key_themes: string[];
  individual_insights: {
    [symbol: string]: {
      sentiment: number;
      one_liner: string;
    };
  };
}

