// Globe "People" counts. The database returns counts per country name
// (get_globe_people_counts: shoppers who haven't hidden themselves from the
// Globe); this turns them into pins. No country, or a name we can't place,
// goes on the global pin, as before.

export function toCountryCodeCounts(
  rows: { country: string | null; people: number }[],
  toCode: (countryName: string) => string | null | undefined,
): { code: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!row.people) continue;
    const code = row.country ? toCode(row.country)?.toUpperCase() ?? null : null;
    const key = code || 'GLOBAL';
    counts.set(key, (counts.get(key) ?? 0) + row.people);
  }
  const pins = Array.from(counts.entries()).map(([code, count]) => ({ code, count }));
  // Global pin last; countries keep the database's order.
  return [...pins.filter((p) => p.code !== 'GLOBAL'), ...pins.filter((p) => p.code === 'GLOBAL')];
}
