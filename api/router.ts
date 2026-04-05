import {
  getBaseUrl,
  getSettings,
  htmlResponse,
  jsonResponse,
  parseBoolean,
  parsePositiveInt,
  parseSortOption,
  parseStringArray,
  parseTitleLanguage,
  parseVideoType,
  runWithErrorHandling,
} from "../lib/api";
import { SORT_OPTIONS, VIDEO_TYPES } from "../lib/constants";
import {
  COUNTRY_OPTIONS,
  GENRES,
  LANGUAGE_OPTIONS,
  RATING_OPTIONS,
  SEASON_OPTIONS,
  STATUS_OPTIONS,
  TYPE_OPTIONS,
  currentYears,
} from "../lib/filters";
import { buildOpenApiSpec } from "../lib/openapi";
import { AnimeKaiService } from "../lib/service";

const settings = getSettings();
const service = new AnimeKaiService(settings);

function swaggerHtml(): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>AnimeKai Scraper API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      body { margin: 0; background: #fafafa; }
      #swagger-ui { max-width: 1200px; margin: 0 auto; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: '/openapi.json',
        dom_id: '#swagger-ui'
      });
    </script>
  </body>
</html>`;
}

function redocHtml(): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>AnimeKai Scraper API ReDoc</title>
    <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
  </head>
  <body>
    <redoc spec-url="/openapi.json"></redoc>
  </body>
</html>`;
}

async function route(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const { pathname, searchParams } = url;

  if (pathname === "/") {
    return jsonResponse({
      name: settings.appName,
      version: settings.appVersion,
      docs_url: "/docs",
      redoc_url: "/redoc",
    });
  }

  if (pathname === "/docs") {
    return htmlResponse(swaggerHtml());
  }

  if (pathname === "/redoc") {
    return htmlResponse(redocHtml());
  }

  if (pathname === "/openapi.json") {
    return jsonResponse(buildOpenApiSpec());
  }

  if (pathname === "/health") {
    return jsonResponse({
      status: "ok",
      upstream_base_url: settings.baseUrl,
    });
  }

  if (pathname === "/filters") {
    return jsonResponse({
      sort: [...SORT_OPTIONS],
      genres: GENRES,
      statuses: STATUS_OPTIONS,
      types: TYPE_OPTIONS,
      seasons: SEASON_OPTIONS,
      languages: LANGUAGE_OPTIONS,
      countries: COUNTRY_OPTIONS,
      ratings: RATING_OPTIONS,
      years: currentYears(),
    });
  }

  if (pathname === "/catalog/popular") {
    const page = parsePositiveInt(searchParams.get("page"), 1);
    const baseUrl = getBaseUrl(searchParams, settings.baseUrl);
    const includeAdult = parseBoolean(searchParams.get("include_adult"), settings.includeAdult);
    const titleLanguage = parseTitleLanguage(searchParams.get("title_language") ?? settings.titleLanguage);
    return jsonResponse(await service.popular(page, baseUrl, includeAdult, titleLanguage));
  }

  if (pathname === "/catalog/latest") {
    const page = parsePositiveInt(searchParams.get("page"), 1);
    const baseUrl = getBaseUrl(searchParams, settings.baseUrl);
    const includeAdult = parseBoolean(searchParams.get("include_adult"), settings.includeAdult);
    const titleLanguage = parseTitleLanguage(searchParams.get("title_language") ?? settings.titleLanguage);
    return jsonResponse(await service.latest(page, baseUrl, includeAdult, titleLanguage));
  }

  if (pathname === "/catalog/search") {
    const page = parsePositiveInt(searchParams.get("page"), 1);
    const baseUrl = getBaseUrl(searchParams, settings.baseUrl);
    const includeAdult = parseBoolean(searchParams.get("include_adult"), settings.includeAdult);
    const titleLanguage = parseTitleLanguage(searchParams.get("title_language") ?? settings.titleLanguage);

    return jsonResponse(
      await service.search(
        searchParams.get("query") ?? "",
        page,
        {
          sort: parseSortOption(searchParams.get("sort")),
          genres: parseStringArray(searchParams, "genres"),
          excludeGenres: parseStringArray(searchParams, "exclude_genres"),
          statuses: parseStringArray(searchParams, "statuses"),
          types: parseStringArray(searchParams, "types"),
          seasons: parseStringArray(searchParams, "seasons"),
          languages: parseStringArray(searchParams, "languages"),
          countries: parseStringArray(searchParams, "countries"),
          ratings: parseStringArray(searchParams, "ratings"),
          years: parseStringArray(searchParams, "years"),
        },
        baseUrl,
        includeAdult,
        titleLanguage,
      ),
    );
  }

  if (pathname === "/anime/details") {
    const animePath = searchParams.get("anime_path");
    if (!animePath) {
      throw new Error("anime_path is required.");
    }
    const baseUrl = getBaseUrl(searchParams, settings.baseUrl);
    const titleLanguage = parseTitleLanguage(searchParams.get("title_language") ?? settings.titleLanguage);
    return jsonResponse(await service.details(animePath, baseUrl, titleLanguage));
  }

  if (pathname === "/anime/episodes") {
    const animePath = searchParams.get("anime_path");
    if (!animePath) {
      throw new Error("anime_path is required.");
    }
    const baseUrl = getBaseUrl(searchParams, settings.baseUrl);
    return jsonResponse(await service.episodes(animePath, baseUrl));
  }

  if (pathname === "/videos") {
    const watchPath = searchParams.get("watch_path");
    const episodeToken = searchParams.get("episode_token");
    if (!watchPath) {
      throw new Error("watch_path is required.");
    }
    if (!episodeToken) {
      throw new Error("episode_token is required.");
    }

    const enabledTypes = parseStringArray(searchParams, "enabled_types");
    const selectedTypes =
      enabledTypes.length > 0
        ? new Set(enabledTypes.map((value) => parseVideoType(value)))
        : new Set(VIDEO_TYPES);

    return jsonResponse(
      await service.videos(
        watchPath,
        episodeToken,
        getBaseUrl(searchParams, settings.baseUrl),
        selectedTypes,
        searchParams.get("preferred_quality") ?? settings.preferredQuality,
        searchParams.get("preferred_type_label") ?? settings.preferredTypeLabel,
        searchParams.get("preferred_server") ?? settings.preferredServer,
      ),
    );
  }

  return jsonResponse({ detail: "Not found." }, { status: 404 });
}

export default {
  async fetch(request: Request) {
    return runWithErrorHandling(() => route(request));
  },
};
