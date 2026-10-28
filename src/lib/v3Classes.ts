// Design v3 defaults for shared components. A `v3:` class always beats a
// caller's plain class (variants come later in the CSS), so each default is
// added only when the caller hasn't set that property itself.

export type V3Rule = { when: string[]; add: string };

/** The utility without its variants or `!`: "md:hover:!rounded-xl" → "rounded-xl". */
function baseUtility(token: string): string {
  let depth = 0;
  let start = 0;
  for (let i = 0; i < token.length; i++) {
    const c = token[i];
    if (c === '[') depth++;
    else if (c === ']') depth--;
    else if (c === ':' && depth === 0) start = i + 1;
  }
  return token.slice(start).replace(/^!/, '');
}

export function v3Defaults(className: string | undefined, rules: V3Rule[]): string {
  const tokens = (className ?? '').split(/\s+/).filter(Boolean);
  const bases = tokens.map(baseUtility);
  return rules
    .filter(({ when }) => !when.some((p) => tokens.some((t) => t.startsWith(p)) || bases.some((b) => b.startsWith(p))))
    .map((r) => r.add)
    .join(' ');
}
