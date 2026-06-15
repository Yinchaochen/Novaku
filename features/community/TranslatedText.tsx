import { Text, TextStyle, View } from 'react-native';
import { useState } from 'react';

import { useLanguage } from '../../context/LanguageContext';
import { findLanguage } from '../../lib/languages';
import { LinkText } from '../../components/LinkText';

interface Props {
  originalText?: string | null;
  translatedText?: string | null;
  sourceLanguage: string;
  textClassName?: string;
  textStyle?: TextStyle;
  numberOfLines?: number;
  linkify?: boolean;
}

export function TranslatedText({
  originalText,
  translatedText,
  sourceLanguage,
  textClassName,
  textStyle,
  numberOfLines,
  linkify = false,
}: Props) {
  const { t } = useLanguage();
  const [showOriginal, setShowOriginal] = useState(false);

  const original = originalText ?? '';
  const translated = translatedText?.trim() ? translatedText : null;
  const canToggle = Boolean(translated && translated !== original);
  const displayText = canToggle && !showOriginal ? translated : original;
  const sourceLabel = findLanguage(sourceLanguage).name;

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
      {canToggle ? (
        <Text
          className="mt-1 text-[11px] font-semibold text-primary"
          onPress={() => setShowOriginal((value) => !value)}
        >
          {showOriginal
            ? t.plaza.show_translation
            : `${t.plaza.translated_from} ${sourceLabel} · ${t.plaza.show_original}`}
        </Text>
      ) : null}
    </View>
  );
}
