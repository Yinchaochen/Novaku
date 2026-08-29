import { Text, TextStyle, View } from 'react-native';
import { useState } from 'react';

import { useLanguage } from '../../context/LanguageContext';
import { LANGUAGES } from '../../lib/languages';
import { LinkText } from '../../components/LinkText';

interface Props {
  originalText?: string | null;
  translatedText?: string | null;
  sourceLanguage?: string | null;
  textClassName?: string;
  textStyle?: TextStyle;
  numberOfLines?: number;
  linkify?: boolean;
  /**
   * Whether to print the "Translated from X · Show original" line.
   *
   * Feed cards pass false. The line costs two of the ~40 characters a card
   * title gets, sits in the most valuable strip of the card, and a card that
   * carries both a title and a body printed it twice. The toggle still exists
   * where a reader actually reads — the post detail.
   */
  showToggle?: boolean;
}

export function TranslatedText({
  originalText,
  translatedText,
  sourceLanguage,
  textClassName,
  textStyle,
  numberOfLines,
  linkify = false,
  showToggle = true,
}: Props) {
  const { t } = useLanguage();
  const [showOriginal, setShowOriginal] = useState(false);

  const original = originalText ?? '';
  const translated = translatedText?.trim() ? translatedText : null;
  const canToggle = Boolean(translated && translated !== original);
  const displayText = canToggle && !showOriginal ? translated : original;
  const sourceLabel = LANGUAGES.find(
    (language) => language.code.toLowerCase() === sourceLanguage?.toLowerCase(),
  )?.name;

  return (
    <View>
      {linkify ? (
        <LinkText
          text={displayText}
          className={textClassName}
          style={textStyle}
          numberOfLines={numberOfLines}
        />
      ) : (
        <Text className={textClassName} style={textStyle} numberOfLines={numberOfLines}>
          {displayText}
        </Text>
      )}
      {canToggle && showToggle ? (
        <Text
          className="mt-1 text-[11px] font-semibold text-primary"
          onPress={() => setShowOriginal((value) => !value)}
        >
          {showOriginal
            ? t.plaza.show_translation
            : sourceLabel
              ? `${t.plaza.translated_from} ${sourceLabel} · ${t.plaza.show_original}`
              : t.plaza.show_original}
        </Text>
      ) : null}
    </View>
  );
}
