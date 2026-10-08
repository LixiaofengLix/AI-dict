import type { Accent } from '../types/settings';

/** 口音对应的语言标签 */
const LANGUAGES: Record<Accent, string> = { us: 'en-US', uk: 'en-GB' };

/** 单词朗读稍慢一点，听得更清楚（和 ReadingBook 一致） */
const RATE = 0.9;

/** 每种口音挑一个音色：先找系统默认音，没有就用第一个匹配的；都没有就交给系统按 lang 选 */
function pickVoice(lang: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === lang && v.default) ?? voices.find((v) => v.lang === lang) ?? null
  );
}

/**
 * 朗读一段英文。用 WebView 自带的 speechSynthesis：macOS（WKWebView）和 Windows（WebView2）都支持。
 * 连点时打断上一次，不排队。
 */
export function speak(text: string, accent: Accent): void {
  const synth = window.speechSynthesis;
  const lang = LANGUAGES[accent];
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = RATE;
  utterance.voice = pickVoice(lang);
  synth.speak(utterance);
}
