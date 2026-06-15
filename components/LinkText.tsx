import { useMemo } from 'react';
import { GestureResponderEvent, StyleProp, Text, TextStyle } from 'react-native';

import { openExternalUrl, splitTextWithLinks } from '../lib/links';

interface Props {
  text?: string | null;
  className?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  linkStyle?: StyleProp<TextStyle>;
  onLinkLongPress?: (event: GestureResponderEvent) => void;
}

const LINK_STYLE: TextStyle = { color: '#2F80ED', textDecorationLine: 'underline' };

export function LinkText({ text, className, style, numberOfLines, linkStyle, onLinkLongPress }: Props) {
  const segments = useMemo(() => splitTextWithLinks(text), [text]);
  return (
    <Text className={className} style={style} numberOfLines={numberOfLines}>
      {segments.map((segment, index) =>
        segment.type === 'link' ? (
          <Text
            key={index}
            style={[LINK_STYLE, linkStyle]}
            onPress={() => void openExternalUrl(segment.href)}
            onLongPress={onLinkLongPress}
            suppressHighlighting
          >
            {segment.value}
          </Text>
        ) : (
          <Text key={index}>{segment.value}</Text>
        ),
      )}
    </Text>
  );
}
