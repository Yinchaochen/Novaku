/**
 * The wording IW Köln asked for, and the boundary around it (D-118).
 *
 * The permission to use Make it in Germany's content came with one request:
 * attribution as "Mehr dazu auf ‚Make it in Germany'" with a direct link,
 * rather than a formal "Quelle:". That sentence belongs to that source and to
 * no other.
 */

import { isMakeItInGermany, sourceHost, sourceLabel } from '../attribution';

const AGREED = 'More on this at “Make it in Germany”';

describe('sourceHost', () => {
  it('drops the www so the label reads as a name', () => {
    expect(sourceHost('https://www.make-it-in-germany.com/en/visa-residence')).toBe(
      'make-it-in-germany.com',
    );
  });

  it('returns null when there is no source', () => {
    expect(sourceHost(null)).toBeNull();
    expect(sourceHost(undefined)).toBeNull();
  });

  it('hands back an unparseable value rather than hiding the row', () => {
    expect(sourceHost('not a url')).toBe('not a url');
  });
});

describe('isMakeItInGermany', () => {
  it('matches the portal and its subdomains', () => {
    expect(isMakeItInGermany('https://www.make-it-in-germany.com/en/x')).toBe(true);
    expect(isMakeItInGermany('https://make-it-in-germany.com/de')).toBe(true);
  });

  it('does not match a host that merely contains the name', () => {
    // A substring test would hand somebody else's site the wording we agreed
    // to use for this one.
    expect(isMakeItInGermany('https://make-it-in-germany.com.example.org/x')).toBe(false);
    expect(isMakeItInGermany('https://notmake-it-in-germany.com/x')).toBe(false);
  });

  it('is false for the other sources in the DAG', () => {
    expect(isMakeItInGermany('https://service.berlin.de/dienstleistung/120686/')).toBe(false);
  });
});

describe('sourceLabel', () => {
  it('uses the agreed sentence for Make it in Germany', () => {
    expect(sourceLabel('https://www.make-it-in-germany.com/en/x', AGREED)).toBe(AGREED);
  });

  it('leaves every other source as its host', () => {
    // Inventing a friendly sentence for an office that never asked for one
    // would be putting words in its mouth.
    expect(sourceLabel('https://service.berlin.de/x', AGREED)).toBe('service.berlin.de');
  });

  it('is null when there is nothing to attribute', () => {
    expect(sourceLabel(null, AGREED)).toBeNull();
  });
});

describe('the wording is carried in every base language', () => {
  it.each(['en', 'de', 'zh'])('%s names the portal in Latin script', (lang) => {
    // The reader has to recognise it on the page they land on; a translated
    // portal name would break the attribution it exists to make.
    const copy = require(`../../locales/${lang}/common.json`);
    expect(copy.tasks.detail_source_mig).toContain('Make it in Germany');
  });

  it('German uses the exact wording IW Köln asked for', () => {
    const de = require('../../locales/de/common.json');
    expect(de.tasks.detail_source_mig).toBe('Mehr dazu auf „Make it in Germany“');
  });

  it('none of them is a formal Quelle', () => {
    for (const lang of ['en', 'de', 'zh']) {
      const copy = require(`../../locales/${lang}/common.json`);
      expect(copy.tasks.detail_source_mig).not.toMatch(/Quelle:|Source:/);
    }
  });
});
