import type { IncomingMessage, ServerResponse } from "node:http"
import type { Plugin } from "vite"

const MAX_RESULTS = 8
const CACHE_TTL_MS = 10 * 60 * 1000
const MIN_REQUEST_GAP_MS = 1500

type SearchHit = {
  title: string
  url: string
  description: string
}

type CachedSearch = {
  expiresAt: number
  results: SearchHit[]
}

const cache = new Map<string, CachedSearch>()
let lastRequestAt = 0
let searchQueue: Promise<void> = Promise.resolve()

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
  Referer: "https://duckduckgo.com/",
}

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on("data", (chunk: Buffer) => {
      chunks.push(chunk)
    })
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8")
      if (!raw.trim()) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(raw))
      } catch (err) {
        reject(err)
      }
    })
    req.on("error", reject)
  })
}

function sendJson(
  res: ServerResponse,
  status: number,
  body: Record<string, unknown>
) {
  res.statusCode = status
  res.setHeader("Content-Type", "application/json; charset=utf-8")
  res.end(JSON.stringify(body))
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

function normalizeQuery(query: string) {
  return query.trim().toLowerCase().replace(/\s+/g, " ")
}

function decodeEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
}

function stripTags(value: string) {
  return decodeEntities(
    value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  )
}

async function waitForRateGap() {
  const elapsed = Date.now() - lastRequestAt
  if (elapsed < MIN_REQUEST_GAP_MS) {
    await sleep(MIN_REQUEST_GAP_MS - elapsed)
  }
}

function unwrapDuckUrl(raw: string) {
  const decoded = decodeEntities(raw.trim())
  try {
    const parsed = decoded.startsWith("//")
      ? new URL(`https:${decoded}`)
      : new URL(decoded, "https://duckduckgo.com")
    const uddg = parsed.searchParams.get("uddg")
    if (uddg) return uddg
    return parsed.href
  } catch {
    return decoded
  }
}

function parseHtmlResults(html: string): SearchHit[] {
  const results: SearchHit[] = []
  const seen = new Set<string>()

  const titleRegex =
    /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi
  const snippetRegex =
    /class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/(?:a|td|div)>/gi

  const titles = [...html.matchAll(titleRegex)]
  const snippets = [...html.matchAll(snippetRegex)].map((match) =>
    stripTags(match[1] ?? "")
  )

  titles.forEach((match, index) => {
    const url = unwrapDuckUrl(match[1] ?? "")
    const title = stripTags(match[2] ?? "")
    if (!url || !title) return
    if (url.includes("duckduckgo.com/y.js")) return
    if (seen.has(url)) return
    seen.add(url)
    results.push({
      title,
      url,
      description: snippets[index] ?? "",
    })
  })

  return results.slice(0, MAX_RESULTS)
}

async function searchViaHtml(query: string): Promise<SearchHit[]> {
  const endpoint = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
  const response = await fetch(endpoint, {
    method: "GET",
    headers: BROWSER_HEADERS,
    redirect: "follow",
  })

  if (!response.ok) {
    throw new Error(`Web-Suche fehlgeschlagen (${response.status}).`)
  }

  const html = await response.text()
  if (/anomalyDetection|captcha|Oops/i.test(html) && !/result__a/i.test(html)) {
    throw new Error(
      "DuckDuckGo drosselt Anfragen. Kurz warten und erneut versuchen."
    )
  }

  return parseHtmlResults(html)
}

async function searchViaInstantAnswer(query: string): Promise<SearchHit[]> {
  const endpoint =
    `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}` +
    "&format=json&no_html=1&skip_disambig=1"
  const response = await fetch(endpoint, {
    headers: {
      "User-Agent": BROWSER_HEADERS["User-Agent"],
      Accept: "application/json",
    },
  })
  if (!response.ok) {
    throw new Error(`Web-Suche fehlgeschlagen (${response.status}).`)
  }

  const data = (await response.json()) as {
    AbstractText?: string
    AbstractURL?: string
    Heading?: string
    RelatedTopics?: Array<{
      Text?: string
      FirstURL?: string
      Topics?: Array<{ Text?: string; FirstURL?: string }>
    }>
  }

  const results: SearchHit[] = []

  if (data.AbstractText && data.AbstractURL) {
    results.push({
      title: data.Heading || "DuckDuckGo",
      url: data.AbstractURL,
      description: data.AbstractText,
    })
  }

  for (const topic of data.RelatedTopics ?? []) {
    if (topic.FirstURL && topic.Text) {
      results.push({
        title: topic.Text.split(" - ")[0] || topic.Text,
        url: topic.FirstURL,
        description: topic.Text,
      })
    }
    for (const nested of topic.Topics ?? []) {
      if (nested.FirstURL && nested.Text) {
        results.push({
          title: nested.Text.split(" - ")[0] || nested.Text,
          url: nested.FirstURL,
          description: nested.Text,
        })
      }
    }
    if (results.length >= MAX_RESULTS) break
  }

  return results.slice(0, MAX_RESULTS)
}

async function runSearch(query: string) {
  const cacheKey = normalizeQuery(query)
  const cached = cache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.results
  }

  await waitForRateGap()
  lastRequestAt = Date.now()

  let lastError: Error | null = null

  try {
    const htmlResults = await searchViaHtml(query)
    if (htmlResults.length > 0) {
      cache.set(cacheKey, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        results: htmlResults,
      })
      return htmlResults
    }
  } catch (err) {
    lastError =
      err instanceof Error ? err : new Error("Web-Suche fehlgeschlagen.")
  }

  try {
    await sleep(500)
    const apiResults = await searchViaInstantAnswer(query)
    if (apiResults.length > 0) {
      cache.set(cacheKey, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        results: apiResults,
      })
      return apiResults
    }
  } catch (err) {
    lastError =
      err instanceof Error ? err : new Error("Web-Suche fehlgeschlagen.")
  }

  throw lastError ?? new Error("Keine Suchtreffer gefunden.")
}

function enqueueSearch(query: string) {
  const run = searchQueue.then(() => runSearch(query))
  searchQueue = run.then(
    () => undefined,
    () => undefined
  )
  return run
}

async function handleWebSearch(req: IncomingMessage, res: ServerResponse) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204
    res.end()
    return
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" })
    return
  }

  try {
    const body = (await readJsonBody(req)) as { query?: unknown }
    const query = typeof body.query === "string" ? body.query.trim() : ""
    if (!query) {
      sendJson(res, 400, { error: "Query fehlt." })
      return
    }

    const results = await enqueueSearch(query)
    sendJson(res, 200, { results, engine: "ddg-html" })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Web-Suche fehlgeschlagen."
    const status = /drosselt|anomaly|zu schnell/i.test(message) ? 429 : 500
    sendJson(res, status, { error: message })
  }
}

export function webSearchPlugin(): Plugin {
  return {
    name: "lumina-web-search",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split("?")[0]
        if (url !== "/web-search") {
          next()
          return
        }
        void handleWebSearch(req, res).catch((err) => {
          if (!res.headersSent) {
            sendJson(res, 500, {
              error:
                err instanceof Error
                  ? err.message
                  : "Web-Suche fehlgeschlagen.",
            })
          }
        })
      })
    },
  }
}
