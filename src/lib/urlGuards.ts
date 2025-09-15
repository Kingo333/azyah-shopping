// URL type detection guards
export const isSupabaseAbsoluteUrl = (u: string): boolean =>
  /supabase\.co\/storage\/v1\/object\/public\//i.test(u);

export const isAsosUrl = (u: string): boolean =>
  /images\.asos-media\.com/i.test(u);

export const isExternalUrl = (u: string): boolean =>
  /^https?:\/\//i.test(u) && !isSupabaseAbsoluteUrl(u);

export const isApiProxyUrl = (u: string): boolean =>
  u.startsWith('https://api.azyahstyle.com');