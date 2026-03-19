export function isAdminEnabled(
  envValue = import.meta.env.VITE_ENABLE_ADMIN,
  isDev = import.meta.env.DEV,
): boolean {
  if (envValue === "true") return true;
  if (envValue === "false") return false;
  if (envValue == null || envValue === "") return Boolean(isDev);
  return false;
}
