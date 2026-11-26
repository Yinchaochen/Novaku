import { PLAZA_INTRO_CUES, plazaIntroCue, plazaIntroLineFace } from '../plazaIntro';

describe('plazaIntroCue', () => {
  it('starts on the first line', () => {
    expect(plazaIntroCue(0)).toBe('cue_life');
    expect(plazaIntroCue(Number.NaN)).toBe('cue_life');
  });

  it('follows the parts of the video in order', () => {
    expect(plazaIntroCue(6.3)).toBe('cue_life');
    expect(plazaIntroCue(6.5)).toBe('cue_discover');
    expect(plazaIntroCue(13)).toBe('cue_feedback');
    expect(plazaIntroCue(20)).toBe('cue_chat');
    expect(plazaIntroCue(26)).toBe('cue_account');
  });

  it('keeps the last line through the closing chord, so the band never goes blank', () => {
    expect(plazaIntroCue(33)).toBe('cue_account');
    expect(plazaIntroCue(34.4)).toBe('cue_account');
  });

  it('keeps the cues in time order', () => {
    const starts = PLAZA_INTRO_CUES.map((cue) => cue.from);
    expect([...starts].sort((a, b) => a - b)).toEqual(starts);
  });
});

describe('plazaIntroLineFace', () => {
  it('uses the hand face for Latin lines', () => {
    expect(plazaIntroLineFace('en', ['Chat with friends', "Send feedback on local shops' products"])).toBe('kalam');
    expect(plazaIntroLineFace('de', ['Teile, was du in deiner Stadt entdeckst', 'Gib Läden Feedback'])).toBe('kalam');
  });

  it('uses the Chinese hand face only for simplified Chinese', () => {
    expect(plazaIntroLineFace('zh', ['和朋友聊天'])).toBe('kuaile');
    expect(plazaIntroLineFace('zh-TW', ['和朋友聊天'])).toBe('system');
  });

  it('falls back to the system face for other scripts', () => {
    expect(plazaIntroLineFace('ru', ['Общайтесь с друзьями'])).toBe('system');
    expect(plazaIntroLineFace('ar', ['تحدث مع الأصدقاء'])).toBe('system');
  });
});
