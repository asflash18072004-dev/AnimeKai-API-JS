import test from "node:test";
import assert from "node:assert/strict";

import { buildOpenApiSpec } from "../lib/openapi";
import { parseAnimeCards, parseDetails, parseEpisodeListing, buildSearchParams, normalizeMegaPayload, normalizeSearchFilters, sortVideos } from "../lib/service";
import type { VideoStream } from "../lib/types";

test("buildSearchParams switches auto sort for non-empty queries", () => {
  const params = buildSearchParams(
    "naruto",
    2,
    normalizeSearchFilters({
      sort: "auto",
      genres: [],
      excludeGenres: [],
      statuses: [],
      types: [],
      seasons: [],
      languages: [],
      countries: [],
      ratings: [],
      years: [],
    }),
  );

  assert.ok(params.some(([key, value]) => key === "sort" && value === "most_relevance"));
  assert.ok(params.some(([key, value]) => key === "page" && value === "2"));
});

test("parseAnimeCards skips adult entries when disabled", () => {
  const html = `
    <div class="aitem">
      <a href="/watch/keep-me"></a>
      <a class="title" title="Keep Me" data-jp="Keep Me JP"></a>
      <div class="poster"><img data-src="https://image/1.jpg" /></div>
    </div>
    <div class="aitem">
      <a href="/watch/skip-me"></a>
      <a class="title" title="Skip Me" data-jp="Skip Me JP"></a>
      <div class="poster"><img data-src="https://image/2.jpg" /></div>
      <div class="tags"><div class="adult">18+</div></div>
    </div>
    <ul class="pagination"><a rel="next" href="/browser?page=2"></a></ul>
  `;

  const [items, hasNextPage] = parseAnimeCards(html, "en", false);
  assert.equal(hasNextPage, true);
  assert.deepEqual(items.map((item) => item.path), ["/watch/keep-me"]);
});

test("parseEpisodeListing extracts tokens and labels", () => {
  const html = `
    <div class="eplist titles">
      <ul class="range">
        <li><a num="1" slug="ep-1" token="abc" langs="1"><span data-jp="Pilot">Pilot</span></a></li>
        <li><a class="filler" num="2" slug="ep-2" token="def" langs="3"><span data-jp="Filler">Filler</span></a></li>
      </ul>
    </div>
  `;

  const episodes = parseEpisodeListing(html, "/watch/sample");
  assert.equal(episodes[0].token, "def");
  assert.deepEqual(episodes[0].labels, ["Sub & Dub", "Filler"]);
  assert.equal(episodes[1].token, "abc");
});

test("normalizeMegaPayload accepts objects and JSON strings", () => {
  const payload = { sources: [{ file: "https://cdn/master.m3u8" }], tracks: [] };
  assert.deepEqual(normalizeMegaPayload(payload), payload);
  assert.deepEqual(normalizeMegaPayload('{"sources":[{"file":"https://cdn/master.m3u8"}],"tracks":[]}'), payload);
});

test("parseDetails reads exact labeled rows", () => {
  const html = `
    <h1 class="title" data-jp="NARUTO">Naruto</h1>
    <div class="poster"><img src="https://image/naruto.jpg" /></div>
    <div class="desc text-expand">A ninja story.</div>
    <div class="detail">
      <div>
        <div>Country: <span><a href="/countries/japan">Japan</a></span></div>
        <div>Genres: <span><a href="/genres/action">Action</a>, <a href="/genres/comedy">Comedy</a></span></div>
        <div>Premiered: <span><a href="/browser?season=fall&year=2002">Fall 2002</a></span></div>
      </div>
      <div>
        <div>Status: <span>Completed</span></div>
        <div>Studios: <span><a href="/studios/pierrot"><span>Studio Pierrot</span></a></span></div>
        <div>Producers: <span><a href="/producers/aniplex"><span>Aniplex</span></a>, <a href="/producers/tv-tokyo"><span>TV Tokyo</span></a></span></div>
      </div>
    </div>
  `;

  const details = parseDetails(html, "/watch/naruto-9r5k", "en");
  assert.equal(details.title, "Naruto");
  assert.equal(details.alt_title, "NARUTO");
  assert.deepEqual(details.genres, ["Action", "Comedy"]);
  assert.equal(details.status, "Completed");
  assert.deepEqual(details.studios, ["Studio Pierrot"]);
  assert.deepEqual(details.producers, ["Aniplex", "TV Tokyo"]);
});

test("sortVideos prioritizes preferred quality type and server", () => {
  const items: VideoStream[] = [
    {
      quality: "Dubbed | Server 2 | 720p",
      url: "https://stream/720.m3u8",
      headers: {},
      subtitles: [],
      source_type: "dub",
      source_type_label: "Dubbed",
      server_name: "Server 2",
    },
    {
      quality: "Subtitled | Server 1 | 1080p",
      url: "https://stream/1080.m3u8",
      headers: {},
      subtitles: [],
      source_type: "sub",
      source_type_label: "Subtitled",
      server_name: "Server 1",
    },
  ];

  assert.equal(sortVideos(items, "1080", "Subtitled", "Server 1")[0].url, "https://stream/1080.m3u8");
});

test("openapi spec includes public video route", () => {
  const spec = buildOpenApiSpec();
  assert.ok(spec.paths["/videos"]);
  assert.equal(spec.info.title, "AnimeKai Scraper API");
});
