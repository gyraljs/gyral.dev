// Structured data (schema.org JSON-LD). Rendered as one script element; `<` is escaped so no
// string in the data can close the element.
import { nothing, raw, type ChildValue } from '@gyral/core';

export type JsonLd = Readonly<Record<string, unknown>>;

export const jsonLdScript = (items: readonly JsonLd[]): ChildValue =>
  items.length === 0
    ? nothing
    : raw(
        `<script type="application/ld+json">${JSON.stringify(
          items.length === 1 ? items[0] : { '@context': 'https://schema.org', '@graph': items },
        ).replace(/</g, '\\u003c')}</script>`,
      );
