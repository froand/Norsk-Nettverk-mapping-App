/**
 * Live scraper for Karantenenemnda decisions on regjeringen.no.
 *
 * The official page renders all decisions inside a single <table> where each
 * row pairs a date cell ("DD.MM.YYYY") with an anchor cell linking the PDF.
 * We avoid pulling in an HTML parser dependency: regex over the static markup
 * is plenty for this very-stable government page.
 */

const SOURCE_URL =
  'https://www.regjeringen.no/no/dep/dfd/org/styrer-rad-og-utvalg-under-digitaliserings-og-forvaltningsdepartementet/karantenenemnda/avgjorelser-fra-karantenenemnda/id2472135/';
const SITE_BASE = 'https://www.regjeringen.no';

const USER_AGENT =
  'norsk-nettverk-v2 / contact: githuh.com/froand';

export interface ScrapedKaranteneEntry {
  /** ISO date YYYY-MM-DD parsed from the page's DD.MM.YYYY. */
  date: string;
  /** Decision title (PDF link text with "(pdf)" trimmed). */
  title: string;
  /** Absolute URL to the PDF on regjeringen.no. */
  pdfUrl: string;
}

export interface ScrapeKaranteneResult {
  ok: boolean;
  /** Newest first. */
  entries: ScrapedKaranteneEntry[];
  /** Source URL we scraped, surfaced for logs. */
  sourceUrl: string;
  /** Filled when ok=false. */
  error?: string;
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
}

function stripTags(s: string): string {
  return decodeHtmlEntities(s.replace(/<[^>]*>/g, '')).trim();
}

function toIsoDate(ddmmyyyy: string): string | null {
  const m = /(\d{2})\.(\d{2})\.(\d{4})/.exec(ddmmyyyy);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

function cleanTitle(raw: string): string {
  return stripTags(raw)
    .replace(/\(p?d?f?\)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Scrape the current list of Karantenenemnda decisions.
 * Returns ok=false (rather than throwing) when the page can't be fetched or
 * has no recognisable rows; callers decide what to do with that.
 */
export async function scrapeKaranteneDecisions(): Promise<ScrapeKaranteneResult> {
  let html: string;
  try {
    const res = await fetch(SOURCE_URL, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!res.ok) {
      return {
        ok: false,
        entries: [],
        sourceUrl: SOURCE_URL,
        error: `HTTP ${res.status} ${res.statusText}`,
      };
    }
    html = await res.text();
  } catch (err) {
    return {
      ok: false,
      entries: [],
      sourceUrl: SOURCE_URL,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const entries: ScrapedKaranteneEntry[] = [];
  const seen = new Set<string>();

  // Match each table row, then pull two <td> blocks per row.
  const trRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  const tdRegex = /<td\b[^>]*>([\s\S]*?)<\/td>/gi;
  const linkRegex = /<a\b[^>]*href=["']([^"']+\.pdf)["'][^>]*>([\s\S]*?)<\/a>/i;

  let trMatch: RegExpExecArray | null;
  while ((trMatch = trRegex.exec(html)) !== null) {
    const rowHtml = trMatch[1];
    const cells: string[] = [];
    let tdMatch: RegExpExecArray | null;
    tdRegex.lastIndex = 0;
    while ((tdMatch = tdRegex.exec(rowHtml)) !== null) {
      cells.push(tdMatch[1]);
    }
    if (cells.length < 2) continue;

    const dateCell = stripTags(cells[0]);
    const date = toIsoDate(dateCell);
    if (!date) continue;

    const linkMatch = linkRegex.exec(cells[1]);
    if (!linkMatch) continue;

    let href = linkMatch[1];
    if (href.startsWith('/')) href = SITE_BASE + href;
    if (!/^https?:\/\//i.test(href)) continue;

    const title = cleanTitle(linkMatch[2]);
    if (!title) continue;

    const key = `${date}|${href}`;
    if (seen.has(key)) continue;
    seen.add(key);

    entries.push({ date, title, pdfUrl: href });
  }

  // Newest first by date, then by title for deterministic ordering.
  entries.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.title.localeCompare(b.title, 'nb');
  });

  return { ok: entries.length > 0, entries, sourceUrl: SOURCE_URL };
}
