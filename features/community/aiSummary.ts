// Client mirror of the backend short-content rule (D-045,
// novaku-backend/app/community/ai.py). Used only for the composer hint —
// the backend decision is authoritative. Keep thresholds in sync.
const AI_SUMMARY_MIN_CJK_CHARS = 120;
const AI_SUMMARY_MIN_WORDS = 55;

const URL_RE = /https?:\/\/\S+/g;
const CJK_RE = /[぀-ヿ㐀-䶿一-鿿豈-﫿가-힯]/g;
const WORD_RE = /[A-Za-z0-9À-ɏ]+(?:['’-][A-Za-z0-9À-ɏ]+)*/g;

export function isTooShortForAiSummary(title: string, body: string): boolean {
  const text = `${title}\n${body}`.replace(URL_RE, ' ');
  const cjkChars = (text.match(CJK_RE) ?? []).length;
  const words = (text.match(WORD_RE) ?? []).length;
  return cjkChars < AI_SUMMARY_MIN_CJK_CHARS && words < AI_SUMMARY_MIN_WORDS;
}
