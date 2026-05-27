const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function fupaFetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
      "Accept-Language": "de-DE,de;q=0.9",
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`FuPa ${res.status} ${url}${body ? `: ${body.slice(0, 120)}` : ""}`);
  }
  return res.json() as Promise<T>;
}

export async function fupaFetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html",
      "Accept-Language": "de-DE,de;q=0.9",
    },
  });
  if (!res.ok) throw new Error(`FuPa HTML ${res.status} ${url}`);
  return res.text();
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
