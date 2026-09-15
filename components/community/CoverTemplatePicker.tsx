import { Text, View } from 'react-native';

import { FeedbackPressable } from '../FeedbackPressable';
import { useLanguage } from '../../context/LanguageContext';
import {
  COVER_TEMPLATE_IDS,
  COVER_TEMPLATES,
  templatePalette,
  type CoverTemplateId,
} from '../../lib/postCover';
import { colors } from '../../theme/tokens';

/**
 * Which cover a text post wears, chosen by the person writing it (D-141).
 *
 * The cover has been drawn since D-135, but the author had no say in it: the
 * palette came from the post type and a hash of the id. Xiaohongshu's composer
 * hands that choice over — a named family, then a colour inside it — and that
 * is the whole reason a wall of their text notes reads as designed rather than
 * as generated.
 *
 * Two rows and nothing else. Their web composer has a scrolling rail of
 * families with three variants each and a colour row under the selected one;
 * on a phone composer that is a screen of its own, and this has to sit inside
 * a form the author is already halfway through. So: the families as swatched
 * chips, the chosen family's colours underneath, and the real cover drawn full
 * size below by the caller — the preview is the product, not a thumbnail of it.
 */
export function CoverTemplatePicker({
  template,
  paletteIndex,
  onChange,
}: {
  template: CoverTemplateId | null;
  paletteIndex: number;
  onChange: (template: CoverTemplateId | null, paletteIndex: number) => void;
}) {
  const { t } = useLanguage();
  // The default is a real choice with a real name, not the absence of one —
  // but it stays NULL on the wire, so a post that never touched this picker
  // and a post that chose the default are the same row.
  const active = template;

  return (
    <View>
      <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.textMuted, marginBottom: 8 }}>
        {t.plaza.cover_template_label}
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <FamilyChip
          label={t.plaza.cover_template_default}
          swatch={null}
          selected={active === null}
          onPress={() => onChange(null, 0)}
          testID="plaza.cover-template-default"
        />
        {COVER_TEMPLATE_IDS.map((id) => (
          <FamilyChip
            key={id}
            label={t.plaza[`cover_template_${id}`]}
            // The chip wears the family's first colour as the family's face,
            // which is how the rail reads at a glance in their composer too.
            swatch={templatePalette(id, 0).paper}
            border={templatePalette(id, 0).ink}
            selected={active === id}
            onPress={() => onChange(id, 0)}
            testID={`plaza.cover-template-${id}`}
          />
        ))}
      </View>

      {active ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
          {COVER_TEMPLATES[active].swatches.map((swatch, index) => {
            const chosen = index === paletteIndex % COVER_TEMPLATES[active].swatches.length;
            return (
              <FeedbackPressable
                key={swatch}
                onPress={() => onChange(active, index)}
                hitSlop={6}
                testID={`plaza.cover-palette-${index}`}
                accessibilityLabel={`${t.plaza.cover_palette_label} ${index + 1}`}
                pressedStyle={{ opacity: 0.7 }}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  backgroundColor: swatch,
                  borderWidth: chosen ? 2.5 : 1,
                  borderColor: chosen ? colors.brandCoral : 'rgba(98, 57, 40, 0.14)',
                }}
              />
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function FamilyChip({
  label,
  swatch,
  border,
  selected,
  onPress,
  testID,
}: {
  label: string;
  swatch: string | null;
  border?: string;
  selected: boolean;
  onPress: () => void;
  testID: string;
}) {
  return (
    <FeedbackPressable
      onPress={onPress}
      hitSlop={4}
      testID={testID}
      pressedStyle={{ opacity: 0.8 }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        paddingVertical: 7,
        paddingHorizontal: 12,
        borderRadius: 999,
        backgroundColor: selected ? '#FFE8DA' : '#FFFFFF',
        borderWidth: selected ? 1.5 : 1,
        borderColor: selected ? colors.brandCoral : 'rgba(98, 57, 40, 0.10)',
      }}
    >
      {swatch ? (
        <View
          style={{
            width: 14,
            height: 14,
            borderRadius: 4,
            backgroundColor: swatch,
            borderWidth: 1,
            borderColor: border ?? 'rgba(98, 57, 40, 0.18)',
          }}
        />
      ) : null}
      <Text
        style={{
          fontSize: 12.5,
          fontWeight: '700',
          color: selected ? colors.brandCoral : colors.textBrown,
        }}
      >
        {label}
      </Text>
    </FeedbackPressable>
  );
}
