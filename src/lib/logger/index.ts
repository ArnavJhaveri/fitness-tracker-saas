/**
 * Structured logger.
 *
 * In production we emit JSON lines for easy ingestion by Vercel Log Drains or
 * any log aggregator.  In development we pretty-print with colours via the
 * native console methods.
 *
 * Rule: NEVER log sensitive data (tokens, passwords, PII). If you need to log
 * a user ID that's fine; full email/name is not.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogPayload {
  message: string;
  [key: string]: unknown;
}

const isDev = process.env.NODE_ENV === "development";

function buildEntry(level: LogLevel, payload: LogPayload): string {
  return JSON.stringify({
    ts: new Date().toISOString(),
    level,
    ...payload,
  });
}

function log(level: LogLevel, payload: LogPayload) {
  if (isDev) {
    const { message, ...rest } = payload;
    const extra = Object.keys(rest).length ? rest : undefined;
    switch (level) {
      case "debug":
        console.warn(`[DEBUG] ${message}`, extra ?? "");
        break;
      case "info":
        // eslint-disable-next-line no-console
        console.info(`[INFO]  ${message}`, extra ?? "");
        break;
      case "warn":
        console.warn(`[WARN]  ${message}`, extra ?? "");
        break;
      case "error":
        console.error(`[ERROR] ${message}`, extra ?? "");
        break;
    }
    return;
  }

  // Production: JSON to stdout / stderr
  const entry = buildEntry(level, payload);
  if (level === "error") {
    process.stderr.write(entry + "\n");
  } else {
    process.stdout.write(entry + "\n");
  }
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => log("debug", { message, ...meta }),
  info: (message: string, meta?: Record<string, unknown>) => log("info", { message, ...meta }),
  warn: (message: string, meta?: Record<string, unknown>) => log("warn", { message, ...meta }),
  error: (message: string, meta?: Record<string, unknown>) => log("error", { message, ...meta }),
};
