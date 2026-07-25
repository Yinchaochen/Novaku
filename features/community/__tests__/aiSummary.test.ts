import { isTooShortForAiSummary } from '../aiSummary';

describe('isTooShortForAiSummary', () => {
  it('treats a short CJK note as too short', () => {
    expect(isTooShortForAiSummary('打卡', '今天天气不错，随手拍一张。')).toBe(true);
  });

  it('clears the CJK threshold for a long Chinese post', () => {
    const body = '这是一段足够长、包含真实信息量的中文内容。'.repeat(10);
    expect(isTooShortForAiSummary('经验分享', body)).toBe(false);
  });

  it('treats a short English note as too short', () => {
    expect(isTooShortForAiSummary('quick note', 'just a tiny reminder for later')).toBe(true);
  });

  it('clears the word threshold for a long English post', () => {
    expect(isTooShortForAiSummary('guide', 'word '.repeat(60))).toBe(false);
  });

  it('does not count URLs as content', () => {
    expect(
      isTooShortForAiSummary(
        'link',
        'https://example.com/extremely-long-path-with-many-words-inside-the-url-itself'
      )
    ).toBe(true);
  });

  it('does not count emoji or punctuation as content', () => {
    expect(isTooShortForAiSummary('!!!', '😀🎉🌟✨🔥'.repeat(40) + '?!…—'.repeat(20))).toBe(true);
  });
});
