import { Collector, Task, LogEntry, TaskMeta, SubmitPayload, SubmitResponse, CollectorStats, TaskActualRow, FullLogEntry, AdminDashboardData, CATaggedEntry, WeeklyLogEntry } from "../types";

function getScriptUrl(): string {
  return process.env.EXPO_PUBLIC_GOOGLE_SCRIPT_URL ?? "";
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function apiGet<T>(action: string, params: Record<string, string> = {}): Promise<T> {
  const scriptUrl = getScriptUrl();
  console.log("[API] Script URL:", scriptUrl ? scriptUrl.slice(0, 60) + "..." : "EMPTY");
  if (!scriptUrl) {
    console.log("[API] No EXPO_PUBLIC_GOOGLE_SCRIPT_URL set");
    throw new Error("Google Script URL not configured. Set EXPO_PUBLIC_GOOGLE_SCRIPT_URL.");
  }

  let fullUrl: string;
  try {
    const urlObj = new URL(scriptUrl);
    urlObj.searchParams.set("action", action);
    Object.entries(params).forEach(([k, v]) => urlObj.searchParams.set(k, v));
    fullUrl = urlObj.toString();
  } catch (urlErr) {
    console.log("[API] URL parse failed, using string concat fallback", urlErr);
    const sep = scriptUrl.includes("?") ? "&" : "?";
    const paramStr = Object.entries({ action, ...params })
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");
    fullUrl = `${scriptUrl}${sep}${paramStr}`;
  }

  console.log("[API] GET", action, fullUrl.slice(0, 120));

  try {
    const response = await fetch(fullUrl, {
      method: "GET",
      headers: { "Accept": "application/json" },
    });

    console.log("[API] Response status:", response.status, "ok:", response.ok, "url:", response.url?.slice(0, 80));

    if (!response.ok) {
      const text = await response.text();
      console.log("[API] HTTP error body:", text.slice(0, 500));
      throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`);
    }

    const rawText = await response.text();
    console.log("[API] Raw response length:", rawText.length, "preview:", rawText.slice(0, 300));

    let json: ApiResponse<T>;
    try {
      json = JSON.parse(rawText) as ApiResponse<T>;
    } catch (parseErr) {
      console.log("[API] JSON parse error:", parseErr, "raw:", rawText.slice(0, 500));
      throw new Error(`Invalid JSON response from API: ${rawText.slice(0, 100)}`);
    }

    if (!json.success) {
      throw new Error(json.error ?? "Unknown API error");
    }

    console.log("[API] Success:", action, "data items:", Array.isArray(json.data) ? (json.data as unknown[]).length : "non-array");
    return json.data as T;
  } catch (fetchErr) {
    console.log("[API] Fetch error for", action, ":", fetchErr);
    throw fetchErr;
  }
}

async function apiPost(payload: SubmitPayload): Promise<SubmitResponse> {
  const scriptUrl = getScriptUrl();
  if (!scriptUrl) {
    console.log("[API] No EXPO_PUBLIC_GOOGLE_SCRIPT_URL set");
    throw new Error("Google Script URL not configured. Set EXPO_PUBLIC_GOOGLE_SCRIPT_URL.");
  }

  console.log("[API] POST submit:", JSON.stringify(payload));

  const response = await fetch(scriptUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify(payload),
    redirect: "follow",
  });

  if (!response.ok) {
    const text = await response.text();
    console.log("[API] POST HTTP error:", response.status, text);
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  const json = (await response.json()) as SubmitResponse;
  console.log("[API] POST response:", JSON.stringify(json));

  if (!json.success) {
    throw new Error(json.error ?? "Submit failed");
  }

  return json;
}

interface RawCollector {
  name: string;
  rigs: string[];
}

interface RawTask {
  name: string;
}

export async function fetchCollectors(): Promise<Collector[]> {
  const raw = await apiGet<RawCollector[]>("getCollectors");
  return raw.map((c, i) => ({
    id: `c_${i}_${c.name.replace(/\s/g, "_")}`,
    name: c.name,
    rigs: c.rigs ?? [],
  }));
}

export async function fetchTasks(): Promise<Task[]> {
  const raw = await apiGet<RawTask[]>("getTasks");
  return raw.map((t, i) => ({
    id: `t_${i}_${t.name.replace(/\s/g, "_")}`,
    name: t.name,
    label: t.name,
  }));
}

export async function fetchTodayLog(collectorName: string): Promise<LogEntry[]> {
  return apiGet<LogEntry[]>("getTodayLog", { collector: collectorName });
}

export async function fetchTaskMeta(taskName: string): Promise<TaskMeta | null> {
  return apiGet<TaskMeta | null>("getTaskMeta", { task: taskName });
}

export async function fetchCollectorStats(collectorName: string): Promise<CollectorStats> {
  return apiGet<CollectorStats>("getCollectorStats", { collector: collectorName });
}

export async function submitAction(payload: SubmitPayload): Promise<SubmitResponse> {
  return apiPost(payload);
}

export async function fetchRecollections(): Promise<string[]> {
  return apiGet<string[]>("getRecollections");
}

export async function fetchFullLog(collectorName?: string): Promise<FullLogEntry[]> {
  const params: Record<string, string> = {};
  if (collectorName) params.collector = collectorName;
  console.log("[API] fetchFullLog", collectorName);
  return apiGet<FullLogEntry[]>("getFullLog", params);
}

export async function fetchTaskActualsData(): Promise<TaskActualRow[]> {
  console.log("[API] fetchTaskActualsData");
  return apiGet<TaskActualRow[]>("getTaskActualsSheet");
}

export async function fetchAdminDashboardData(): Promise<AdminDashboardData> {
  console.log("[API] fetchAdminDashboardData");
  return apiGet<AdminDashboardData>("getAdminDashboardData");
}

export async function fetchCATaggedWeekly(weekStart?: string): Promise<CATaggedEntry[]> {
  console.log("[API] fetchCATaggedWeekly, weekStart:", weekStart);
  try {
    const params: Record<string, string> = {};
    if (weekStart) params.weekStart = weekStart;
    return await apiGet<CATaggedEntry[]>("getCATaggedWeekly", params);
  } catch (e) {
    console.log("[API] fetchCATaggedWeekly failed (sheet may not exist):", e);
    return [];
  }
}

export async function fetchWeeklyLog(weekStart?: string): Promise<WeeklyLogEntry[]> {
  console.log("[API] fetchWeeklyLog, weekStart:", weekStart);
  try {
    const params: Record<string, string> = {};
    if (weekStart) params.weekStart = weekStart;
    return await apiGet<WeeklyLogEntry[]>("getWeeklyLog", params);
  } catch (e) {
    console.log("[API] fetchWeeklyLog failed:", e);
    return [];
  }
}

export function isApiConfigured(): boolean {
  const url = getScriptUrl();
  console.log("[API] isApiConfigured check:", !!url, url ? url.slice(0, 40) : "EMPTY");
  return !!url;
}
