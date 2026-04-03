/**
 * `pg` / pg-connection-string emit a Node warning when sslmode is require, prefer, or
 * verify-ca without opting into libpq semantics. Those modes currently behave like verify-full;
 * making that explicit silences the warning and matches current TLS verification.
 *
 * @see https://www.postgresql.org/docs/current/libpq-ssl.html
 */
export function normalizePgConnectionString(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    const mode = url.searchParams.get("sslmode")?.toLowerCase();
    if (
      mode &&
      ["require", "prefer", "verify-ca"].includes(mode) &&
      !url.searchParams.has("uselibpqcompat")
    ) {
      url.searchParams.set("sslmode", "verify-full");
    }
    return url.href;
  } catch {
    return connectionString;
  }
}
