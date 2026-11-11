/** Canonical public origin. Every absolute URL the site emits is built from this. */
export const SITE_ORIGIN = "https://agentsurface.dev";

/**
 * Advertised size of /llms-full.txt. The runtime contract test fails when the live
 * export drifts more than 10% from these, so the published figure stays honest.
 */
export const FULL_EXPORT_BYTES = 1_900_000;
export const FULL_EXPORT_TOKENS = 470_000;
export const FULL_EXPORT_SIZE = `roughly ${(FULL_EXPORT_BYTES / 1_000_000).toFixed(1)} MB and ${FULL_EXPORT_TOKENS.toLocaleString("en-GB")} estimated tokens`;
