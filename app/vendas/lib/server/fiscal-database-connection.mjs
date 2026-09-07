function text(value) {
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
}

const HOSTNAME = /^[a-z0-9.-]+$/i;
const USERNAME = /^[a-z0-9._-]+$/i;

export function resolveFiscalDatabaseConnectionString(environment = process.env) {
  const connectionString = text(environment.FISCAL_DATABASE_URL);
  const hostname = text(environment.FISCAL_DATABASE_HOST_OVERRIDE);
  const username = text(environment.FISCAL_DATABASE_USERNAME_OVERRIDE);
  const port = text(environment.FISCAL_DATABASE_PORT_OVERRIDE);

  if (!connectionString || (!hostname && !username && !port)) return connectionString;
  if ((hostname && !HOSTNAME.test(hostname)) || (username && !USERNAME.test(username))) return '';
  if (port && (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65_535)) return '';

  try {
    const target = new URL(connectionString);
    if (!['postgres:', 'postgresql:'].includes(target.protocol)) return '';
    if (hostname) target.hostname = hostname;
    if (username) target.username = username;
    if (port) target.port = port;
    return target.toString();
  } catch {
    return '';
  }
}
