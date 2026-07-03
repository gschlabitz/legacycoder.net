#!/usr/bin/env node
// Regenerates src/content/docs/blog/ and src/assets/blog/ from the
// schlabitz.blogspot.com public feed. See docs/plans/blog-migration/ for the
// full spec this implements. Rerunnable: `node scripts/migrate-blog.mjs
// [--offline]`.
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import domino from "@mixmark-io/domino";
import TurndownService from "turndown";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CACHE_DIR = path.join(ROOT, ".migration-cache");
const DOCS_BLOG_DIR = path.join(ROOT, "src/content/docs/blog");
const ASSETS_BLOG_DIR = path.join(ROOT, "src/assets/blog");

const FEED_URL =
  "https://schlabitz.blogspot.com/feeds/posts/default?alt=json&max-results=500";
const EXPECTED_POST_COUNT = 148;
const OFFLINE = process.argv.includes("--offline");
const IMAGE_CONCURRENCY = 4;
const IMAGE_DOWNLOAD_DELAY_MS = 100;

// Filenames of the three Phase 1 hand-migrated pilot posts. The script must
// reproduce these (modulo whitespace) but must never overwrite them directly;
// it writes its own version to the cache dir and diffs against the real file.
const PILOT_SLUGS = new Set([
  "2005-05-24-das-neue-zuhause-2-new-home-2",
  "2007-11-01-geburstagsvideo",
  "2008-08-17-jackson-square",
]);

const PARA_SENTINEL = "PARA";
// Turndown escapes markdown-special characters (*, [, ]) in plain text
// nodes, which would mangle these notes since they're meant to already BE
// markdown. Insert plain-word sentinels as DOM text instead and swap in the
// real markdown after turndown has run, same trick as PARA_SENTINEL.
const DEAD_VIDEO_SENTINEL = "XDEADVIDEOX";
const DEAD_IMAGE_SENTINEL = "XDEADIMAGEX";

const VIDEO_HOST_PATTERN = /(video\.google\.com|googlevideo\.com|blogger\.com\/video\.g)/i;

const DEAD_VIDEO_NOTE =
  "*[Video lost to time — it was hosted on Google Video, which shut down in 2012.]*";

function deadImageNote() {
  return "*[Image lost to time — the original was hosted on Blogspot and is no longer available.]*";
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

async function fetchFeed() {
  const cachePath = path.join(CACHE_DIR, "feed.json");
  if (OFFLINE) {
    console.log(`[fetch] --offline: reading cached feed from ${cachePath}`);
    return JSON.parse(await readFile(cachePath, "utf8"));
  }

  console.log(`[fetch] GET ${FEED_URL}`);
  const res = await fetch(FEED_URL);
  if (!res.ok) {
    throw new Error(`Feed fetch failed: HTTP ${res.status}`);
  }
  const json = await res.json();
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(cachePath, JSON.stringify(json));
  return json;
}

function parseEntries(feedJson) {
  const total = Number(feedJson.feed.openSearch$totalResults.$t);
  const entries = feedJson.feed.entry ?? [];
  if (total !== EXPECTED_POST_COUNT || entries.length !== EXPECTED_POST_COUNT) {
    throw new Error(
      `Post count mismatch: feed reports ${total} total, fetched ${entries.length}, expected ${EXPECTED_POST_COUNT}. Aborting — do not proceed on a partial/changed feed without investigating.`,
    );
  }

  return entries.map((entry) => {
    const altLink = entry.link.find((l) => l.rel === "alternate")?.href;
    if (!altLink) throw new Error(`Entry ${entry.id.$t} has no alternate link`);
    const url = new URL(altLink);
    const date = entry.published.$t.slice(0, 10);
    const slugFromUrl = path.basename(url.pathname).replace(/\.html?$/i, "");
    return {
      title: entry.title.$t.trim(),
      date,
      contentHtml: entry.content.$t,
      pathname: url.pathname,
      slugFromUrl,
      filenameSlug: `${date}-${slugFromUrl}`,
    };
  });
}

// ---------------------------------------------------------------------------
// Title fallback for the 4 posts with an empty <title>
// ---------------------------------------------------------------------------

function titleFromSlug(slugFromUrl, date) {
  const generic = /^blog-post(-\d+)?$/i.test(slugFromUrl);
  if (generic) return `Untitled (${date})`;
  const words = slugFromUrl.split("-").filter(Boolean);
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

// ---------------------------------------------------------------------------
// Cross-link map: blogspot pathname -> local /blog/<slug>/ route
// ---------------------------------------------------------------------------

function buildRouteMap(entries) {
  const map = new Map();
  for (const e of entries) {
    map.set(e.pathname, `/blog/${e.filenameSlug}/`);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Image download
// ---------------------------------------------------------------------------

const CONTENT_TYPE_EXT = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/bmp": "bmp",
};

function extFromUrl(url) {
  const m = /\.([a-z0-9]{2,4})(?:$|[?#])/i.exec(url);
  return m ? m[1].toLowerCase() : "jpg";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Tiny concurrency-limited queue, no external dependency. */
function createLimiter(concurrency) {
  let active = 0;
  const queue = [];
  const next = () => {
    if (active >= concurrency || queue.length === 0) return;
    active++;
    const { fn, resolve, reject } = queue.shift();
    fn()
      .then(resolve, reject)
      .finally(() => {
        active--;
        next();
      });
  };
  return (fn) =>
    new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      next();
    });
}

async function downloadImage(url, destDirAbs, index, failures) {
  const limiter = downloadImage._limiter ?? (downloadImage._limiter = createLimiter(IMAGE_CONCURRENCY));
  return limiter(async () => {
    await sleep(IMAGE_DOWNLOAD_DELAY_MS);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const contentType = (res.headers.get("content-type") ?? "").split(";")[0].trim();
      const ext = CONTENT_TYPE_EXT[contentType] ?? extFromUrl(url);
      const filename = `${String(index).padStart(2, "0")}.${ext}`;
      const buf = Buffer.from(await res.arrayBuffer());
      await mkdir(destDirAbs, { recursive: true });
      await writeFile(path.join(destDirAbs, filename), buf);
      return filename;
    } catch (err) {
      failures.push({ url, error: String(err.message ?? err) });
      return null;
    }
  });
}

// ---------------------------------------------------------------------------
// Per-post transform
// ---------------------------------------------------------------------------

async function transformPost(entry, routeMap, report) {
  const assetDirAbs = path.join(ASSETS_BLOG_DIR, entry.filenameSlug);
  const assetDirRel = `../../../assets/blog/${entry.filenameSlug}`;

  // Collapse runs of 2+ <br> into a paragraph-break sentinel before DOM
  // parsing, so turndown emits blank-line paragraphs instead of Markdown hard
  // breaks for what were clearly paragraph boundaries in the original.
  let html = entry.contentHtml.replace(/(?:<br\s*\/?>\s*){2,}/gi, PARA_SENTINEL);

  const doc = domino.createDocument(`<div id="root">${html}</div>`);
  const root = doc.getElementById("root");

  // Videos: replace dead Google Video / Blogger video embeds with the
  // standard italic note. Only true <iframe>/<embed>/<object> embeds count —
  // a plain <a> link to a dead video page is left as an ordinary (now-dead)
  // external link, per the "dead links are historically authentic" policy.
  let videoCount = 0;
  for (const el of Array.from(root.querySelectorAll("iframe, embed, object"))) {
    const src = el.getAttribute("src") ?? el.getAttribute("data") ?? "";
    if (VIDEO_HOST_PATTERN.test(src)) {
      const note = doc.createTextNode(DEAD_VIDEO_SENTINEL);
      el.parentNode.replaceChild(note, el);
      videoCount++;
    }
  }

  // Images: unwrap <a> that solely wraps an <img> (link-to-larger-version
  // pattern), then download every <img src> and rewrite to a local relative
  // path. Numbered in order of appearance across the whole post.
  for (const a of Array.from(root.querySelectorAll("a"))) {
    const meaningfulKids = Array.from(a.childNodes).filter(
      (n) => n.nodeType === 1 || (n.nodeType === 3 && n.textContent.trim()),
    );
    if (meaningfulKids.length === 1 && meaningfulKids[0].nodeType === 1 && meaningfulKids[0].tagName === "IMG") {
      a.parentNode.replaceChild(meaningfulKids[0], a);
    }
  }

  const imgs = Array.from(root.querySelectorAll("img"));
  let imageIndex = 0;
  const imageFailures = [];
  for (const img of imgs) {
    const src = img.getAttribute("src");
    if (!src) continue;
    imageIndex++;
    const filename = await downloadImage(src, assetDirAbs, imageIndex, imageFailures);
    if (filename) {
      img.setAttribute("src", `${assetDirRel}/${filename}`);
      img.removeAttribute("style");
      img.removeAttribute("border");
      img.removeAttribute("id");
    } else {
      const note = doc.createTextNode(DEAD_IMAGE_SENTINEL);
      img.parentNode.replaceChild(note, img);
    }
  }
  report.imagesDownloaded += imgs.length - imageFailures.length;
  report.imageFailures.push(...imageFailures.map((f) => ({ post: entry.filenameSlug, ...f })));
  report.videosReplaced += videoCount;

  // Cross-links: rewrite internal schlabitz.blogspot.com links that point at
  // one of the 148 posts to their local /blog/<slug>/ route. Blogspot links
  // that are NOT one of the 148 posts (archive/label pages, blog root) and
  // all external links are left untouched.
  for (const a of Array.from(root.querySelectorAll("a[href]"))) {
    const href = a.getAttribute("href");
    let url;
    try {
      url = new URL(href, "https://schlabitz.blogspot.com/");
    } catch {
      continue;
    }
    if (!/(^|\.)schlabitz\.blogspot\.com$/i.test(url.hostname)) continue;
    const route = routeMap.get(url.pathname);
    if (route) {
      a.setAttribute("href", route);
      report.crossLinksRewritten++;
    } else {
      report.crossLinksUntouched.push({ post: entry.filenameSlug, href });
    }
  }

  const turndownService = new TurndownService({ headingStyle: "atx" });
  turndownService.keep(["table", "tr", "td", "th", "tbody", "thead"]);
  let markdown = turndownService.turndown(root.innerHTML);
  markdown = markdown
    .split(PARA_SENTINEL)
    .join("\n\n")
    .split(DEAD_VIDEO_SENTINEL)
    .join(DEAD_VIDEO_NOTE)
    .split(DEAD_IMAGE_SENTINEL)
    .join(deadImageNote())
    .replace(/&nbsp;/gi, " ")
    // Images and the dead-media notes always render as standalone blocks in
    // this blog, but the source often has zero <br> separation from
    // adjacent text (turndown then emits them on the same line). Give each
    // its own paragraph for a consistent, readable result.
    .replace(/(!\[[^\]]*\]\([^\s)]+\)|\*\[[^\]]*\]\*)\s*(?=\S)/g, "$1\n\n")
    .replace(/(?<=\S)[ \t]*\n?(!\[[^\]]*\]\([^\s)]+\)|\*\[[^\]]*\]\*)/g, "\n\n$1")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { markdown, videoCount };
}

const GERMAN_CHARS = /[äöüÄÖÜß]/;
// Require *positive* evidence of English (common function words) rather than
// just the absence of German — a blacklist-only check lets non-German noise
// (captions, arrow notation, stray symbols) through as false "English".
const ENGLISH_STOPWORDS =
  /\b(the|and|is|was|were|of|in|to|with|for|that|this|on|at|as|by|from|our|we|you|he|she|it|they|are|have|has|had|but|not|so|there|here|which|who|what|when|where|will|be|been|being)\b/gi;

function isLikelyEnglish(sentence) {
  if (GERMAN_CHARS.test(sentence)) return false;
  const matches = sentence.match(ENGLISH_STOPWORDS);
  return (matches?.length ?? 0) >= 2;
}

function computeDescription(plainText) {
  const sentences = plainText
    // Require a letter (not a digit) before the terminator, so a German
    // ordinal/date period like "29." doesn't get mistaken for a sentence end.
    .split(/(?<=[a-zA-ZäöüÄÖÜß][.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const englishCandidate = sentences.find((s) => s.length > 15 && isLikelyEnglish(s));
  let description = englishCandidate ?? sentences[0] ?? "";
  if (description.length > 160) {
    description = description.slice(0, 157).trimEnd() + "...";
  }
  return description;
}

function plainTextFromHtml(html) {
  // Regex tag-stripping rather than DOM textContent: textContent glues text
  // across element boundaries (e.g. an <img> between two paragraphs) with no
  // whitespace, which merges adjacent German/English sentences and defeats
  // the language-detection heuristic in computeDescription.
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function frontmatter(title, date, description) {
  // Always double-quote: plain YAML scalars are full of edge cases (leading
  // "- ", ": ", "#", etc.) that are easy to hit across 148 freeform posts.
  return `---\ntitle: ${JSON.stringify(title)}\ndate: ${date}\ndescription: ${JSON.stringify(description)}\n---\n\n`;
}

// ---------------------------------------------------------------------------
// Pilot diff (whitespace-insensitive)
// ---------------------------------------------------------------------------

function normalizeForDiff(text) {
  return text.replace(/\s+/g, " ").trim();
}

async function diffAgainstPilot(slug, generatedContent) {
  const pilotPath = path.join(DOCS_BLOG_DIR, `${slug}.md`);
  let existing;
  try {
    existing = await readFile(pilotPath, "utf8");
  } catch {
    return { slug, status: "missing-pilot" };
  }
  const same = normalizeForDiff(existing) === normalizeForDiff(generatedContent);
  return { slug, status: same ? "match" : "differs" };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const report = {
    posts: 0,
    imagesDownloaded: 0,
    imageFailures: [],
    videosReplaced: 0,
    crossLinksRewritten: 0,
    crossLinksUntouched: [],
    orphanedBlogspotImageLinks: [],
    retitled: [],
    pilotDiffs: [],
  };

  const feedJson = await fetchFeed();
  const entries = parseEntries(feedJson);
  const routeMap = buildRouteMap(entries);

  await mkdir(DOCS_BLOG_DIR, { recursive: true });
  await mkdir(CACHE_DIR, { recursive: true });

  for (const entry of entries) {
    const isPilot = PILOT_SLUGS.has(entry.filenameSlug);
    let title = entry.title;
    if (!title) {
      title = titleFromSlug(entry.slugFromUrl, entry.date);
      report.retitled.push({ slug: entry.filenameSlug, title });
    }

    const { markdown } = await transformPost(entry, routeMap, report);
    const plainText = plainTextFromHtml(entry.contentHtml);
    const description = computeDescription(plainText);
    const fileContent = frontmatter(title, entry.date, description) + markdown + "\n";

    if (isPilot) {
      const cachePath = path.join(CACHE_DIR, `generated-${entry.filenameSlug}.md`);
      await writeFile(cachePath, fileContent);
      report.pilotDiffs.push(await diffAgainstPilot(entry.filenameSlug, fileContent));
    } else {
      await writeFile(path.join(DOCS_BLOG_DIR, `${entry.filenameSlug}.md`), fileContent);
    }
    report.posts++;
    console.log(`[write] ${entry.filenameSlug}${isPilot ? " (pilot — diffed, not overwritten)" : ""}`);
  }

  await verify(entries, report);
  printReport(report);
}

async function verify(entries, report) {
  console.log("\n[verify] checking generated output...");
  const diskCount = (await import("node:fs")).readdirSync(DOCS_BLOG_DIR).filter((f) => f.endsWith(".md")).length;
  if (diskCount !== EXPECTED_POST_COUNT) {
    throw new Error(`Verify failed: ${diskCount} .md files on disk, expected ${EXPECTED_POST_COUNT}`);
  }

  const blogspotImageHost = /blogger\.googleusercontent\.com|photos1\.blogger\.com/i;
  for (const entry of entries) {
    if (PILOT_SLUGS.has(entry.filenameSlug)) continue;
    const filePath = path.join(DOCS_BLOG_DIR, `${entry.filenameSlug}.md`);
    const content = await readFile(filePath, "utf8");
    const body = content.replace(/^---[\s\S]*?---\n/, "");

    // Every actual image reference must be a downloaded local file — this
    // catches genuinely unmigrated images.
    for (const m of body.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) {
      const ref = m[1];
      if (blogspotImageHost.test(ref)) {
        throw new Error(`Verify failed: ${entry.filenameSlug} still has an unmigrated image reference: ${ref}`);
      }
      if (ref.startsWith("http")) continue;
      const resolved = path.resolve(path.dirname(filePath), ref);
      try {
        await readFile(resolved);
      } catch {
        throw new Error(`Verify failed: ${entry.filenameSlug} references missing image ${ref}`);
      }
    }
    if (/schlabitz\.blogspot\.com/i.test(body)) {
      throw new Error(`Verify failed: ${entry.filenameSlug} still has an unrewritten internal schlabitz.blogspot.com link`);
    }

    // A handful of posts contain orphaned <a> tags (no <img>, editor debris
    // in the original) linking straight to a raw Blogspot photo file. Not an
    // unmigrated image — just report it, don't fail the build over it.
    for (const m of body.matchAll(/\[[^\]]*\]\((https?:\/\/[^)]*(?:blogger\.googleusercontent\.com|photos1\.blogger\.com)[^)]*)\)/g)) {
      report.orphanedBlogspotImageLinks.push({ post: entry.filenameSlug, href: m[1] });
    }
  }
  console.log("[verify] OK");
}

function printReport(report) {
  console.log("\n=== Migration report ===");
  console.log(`Posts written: ${report.posts}`);
  console.log(`Images downloaded: ${report.imagesDownloaded}`);
  console.log(`Image download failures: ${report.imageFailures.length}`);
  for (const f of report.imageFailures) console.log(`  - ${f.post}: ${f.url} (${f.error})`);
  console.log(`Videos replaced with dead-video note: ${report.videosReplaced}`);
  console.log(`Cross-links rewritten: ${report.crossLinksRewritten}`);
  console.log(`Cross-links left untouched (blogspot, non-post): ${report.crossLinksUntouched.length}`);
  for (const l of report.crossLinksUntouched) console.log(`  - ${l.post}: ${l.href}`);
  console.log(`Orphaned raw-photo links (editor debris in original, left untouched): ${report.orphanedBlogspotImageLinks.length}`);
  for (const l of report.orphanedBlogspotImageLinks) console.log(`  - ${l.post}: ${l.href}`);
  console.log(`Retitled (empty original title): ${report.retitled.length}`);
  for (const r of report.retitled) console.log(`  - ${r.slug}: "${r.title}"`);
  console.log(`Pilot diffs:`);
  for (const d of report.pilotDiffs) console.log(`  - ${d.slug}: ${d.status}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
