import { BASE_URLS, SORT_OPTIONS, TITLE_LANGUAGES, VIDEO_TYPES, type SortOption, type TitleLanguage, type VideoType } from "./constants";
import type { Settings } from "./types";

export class AnimeKaiError extends Error {}

export class UpstreamStatusError extends Error {
  constructor(public readonly status: number, message?: string) {
    super(message ?? `Upstream request failed with status ${status}.`);
  }
}

export class UpstreamRequestError extends Error {}

export function getSettings(): Settings {
  const titleLanguage = process.env.ANIMEKAI_TITLE_LANGUAGE ?? "en";
  const enabledTypesRaw = process.env.ANIMEKAI_ENABLED_TYPES ?? "sub,dub,softsub";
  const timeoutSeconds = Number(process.env.ANIMEKAI_TIMEOUT_SECONDS ?? "20");

  return {
    appName: "AnimeKai Scraper API",
    appVersion: "0.1.0",
    baseUrl: (process.env.ANIMEKAI_BASE_URL ?? BASE_URLS[0]).replace(/\/$/, ""),
    includeAdult: parseBoolean(process.env.ANIMEKAI_INCLUDE_ADULT, false),
    titleLanguage: parseTitleLanguage(titleLanguage),
    enabledTypes: new Set(enabledTypesRaw.split(",").map((value) => parseVideoType(value.trim())).filter(Boolean)),
    preferredQuality: process.env.ANIMEKAI_PREFERRED_QUALITY ?? "1080",
    preferredTypeLabel: process.env.ANIMEKAI_PREFERRED_TYPE ?? "Subtitled",
    preferredServer: process.env.ANIMEKAI_PREFERRED_SERVER ?? "Server 1",
    userAgent: process.env.ANIMEKAI_USER_AGENT ?? "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
    timeoutMs: Number.isFinite(timeoutSeconds) ? timeoutSeconds * 1000 : 20000,
  };
}

export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return Response.json(body, init);
}

export function htmlResponse(html: string, init: ResponseInit = {}): Response {
  return new Response(html, {
    ...init,
    headers: {
      "content-type": "text/html; charset=utf-8",
      ...(init.headers ?? {}),
    },
  });
}

export function parseBoolean(value: string | null | undefined, fallback: boolean): boolean {
  if (value == null || value === "") {
    return fallback;
  }
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export function parsePositiveInt(value: string | null, fallback: number): number {
  if (value == null || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error("Page must be a positive integer.");
  }
  return parsed;
}

export function parseSortOption(value: string | null): SortOption {
  const candidate = (value ?? "auto") as SortOption;
  if (!SORT_OPTIONS.includes(candidate)) {
    throw new Error(`Invalid sort value: ${value}.`);
  }
  return candidate;
}

export function parseTitleLanguage(value: string | null): TitleLanguage {
  const candidate = (value ?? "en") as TitleLanguage;
  if (!TITLE_LANGUAGES.includes(candidate)) {
    throw new Error(`Invalid title_language value: ${value}.`);
  }
  return candidate;
}

export function parseVideoType(value: string | null): VideoType {
  const candidate = (value ?? "sub") as VideoType;
  if (!VIDEO_TYPES.includes(candidate)) {
    throw new Error(`Invalid enabled_types value: ${value}.`);
  }
  return candidate;
}

export function parseStringArray(searchParams: URLSearchParams, key: string): string[] {
  return searchParams.getAll(key).map((value) => value.trim()).filter(Boolean);
}

export function getBaseUrl(searchParams: URLSearchParams, fallback: string): string {
  const baseUrl = searchParams.get("base_url");
  return (baseUrl ?? fallback).replace(/\/$/, "");
}

export async function runWithErrorHandling(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof AnimeKaiError) {
      return jsonResponse({ detail: error.message }, { status: 502 });
    }
    if (error instanceof UpstreamStatusError) {
      return jsonResponse({ detail: `Upstream request failed with status ${error.status}.` }, { status: 502 });
    }
    if (error instanceof UpstreamRequestError) {
      return jsonResponse({ detail: error.message }, { status: 502 });
    }
    if (error instanceof Error) {
      return jsonResponse({ detail: error.message }, { status: 422 });
    }
    return jsonResponse({ detail: "Unknown error." }, { status: 500 });
  }
}
