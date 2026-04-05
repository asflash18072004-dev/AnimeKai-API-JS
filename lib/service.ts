import { load, type CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";

import {
  DECODE_KAI_URL,
  DECODE_MEGA_URL,
  ENCODE_KAI_URL,
  type SortOption,
  type TitleLanguage,
  type VideoType,
} from "./constants";
import {
  AnimeKaiError,
  UpstreamRequestError,
  UpstreamStatusError,
} from "./api";
import {
  COUNTRY_OPTIONS,
  GENRES,
  LANGUAGE_OPTIONS,
  RATING_OPTIONS,
  SEASON_OPTIONS,
  STATUS_OPTIONS,
  TYPE_OPTIONS,
  resolveFilterValues,
  type SearchAppliedFilters,
} from "./filters";
import type {
  AnimeCard,
  AnimeDetails,
  AnimeListResponse,
  Episode,
  SearchFiltersInput,
  SearchResult,
  Settings,
  SubtitleTrack,
  VideoListResponse,
  VideoStream,
} from "./types";

type StreamServer = {
  sourceType: string;
  serverName: string;
  streamUrl: string;
};

export function normalizeMegaPayload(payload: unknown): Record<string, unknown> {
  if (typeof payload === "string") {
    const parsed = JSON.parse(payload);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed as Record<string, unknown>;
    }
  }
  if (typeof payload === "object" && payload !== null) {
    return payload as Record<string, unknown>;
  }
  throw new AnimeKaiError("Unexpected MegaUp decode payload format.");
}

export function parseAnimeCards(html: string, titleLanguage: TitleLanguage, includeAdult: boolean): [AnimeCard[], boolean] {
  const $ = load(html);
  const cards: AnimeCard[] = [];

  $("div.aitem").each((_, element) => {
    const root = $(element);
    const isAdult = root.find("div.tags div.adult").length > 0;
    if (isAdult && !includeAdult) {
      return;
    }

    const anchor = root.find("a[href]").first();
    const titleAnchor = root.find("a.title").first();
    const poster = root.find(".poster img").first();
    if (anchor.length === 0 || titleAnchor.length === 0) {
      return;
    }

    const englishTitle = (titleAnchor.attr("title") ?? "").trim();
    const altTitle = (titleAnchor.attr("data-jp") ?? "").trim() || null;
    cards.push({
      title: titleLanguage === "en" ? englishTitle : altTitle ?? englishTitle,
      alt_title: titleLanguage === "en" ? altTitle : englishTitle,
      path: (anchor.attr("href") ?? "").trim(),
      thumbnail_url: poster.attr("data-src") ?? null,
      adult: isAdult,
    });
  });

  return [cards, $("ul.pagination a[rel='next']").length > 0];
}

function detailRows($: CheerioAPI): AnyNode[] {
  return $("div.detail > div > div").toArray();
}

function findDetailRow($: CheerioAPI, label: string): AnyNode | undefined {
  const prefix = `${label.toLowerCase()}:`;
  return detailRows($).find((row) => $(row).text().trim().toLowerCase().startsWith(prefix));
}

function extractDetailValues($: CheerioAPI, label: string): string[] {
  const row = findDetailRow($, label);
  if (!row) {
    return [];
  }

  const values = $(row)
    .find("span a, span > span")
    .toArray()
    .map((node) => $(node).text().trim())
    .filter(Boolean);

  return [...new Set(values)];
}

function extractDetailText($: CheerioAPI, label: string): string | null {
  const row = findDetailRow($, label);
  if (!row) {
    return null;
  }

  const span = $(row).find("span").first();
  if (span.length > 0) {
    return span.text().trim() || null;
  }

  const text = $(row).text().trim();
  return text.includes(":") ? text.split(":", 2)[1].trim() : text || null;
}

export function parseDetails(html: string, animePath: string, titleLanguage: TitleLanguage): AnimeDetails {
  const $ = load(html);
  const titleElement = $("h1.title").first();
  const englishTitle = titleElement.text().trim();
  const jpTitle = (titleElement.attr("data-jp") ?? "").trim() || null;

  return {
    path: animePath,
    title: titleLanguage === "en" ? englishTitle : jpTitle ?? englishTitle,
    alt_title: titleLanguage === "en" ? jpTitle : englishTitle,
    thumbnail_url: $(".poster img").first().attr("src") ?? null,
    description: $("div.desc.text-expand").first().text().trim() || null,
    genres: extractDetailValues($, "Genres"),
    status: extractDetailText($, "Status"),
    studios: extractDetailValues($, "Studios"),
    producers: extractDetailValues($, "Producers"),
  };
}

export function parseEpisodeListing(htmlFragment: string, watchPath: string): Episode[] {
  const $ = load(htmlFragment);
  const episodes: Episode[] = [];

  $("div.eplist.titles ul.range li > a[num][slug][token]").each((_, element) => {
    const anchor = $(element);
    const numberText = anchor.attr("num") ?? "0";
    const number = Number(numberText);
    const title = anchor.find("span[data-jp]").first().text().trim() || null;
    const labels: string[] = [];
    const langs = anchor.attr("langs") ?? "";
    const labelPrefix = langs === "3" || langs === "2" ? "Sub & Dub" : langs === "1" ? "Sub" : null;
    if (labelPrefix) {
      labels.push(labelPrefix);
    }
    if (anchor.hasClass("filler")) {
      labels.push("Filler");
    }

    episodes.push({
      number: Number.isFinite(number) ? number : 0,
      title,
      name: title ? `Episode ${numberText}: ${title}` : `Episode ${numberText}`,
      labels,
      token: (anchor.attr("token") ?? "").trim(),
      watch_path: watchPath,
    });
  });

  return episodes.reverse();
}

export function buildSearchParams(query: string, page: number, filters: SearchAppliedFilters): [string, string][] {
  const params: [string, string][] = [
    ["keyword", query],
    ["page", String(page)],
  ];

  const sort = filters.sort === "auto" ? (query ? "most_relevance" : "trending") : filters.sort;
  params.push(["sort", sort]);

  for (const value of filters.genres) params.push(["genre[]", value]);
  for (const value of filters.exclude_genres) params.push(["genre[]", `-${value}`]);
  for (const value of filters.statuses) params.push(["status[]", value]);
  for (const value of filters.types) params.push(["type[]", value]);
  for (const value of filters.seasons) params.push(["season[]", value]);
  for (const value of filters.languages) params.push(["language[]", value]);
  for (const value of filters.countries) params.push(["country[]", value]);
  for (const value of filters.ratings) params.push(["rating[]", value]);
  for (const value of filters.years) params.push(["year[]", value]);

  return params;
}

export function normalizeSearchFilters(input: SearchFiltersInput): SearchAppliedFilters {
  return {
    sort: input.sort,
    genres: resolveFilterValues(input.genres, GENRES, "genre"),
    exclude_genres: resolveFilterValues(input.excludeGenres, GENRES, "genre"),
    statuses: resolveFilterValues(input.statuses, STATUS_OPTIONS, "status"),
    types: resolveFilterValues(input.types, TYPE_OPTIONS, "type"),
    seasons: resolveFilterValues(input.seasons, SEASON_OPTIONS, "season"),
    languages: resolveFilterValues(input.languages, LANGUAGE_OPTIONS, "language"),
    countries: resolveFilterValues(input.countries, COUNTRY_OPTIONS, "country"),
    ratings: resolveFilterValues(input.ratings, RATING_OPTIONS, "rating"),
    years: input.years.map(String),
  };
}

export function typeDisplayName(sourceType: string): string {
  if (sourceType === "sub") return "Subtitled";
  if (sourceType === "dub") return "Dubbed";
  if (sourceType === "softsub") return "Softsubed";
  return sourceType.charAt(0).toUpperCase() + sourceType.slice(1);
}

export function sortVideos(
  videos: VideoStream[],
  preferredQuality: string,
  preferredTypeLabel: string,
  preferredServer: string,
): VideoStream[] {
  return [...videos].sort((left, right) => {
    const leftScore = [
      Number(left.quality.includes(preferredQuality)),
      Number(left.quality.includes(preferredTypeLabel)),
      Number(left.quality.includes(preferredServer)),
    ];
    const rightScore = [
      Number(right.quality.includes(preferredQuality)),
      Number(right.quality.includes(preferredTypeLabel)),
      Number(right.quality.includes(preferredServer)),
    ];
    for (let index = 0; index < leftScore.length; index += 1) {
      if (leftScore[index] !== rightScore[index]) {
        return rightScore[index] - leftScore[index];
      }
    }
    return 0;
  });
}

export class AnimeKaiService {
  constructor(private readonly settings: Settings) {}

  private async getText(
    url: string,
    options: {
      params?: [string, string][];
      referer?: string;
      method?: "GET" | "POST";
      body?: string;
      contentType?: string;
    } = {},
  ): Promise<string> {
    const finalUrl = new URL(url);
    for (const [key, value] of options.params ?? []) {
      finalUrl.searchParams.append(key, value);
    }

    try {
      const response = await fetch(finalUrl, {
        method: options.method ?? "GET",
        body: options.body,
        headers: {
          "User-Agent": this.settings.userAgent,
          ...(options.referer ? { Referer: options.referer } : {}),
          ...(options.contentType ? { "Content-Type": options.contentType } : {}),
        },
        signal: AbortSignal.timeout(this.settings.timeoutMs),
      });

      if (!response.ok) {
        throw new UpstreamStatusError(response.status);
      }

      return await response.text();
    } catch (error) {
      if (error instanceof UpstreamStatusError) {
        throw error;
      }
      if (error instanceof Error) {
        throw new UpstreamRequestError(`Upstream request failed: ${error.message}`);
      }
      throw new UpstreamRequestError("Upstream request failed.");
    }
  }

  private async getJsonResult(url: string, options: { params?: [string, string][]; referer?: string } = {}): Promise<unknown> {
    const payload = await this.getText(url, options);
    const parsed = JSON.parse(payload) as { result: unknown };
    return parsed.result;
  }

  async popular(page: number, baseUrl: string, includeAdult: boolean, titleLanguage: TitleLanguage): Promise<AnimeListResponse> {
    const sourceUrl = `${baseUrl}/browser`;
    const html = await this.getText(sourceUrl, {
      params: [
        ["keyword", ""],
        ["sort", "trending"],
        ["page", String(page)],
      ],
    });
    const [items, hasNextPage] = parseAnimeCards(html, titleLanguage, includeAdult);
    return { page, has_next_page: hasNextPage, source_url: sourceUrl, items };
  }

  async latest(page: number, baseUrl: string, includeAdult: boolean, titleLanguage: TitleLanguage): Promise<AnimeListResponse> {
    const sourceUrl = `${baseUrl}/updates`;
    const html = await this.getText(sourceUrl, { params: [["page", String(page)]] });
    const [items, hasNextPage] = parseAnimeCards(html, titleLanguage, includeAdult);
    return { page, has_next_page: hasNextPage, source_url: sourceUrl, items };
  }

  async search(
    query: string,
    page: number,
    filters: SearchFiltersInput,
    baseUrl: string,
    includeAdult: boolean,
    titleLanguage: TitleLanguage,
  ): Promise<SearchResult> {
    const normalized = normalizeSearchFilters(filters);
    const sourceUrl = `${baseUrl}/browser`;
    const html = await this.getText(sourceUrl, { params: buildSearchParams(query, page, normalized) });
    const [items, hasNextPage] = parseAnimeCards(html, titleLanguage, includeAdult);

    return {
      page,
      has_next_page: hasNextPage,
      source_url: sourceUrl,
      applied_filters: normalized,
      items,
    };
  }

  async details(animePath: string, baseUrl: string, titleLanguage: TitleLanguage): Promise<AnimeDetails> {
    const html = await this.getText(new URL(animePath, baseUrl).toString());
    return parseDetails(html, animePath, titleLanguage);
  }

  async episodes(animePath: string, baseUrl: string): Promise<Episode[]> {
    const watchUrl = new URL(animePath, baseUrl).toString();
    const html = await this.getText(watchUrl);
    const $ = load(html);
    const animeId = $("div.rate-box").first().attr("data-id")?.trim();
    if (!animeId) {
      throw new AnimeKaiError("animeID not found on the watch page.");
    }

    const token = String(await this.getJsonResult(`${ENCODE_KAI_URL}${animeId}`));
    const fragment = String(
      await this.getJsonResult(`${baseUrl}/ajax/episodes/list`, {
        params: [
          ["ani_id", animeId],
          ["_", token],
        ],
        referer: watchUrl,
      }),
    );

    return parseEpisodeListing(fragment, animePath);
  }

  async videos(
    watchPath: string,
    episodeToken: string,
    baseUrl: string,
    enabledTypes: Set<VideoType>,
    preferredQuality: string,
    preferredTypeLabel: string,
    preferredServer: string,
  ): Promise<VideoListResponse> {
    const watchUrl = new URL(watchPath, baseUrl).toString();
    const servers = await this.resolveStreamServers(baseUrl, watchUrl, episodeToken, enabledTypes);

    const videos: VideoStream[] = [];
    const errors: string[] = [];
    for (const server of servers) {
      try {
        const extracted = await this.extractMegaVideos(server, baseUrl);
        videos.push(...extracted);
      } catch (error) {
        errors.push(`${server.sourceType}/${server.serverName}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (videos.length === 0 && errors.length > 0) {
      throw new AnimeKaiError(
        `Unable to extract video streams from the resolved servers. ${errors.slice(0, 3).join(" | ")}`,
      );
    }

    const sorted = sortVideos(videos, preferredQuality, preferredTypeLabel, preferredServer);
    return {
      total: sorted.length,
      preferred_quality: preferredQuality,
      preferred_type_label: preferredTypeLabel,
      preferred_server: preferredServer,
      items: sorted,
    };
  }

  private async resolveStreamServers(
    baseUrl: string,
    watchUrl: string,
    episodeToken: string,
    enabledTypes: Set<VideoType>,
  ): Promise<StreamServer[]> {
    const secondaryToken = String(await this.getJsonResult(`${ENCODE_KAI_URL}${episodeToken}`));
    const fragment = String(
      await this.getJsonResult(`${baseUrl}/ajax/links/list`, {
        params: [
          ["token", episodeToken],
          ["_", secondaryToken],
        ],
        referer: watchUrl,
      }),
    );
    const $ = load(fragment);
    const servers: StreamServer[] = [];

    $("div.server-items").each((_, element) => {
      const container = $(element);
      const sourceType = (container.attr("data-id") ?? "").trim();
      if (!enabledTypes.has(sourceType as VideoType)) {
        return;
      }

      container.find("span.server[data-lid]").each((__, node) => {
        const span = $(node);
        const serverId = (span.attr("data-lid") ?? "").trim();
        if (!serverId) {
          return;
        }
        servers.push({
          sourceType,
          serverName: span.text().trim(),
          streamUrl: serverId,
        });
      });
    });

    const resolved: StreamServer[] = [];
    for (const server of servers) {
      const streamToken = String(await this.getJsonResult(`${ENCODE_KAI_URL}${server.streamUrl}`));
      const encodedLink = String(
        await this.getJsonResult(`${baseUrl}/ajax/links/view`, {
          params: [
            ["id", server.streamUrl],
            ["_", streamToken],
          ],
          referer: watchUrl,
        }),
      );
      const decryptedText = await this.getText(`${DECODE_KAI_URL}${encodedLink}`);
      const decrypted = JSON.parse(decryptedText) as { result: { url: string } };
      resolved.push({
        sourceType: server.sourceType,
        serverName: server.serverName,
        streamUrl: decrypted.result.url,
      });
    }

    return resolved;
  }

  private async extractMegaVideos(server: StreamServer, referer: string): Promise<VideoStream[]> {
    const parsed = new URL(server.streamUrl);
    const segments = parsed.pathname.split("/").filter(Boolean);
    const token = segments.at(-1)?.split("?")[0];
    if (!token) {
      throw new AnimeKaiError(`No MegaUp token found in ${server.streamUrl}.`);
    }

    const megaBaseUrl = `${parsed.protocol}//${parsed.host}`;
    const sourceLabel = typeDisplayName(server.sourceType);
    const headers = {
      "User-Agent": this.settings.userAgent,
      Referer: referer,
    };

    const megaToken = String(await this.getJsonResult(`${megaBaseUrl}/media/${token}`));
    const decodedText = await this.getText(DECODE_MEGA_URL, {
      method: "POST",
      body: JSON.stringify({ text: megaToken, agent: this.settings.userAgent }),
      contentType: "application/json",
    });
    const decodedPayload = JSON.parse(decodedText) as { result: unknown };
    const megaPayload = normalizeMegaPayload(decodedPayload.result);

    const sources = Array.isArray(megaPayload.sources) ? megaPayload.sources as Array<{ file?: string }> : [];
    const tracks = Array.isArray(megaPayload.tracks) ? megaPayload.tracks as Array<{ file?: string; label?: string; kind?: string; default?: boolean }> : [];

    let masterPlaylistUrl =
      sources.find((source) => typeof source.file === "string" && source.file.includes("list") && source.file.endsWith(".m3u8"))?.file ??
      sources.find((source) => typeof source.file === "string")?.file;

    if (!masterPlaylistUrl) {
      return [];
    }

    const subtitles: SubtitleTrack[] = tracks
      .filter((track) => track.kind === "captions" && typeof track.file === "string" && track.file.endsWith(".vtt"))
      .sort((left, right) => Number(Boolean(right.default)) - Number(Boolean(left.default)))
      .map((track) => ({
        url: track.file as string,
        label: track.label ?? "Unknown",
      }));

    const playlistText = await this.getText(masterPlaylistUrl, { referer });
    if (!playlistText.includes("#EXT-X-STREAM-INF")) {
      return [
        {
          quality: `${sourceLabel} | ${server.serverName} | Unknown quality`,
          url: masterPlaylistUrl,
          headers,
          subtitles,
          source_type: server.sourceType,
          source_type_label: sourceLabel,
          server_name: server.serverName,
        },
      ];
    }

    const results: VideoStream[] = [];
    const lines = playlistText.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (!line.startsWith("#EXT-X-STREAM-INF")) {
        continue;
      }

      const resolutionMatch = line.match(/RESOLUTION=(\d+)x(\d+)/);
      const codecsMatch = line.match(/CODECS="([^"]+)"/);
      const height = resolutionMatch?.[2];
      const variantUrl = lines[index + 1]?.trim();
      if (!variantUrl) {
        continue;
      }

      const absoluteVariantUrl = variantUrl.startsWith("http")
        ? variantUrl
        : new URL(variantUrl, masterPlaylistUrl).toString();
      let quality = height ? `${height}p` : "Unknown";
      if (codecsMatch?.[1]) {
        quality = `${quality} [${codecsMatch[1]}]`;
      }

      results.push({
        quality: `${sourceLabel} | ${server.serverName} | ${quality}`,
        url: absoluteVariantUrl,
        headers,
        subtitles,
        source_type: server.sourceType,
        source_type_label: sourceLabel,
        server_name: server.serverName,
      });
    }

    return results;
  }
}
