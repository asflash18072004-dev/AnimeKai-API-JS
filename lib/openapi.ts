import { SORT_OPTIONS } from "./constants";

function schemaRef(name: string) {
  return { $ref: `#/components/schemas/${name}` };
}

export function buildOpenApiSpec() {
  return {
    openapi: "3.1.0",
    info: {
      title: "AnimeKai Scraper API",
      version: "0.1.0",
      description:
        "Vercel-ready TypeScript port of the AnimeKai scraper API. Search, details, episodes, stream resolution, and interactive docs are exposed as HTTP endpoints.",
    },
    servers: [{ url: "/" }],
    tags: [
      { name: "Meta" },
      { name: "Catalog" },
      { name: "Anime" },
      { name: "Streaming" },
    ],
    paths: {
      "/": {
        get: {
          tags: ["Meta"],
          summary: "Service overview",
          responses: {
            "200": {
              description: "Basic API metadata",
              content: { "application/json": { schema: schemaRef("APIInfo") } },
            },
          },
        },
      },
      "/health": {
        get: {
          tags: ["Meta"],
          summary: "Health check",
          responses: {
            "200": {
              description: "Health response",
              content: { "application/json": { schema: schemaRef("HealthResponse") } },
            },
          },
        },
      },
      "/filters": {
        get: {
          tags: ["Catalog"],
          summary: "Available search filters",
          responses: {
            "200": {
              description: "Filter catalog",
              content: { "application/json": { schema: schemaRef("FilterCatalog") } },
            },
          },
        },
      },
      "/catalog/popular": {
        get: {
          tags: ["Catalog"],
          summary: "Popular anime",
          parameters: commonCatalogParameters(),
          responses: {
            "200": {
              description: "Popular anime listing",
              content: { "application/json": { schema: schemaRef("AnimeListResponse") } },
            },
          },
        },
      },
      "/catalog/latest": {
        get: {
          tags: ["Catalog"],
          summary: "Latest updates",
          parameters: commonCatalogParameters(),
          responses: {
            "200": {
              description: "Latest anime listing",
              content: { "application/json": { schema: schemaRef("AnimeListResponse") } },
            },
          },
        },
      },
      "/catalog/search": {
        get: {
          tags: ["Catalog"],
          summary: "Search anime",
          parameters: [
            { name: "query", in: "query", schema: { type: "string", default: "" } },
            { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
            { name: "sort", in: "query", schema: { type: "string", enum: [...SORT_OPTIONS], default: "auto" } },
            repeatedStringParam("genres"),
            repeatedStringParam("exclude_genres"),
            repeatedStringParam("statuses"),
            repeatedStringParam("types"),
            repeatedStringParam("seasons"),
            repeatedStringParam("languages"),
            repeatedStringParam("countries"),
            repeatedStringParam("ratings"),
            repeatedStringParam("years"),
            { name: "base_url", in: "query", schema: { type: "string" } },
            { name: "include_adult", in: "query", schema: { type: "boolean", default: false } },
            { name: "title_language", in: "query", schema: { type: "string", enum: ["en", "romaji"], default: "en" } },
          ],
          responses: {
            "200": {
              description: "Search results",
              content: { "application/json": { schema: schemaRef("SearchResult") } },
            },
          },
        },
      },
      "/anime/details": {
        get: {
          tags: ["Anime"],
          summary: "Anime details",
          parameters: [
            requiredStringParam("anime_path"),
            { name: "base_url", in: "query", schema: { type: "string" } },
            { name: "title_language", in: "query", schema: { type: "string", enum: ["en", "romaji"], default: "en" } },
          ],
          responses: {
            "200": {
              description: "Anime metadata",
              content: { "application/json": { schema: schemaRef("AnimeDetails") } },
            },
          },
        },
      },
      "/anime/episodes": {
        get: {
          tags: ["Anime"],
          summary: "Episode listing",
          parameters: [
            requiredStringParam("anime_path"),
            { name: "base_url", in: "query", schema: { type: "string" } },
          ],
          responses: {
            "200": {
              description: "Episode list",
              content: { "application/json": { schema: { type: "array", items: schemaRef("Episode") } } },
            },
          },
        },
      },
      "/videos": {
        get: {
          tags: ["Streaming"],
          summary: "Resolve playable streams",
          parameters: [
            requiredStringParam("watch_path"),
            requiredStringParam("episode_token"),
            { name: "base_url", in: "query", schema: { type: "string" } },
            repeatedEnumParam("enabled_types", ["sub", "dub", "softsub"]),
            { name: "preferred_quality", in: "query", schema: { type: "string", default: "1080" } },
            { name: "preferred_type_label", in: "query", schema: { type: "string", default: "Subtitled" } },
            { name: "preferred_server", in: "query", schema: { type: "string", default: "Server 1" } },
          ],
          responses: {
            "200": {
              description: "Resolved stream candidates",
              content: { "application/json": { schema: schemaRef("VideoListResponse") } },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        APIInfo: {
          type: "object",
          properties: {
            name: { type: "string" },
            version: { type: "string" },
            docs_url: { type: "string" },
            redoc_url: { type: "string" },
          },
          required: ["name", "version", "docs_url", "redoc_url"],
        },
        HealthResponse: {
          type: "object",
          properties: {
            status: { type: "string" },
            upstream_base_url: { type: "string" },
          },
          required: ["status", "upstream_base_url"],
        },
        FilterDefinition: {
          type: "object",
          properties: {
            id: { type: "string" },
            label: { type: "string" },
          },
          required: ["id", "label"],
        },
        FilterCatalog: {
          type: "object",
          properties: {
            sort: { type: "array", items: { type: "string" } },
            genres: { type: "array", items: schemaRef("FilterDefinition") },
            statuses: { type: "array", items: schemaRef("FilterDefinition") },
            types: { type: "array", items: schemaRef("FilterDefinition") },
            seasons: { type: "array", items: schemaRef("FilterDefinition") },
            languages: { type: "array", items: schemaRef("FilterDefinition") },
            countries: { type: "array", items: schemaRef("FilterDefinition") },
            ratings: { type: "array", items: schemaRef("FilterDefinition") },
            years: { type: "array", items: { type: "string" } },
          },
          required: ["sort", "genres", "statuses", "types", "seasons", "languages", "countries", "ratings", "years"],
        },
        AnimeCard: {
          type: "object",
          properties: {
            title: { type: "string" },
            alt_title: { type: ["string", "null"] },
            path: { type: "string" },
            thumbnail_url: { type: ["string", "null"] },
            adult: { type: "boolean" },
          },
          required: ["title", "alt_title", "path", "thumbnail_url", "adult"],
        },
        AnimeListResponse: {
          type: "object",
          properties: {
            page: { type: "integer" },
            has_next_page: { type: "boolean" },
            source_url: { type: "string" },
            items: { type: "array", items: schemaRef("AnimeCard") },
          },
          required: ["page", "has_next_page", "source_url", "items"],
        },
        SearchAppliedFilters: {
          type: "object",
          properties: {
            sort: { type: "string", enum: [...SORT_OPTIONS] },
            genres: { type: "array", items: { type: "string" } },
            exclude_genres: { type: "array", items: { type: "string" } },
            statuses: { type: "array", items: { type: "string" } },
            types: { type: "array", items: { type: "string" } },
            seasons: { type: "array", items: { type: "string" } },
            languages: { type: "array", items: { type: "string" } },
            countries: { type: "array", items: { type: "string" } },
            ratings: { type: "array", items: { type: "string" } },
            years: { type: "array", items: { type: "string" } },
          },
          required: ["sort", "genres", "exclude_genres", "statuses", "types", "seasons", "languages", "countries", "ratings", "years"],
        },
        SearchResult: {
          type: "object",
          properties: {
            page: { type: "integer" },
            has_next_page: { type: "boolean" },
            source_url: { type: "string" },
            applied_filters: schemaRef("SearchAppliedFilters"),
            items: { type: "array", items: schemaRef("AnimeCard") },
          },
          required: ["page", "has_next_page", "source_url", "applied_filters", "items"],
        },
        AnimeDetails: {
          type: "object",
          properties: {
            path: { type: "string" },
            title: { type: "string" },
            alt_title: { type: ["string", "null"] },
            thumbnail_url: { type: ["string", "null"] },
            description: { type: ["string", "null"] },
            genres: { type: "array", items: { type: "string" } },
            status: { type: ["string", "null"] },
            studios: { type: "array", items: { type: "string" } },
            producers: { type: "array", items: { type: "string" } },
          },
          required: ["path", "title", "alt_title", "thumbnail_url", "description", "genres", "status", "studios", "producers"],
        },
        Episode: {
          type: "object",
          properties: {
            number: { type: "number" },
            title: { type: ["string", "null"] },
            name: { type: "string" },
            labels: { type: "array", items: { type: "string" } },
            token: { type: "string" },
            watch_path: { type: "string" },
          },
          required: ["number", "title", "name", "labels", "token", "watch_path"],
        },
        SubtitleTrack: {
          type: "object",
          properties: {
            url: { type: "string" },
            label: { type: "string" },
          },
          required: ["url", "label"],
        },
        VideoStream: {
          type: "object",
          properties: {
            quality: { type: "string" },
            url: { type: "string" },
            headers: { type: "object", additionalProperties: { type: "string" } },
            subtitles: { type: "array", items: schemaRef("SubtitleTrack") },
            source_type: { type: "string" },
            source_type_label: { type: "string" },
            server_name: { type: "string" },
          },
          required: ["quality", "url", "headers", "subtitles", "source_type", "source_type_label", "server_name"],
        },
        VideoListResponse: {
          type: "object",
          properties: {
            total: { type: "integer" },
            preferred_quality: { type: "string" },
            preferred_type_label: { type: "string" },
            preferred_server: { type: "string" },
            items: { type: "array", items: schemaRef("VideoStream") },
          },
          required: ["total", "preferred_quality", "preferred_type_label", "preferred_server", "items"],
        },
      },
    },
  };
}

function commonCatalogParameters() {
  return [
    { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
    { name: "base_url", in: "query", schema: { type: "string" } },
    { name: "include_adult", in: "query", schema: { type: "boolean", default: false } },
    { name: "title_language", in: "query", schema: { type: "string", enum: ["en", "romaji"], default: "en" } },
  ];
}

function requiredStringParam(name: string) {
  return {
    name,
    in: "query",
    required: true,
    schema: { type: "string" },
  };
}

function repeatedStringParam(name: string) {
  return {
    name,
    in: "query",
    schema: { type: "array", items: { type: "string" } },
    style: "form",
    explode: true,
  };
}

function repeatedEnumParam(name: string, values: string[]) {
  return {
    name,
    in: "query",
    schema: { type: "array", items: { type: "string", enum: values } },
    style: "form",
    explode: true,
  };
}
