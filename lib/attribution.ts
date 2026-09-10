/**
 * How a source is named on a task (D-118).
 *
 * Make it in Germany gave Postervia written permission on 2026-09-08 to use,
 * shorten, simplify and translate its public content, and asked for one thing
 * in return: attribution worded as "Mehr dazu auf ‚Make it in Germany'" with a
 * direct link to the page — explicitly in preference to a formal "Quelle:".
 * Their reasoning is worth keeping: the portal bundles and explains public
 * information rather than being an originating source, and "more on this at"
 * reads to a reader as help rather than as bookkeeping.
 *
 * Only that source is special-cased. Everything else keeps the hostname, which
 * is the most honest label when we have no agreed wording — and inventing a
 * friendly sentence for an office that never asked for one would be putting
 * words in its mouth.
 */

const MAKE_IT_IN_GERMANY = 'make-it-in-germany.com';

export function sourceHost(sourceUrl: string | null | undefined): string | null {
  if (!sourceUrl) return null;
  try {
    return new URL(sourceUrl).hostname.replace(/^www\./, '');
  } catch {
    return sourceUrl;
  }
}

export function isMakeItInGermany(sourceUrl: string | null | undefined): boolean {
  const host = sourceHost(sourceUrl);
  // Suffix match, not `includes`: `make-it-in-germany.com.example.org` is a
  // different site and must not borrow the agreed wording.
  return host === MAKE_IT_IN_GERMANY || (host?.endsWith(`.${MAKE_IT_IN_GERMANY}`) ?? false);
}

/** The label for the link itself: the agreed sentence, or the host. */
export function sourceLabel(
  sourceUrl: string | null | undefined,
  agreedWording: string,
): string | null {
  if (!sourceUrl) return null;
  return isMakeItInGermany(sourceUrl) ? agreedWording : sourceHost(sourceUrl);
}
