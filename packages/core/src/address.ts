const STREET_SUFFIX =
  /\b(st|street|ave|avenue|rd|road|dr|drive|ln|lane|blvd|boulevard|ct|court|way|cir|circle|hwy|highway|pkwy|parkway|ter|terrace|pl|place|trl|trail|aly|alley|loop|pass|pike|row|sq|square)\b\.?/i;

const ADDRESS_PREFIX =
  /^(look\s*up|find|search(?:\s+for)?|show(?:\s+me)?|open|go\s*to|navigate\s*to|property\s*at|pull\s*up|get|locate|map)\s+/i;

/** True when free text looks like a US street address (not a bare ZIP). */
export function looksLikeStreetAddress(raw: string): boolean {
  const q = raw.trim();
  if (!q || q.length < 5) return false;
  if (/^(\d{5})(-\d{4})?$/.test(q)) return false;

  // "1847 Maple Ave…" or "1847 Maple Avenue, Springfield, IL 62704"
  if (/^\d{1,6}\s+[A-Za-z0-9]/.test(q)) return true;

  // Number + known street suffix somewhere in the string
  if (/\d/.test(q) && STREET_SUFFIX.test(q) && q.length >= 8) return true;

  // Unit-style: "Apt 4, 123 Main St…" less common leading form
  if (/^(apt|unit|#|suite|ste)\b/i.test(q) && /\d/.test(q) && STREET_SUFFIX.test(q)) {
    return true;
  }

  return false;
}

/**
 * Extract a street address from chat / free text.
 * Prefers full "line, city, ST ZIP" spans when present.
 */
export function extractStreetAddress(raw: string): string | null {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed) return null;

  const withoutPrefix = trimmed.replace(ADDRESS_PREFIX, "").trim();
  if (looksLikeStreetAddress(withoutPrefix)) {
    return withoutPrefix.replace(/[?.!]+$/, "").trim();
  }

  // Match: 123 Main St[, City][, ST][ ZIP]
  const span = trimmed.match(
    /\b(\d{1,6}\s+[A-Za-z0-9][\w\s.'#/-]*?(?:st|street|ave|avenue|rd|road|dr|drive|ln|lane|blvd|boulevard|ct|court|way|cir|circle|hwy|highway|pkwy|parkway|ter|terrace|pl|place|trl|trail|aly|alley|loop|pass|pike|row|sq|square)\.?(?:\s+(?:apt|unit|suite|ste|#)\s*[\w-]+)?(?:\s*,\s*[^,]+){0,3})/i,
  );
  if (span?.[1]) {
    return span[1].trim().replace(/[?.!]+$/, "");
  }

  // Fallback: number + words ending in ZIP
  const withZip = trimmed.match(
    /\b(\d{1,6}\s+.+?\s+[A-Z]{2}\s+\d{5}(?:-\d{4})?)\b/i,
  );
  if (withZip?.[1] && looksLikeStreetAddress(withZip[1])) {
    return withZip[1].trim();
  }

  return null;
}

/** Split a full address for ATTOM address1 / address2 params. */
export function splitStreetAddress(query: string): {
  address: string;
  address1?: string;
  address2?: string;
} {
  const trimmed = query.trim().replace(/\s+/g, " ");
  if (!trimmed) return { address: "" };

  const comma = trimmed.indexOf(",");
  if (comma > 0) {
    return {
      address: trimmed,
      address1: trimmed.slice(0, comma).trim(),
      address2: trimmed.slice(comma + 1).trim(),
    };
  }

  // "1847 Maple Ave Springfield IL 62704"
  const suffixSplit = trimmed.match(
    new RegExp(
      `^(.+?\\b(?:st|street|ave|avenue|rd|road|dr|drive|ln|lane|blvd|boulevard|ct|court|way|cir|circle|hwy|highway|pkwy|parkway|ter|terrace|pl|place|trl|trail)\\.?)(\\s+(?:apt|unit|suite|ste|#)\\s*[\\w-]+)?\\s+(.+)$`,
      "i",
    ),
  );
  if (suffixSplit?.[1] && suffixSplit[3]) {
    const unit = suffixSplit[2]?.trim();
    const address1 = unit
      ? `${suffixSplit[1].trim()} ${unit}`
      : suffixSplit[1].trim();
    const address2 = suffixSplit[3].trim();
    if (address2.length >= 2) {
      return { address: trimmed, address1, address2 };
    }
  }

  // Trailing "ST 12345"
  const stateZip = trimmed.match(
    /^(.*?)\s+([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/,
  );
  if (stateZip?.[1] && stateZip[2] && stateZip[3]) {
    const head = stateZip[1].trim();
    // Try to peel city (last word/token group before state)
    const citySplit = head.match(/^(.*\b(?:st|street|ave|avenue|rd|road|dr|drive|ln|lane|blvd|boulevard|ct|court|way|cir|circle)\.?)\s+(.+)$/i);
    if (citySplit?.[1] && citySplit[2]) {
      return {
        address: trimmed,
        address1: citySplit[1].trim(),
        address2: `${citySplit[2].trim()}, ${stateZip[2].toUpperCase()} ${stateZip[3]}`,
      };
    }
    return {
      address: trimmed,
      address1: head,
      address2: `${stateZip[2].toUpperCase()} ${stateZip[3]}`,
    };
  }

  return { address: trimmed };
}
