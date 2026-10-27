// Brand and retailer contact emails live in owner-only tables
// (brand_contacts / retailer_contacts) so shoppers can't read them.
// The public brands/retailers rows keep an always-empty contact_email column.

export type PartnerKind = 'brand' | 'retailer';

const TABLE: Record<PartnerKind, { table: string; key: string }> = {
  brand: { table: 'brand_contacts', key: 'brand_id' },
  retailer: { table: 'retailer_contacts', key: 'retailer_id' },
};

// Minimal shape of the supabase client used here (keeps this testable and
// avoids depending on generated types for the new tables).
type ContactsClient = {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: string): {
        maybeSingle(): Promise<{ data: unknown; error: unknown }>;
      };
    };
    upsert(row: Record<string, unknown>, options: { onConflict: string }): PromiseLike<{ error: unknown }>;
  };
};

/** The owner's contact email, or null (no row, or the table isn't there yet). */
export async function loadContactEmail(client: ContactsClient, kind: PartnerKind, id: string): Promise<string | null> {
  const { table, key } = TABLE[kind];
  const { data, error } = await client.from(table).select('contact_email').eq(key, id).maybeSingle();
  if (error || !data) return null;
  return (data as { contact_email?: string | null }).contact_email ?? null;
}

/** Put the private email back on a brand/retailer row for the owner's screens. */
export function withContactEmail<T extends { contact_email?: string | null }>(row: T | null, email: string | null): T | null {
  if (!row) return row;
  return { ...row, contact_email: email ?? row.contact_email ?? null };
}

/** Save the owner's email privately. An empty value clears it. Never throws. */
export async function saveContactEmail(client: ContactsClient, kind: PartnerKind, id: string, email: string): Promise<boolean> {
  const { table, key } = TABLE[kind];
  const value = email.trim() || null;
  const { error } = await client.from(table).upsert({ [key]: id, contact_email: value }, { onConflict: key });
  return !error;
}
