const domain = process.env.EXPO_PUBLIC_DOMAIN ?? "";
const base = domain.startsWith("http") ? domain : `https://${domain}`;
export const API_BASE_URL = `${base}/api`;
