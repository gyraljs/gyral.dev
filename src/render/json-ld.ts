// Structured data (schema.org JSON-LD). Several items become one `@graph`, so a page has one
// script element; @gyral/ssr's page() writes it (the head model, ADR 0019) and escapes `<`.
import type { JsonValue } from '@gyral/core';

export type JsonLd = { readonly [key: string]: JsonValue };

/** The page's structured data as one value, or none. */
export const jsonLdValue = (items: readonly JsonLd[]): readonly JsonValue[] => {
  const [only, ...rest] = items;
  if (only === undefined) return [];
  return [rest.length === 0 ? only : { '@context': 'https://schema.org', '@graph': items }];
};
