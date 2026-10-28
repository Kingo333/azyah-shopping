// Premium plan rows must not sell hidden features (spec D7): drop UGC rows
// while ugc_collab is off and Height/Fit rows while your_fit is off.

const UGC = /\bugc\b/i;
const HEIGHT_FIT = /\bheight\b|\bfit check\b/i;

export function visiblePlanRows<T extends { name: string }>(rows: T[], flags: { ugc_collab: boolean; your_fit: boolean }): T[] {
  return rows.filter((r) => (flags.ugc_collab || !UGC.test(r.name)) && (flags.your_fit || !HEIGHT_FIT.test(r.name)));
}
