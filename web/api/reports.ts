import { env } from "@/config/env";
import { handleHttpResponse } from "./http";
import {
  GenerateReportPayload,
  Report,
} from "@/types/reports";

export async function generateReport(
  payload: GenerateReportPayload
): Promise<Report> {
  const response = await fetch(`${env.backendHttpUrl}/api/reports/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleHttpResponse<Report>(response);
}

export async function fetchReport(reportId: number): Promise<Report> {
  const response = await fetch(
    `${env.backendHttpUrl}/api/reports/${reportId}`
  );
  return handleHttpResponse<Report>(response);
}

export async function fetchReports(params?: {
  symbol?: string;
  limit?: number;
}): Promise<Report[]> {
  const search = new URLSearchParams();
  if (params?.symbol) {
    search.set("symbol", params.symbol);
  }
  if (params?.limit) {
    search.set("limit", params.limit.toString());
  }
  const query = search.toString();
  const url = query
    ? `${env.backendHttpUrl}/api/reports?${query}`
    : `${env.backendHttpUrl}/api/reports`;
  const response = await fetch(url);
  return handleHttpResponse<Report[]>(response);
}

export async function generateAggregateReport(): Promise<Report> {
  const response = await fetch(`${env.backendHttpUrl}/api/reports/aggregate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  return handleHttpResponse<Report>(response);
}

