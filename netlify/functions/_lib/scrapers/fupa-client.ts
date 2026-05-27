const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fupaFetchJSON<T>(url: string, retries = 3): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json",
          "Accept-Language": "de-DE,de;q=0.9",
        },
      });
      if (res.status === 429) {
        await sleep(500 * (attempt + 1));
        continue;
      }
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`FuPa ${res.status} ${url}${body ? `: ${body.slice(0, 120)}` : ""}`);
      }
      return (await res.json()) as T;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt < retries - 1) await sleep(400 * (attempt + 1));
    }
  }
  throw lastError ?? new Error(`FuPa fetch failed: ${url}`);
}

export async function fupaFetchText(url: string, retries = 2): Promise<string> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html",
          "Accept-Language": "de-DE,de;q=0.9",
        },
      });
      if (!res.ok) throw new Error(`FuPa HTML ${res.status} ${url}`);
      return res.text();
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt < retries - 1) await sleep(300);
    }
  }
  throw lastError ?? new Error(`FuPa HTML fetch failed: ${url}`);
}

/** Parallele Ausführung mit begrenzter Gleichzeitigkeit. */
export async function mapPool<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const idx = next++;
      results[idx] = await fn(items[idx]!);
    }
  });
  await Promise.all(workers);
  return results;
}
