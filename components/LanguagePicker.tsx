import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useLanguage } from '../context/LanguageContext';
import { findLanguage, Language, LANGUAGES } from '../lib/languages';
import { colors, fontFamily, radius, shadows, spacing } from '../theme/tokens';

interface Props {
  currentCode: string;
  onSelect: (lang: Language) => void;
}

export function LanguagePicker({ currentCode, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { t } = useLanguage();

  const current = findLanguage(currentCode);

  const filtered = query.trim()
    ? LANGUAGES.filter(
        (l) =>
          l.name.toLowerCase().includes(query.toLowerCase()) ||
          l.nativeName.toLowerCase().includes(query.toLowerCase()) ||
          l.code.toLowerCase().includes(query.toLowerCase())
      )
    : LANGUAGES;

  const closePicker = () => {
    setOpen(false);
    setQuery('');
  };

  const handleSelect = (lang: Language) => {
    onSelect(lang);
    closePicker();
  };

  return (
    <>
      <TouchableOpacity
        testID={`language.trigger.${current.code}`}
        onPress={() => setOpen(true)}
        className="flex-row items-center gap-1 px-3 py-1.5 rounded-xl bg-white/20 border border-white/30"
        activeOpacity={0.7}
      >
        <Text className="text-sm font-semibold text-white">
          {current.nativeName.length > 8
            ? current.nativeName.slice(0, 8) + '...'
            : current.nativeName}
        </Text>
        <Ionicons name="chevron-down" size={13} color="rgba(255,255,255,0.82)" />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={closePicker}
      >
        <Pressable
          className="flex-1 justify-center items-center"
          style={{
            backgroundColor: 'rgba(36, 26, 22, 0.48)',
            paddingHorizontal: spacing.lg,
          }}
          onPress={closePicker}
        >
          <Pressable
            className="w-full overflow-hidden"
            style={{
              maxWidth: 520,
              maxHeight: 520,
              borderRadius: radius['3xl'],
              borderWidth: 1,
              borderColor: colors.lineWarm,
              backgroundColor: colors.bgCream,
              ...shadows.cardLg,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <View className="px-5 pt-5 pb-3">
              <Text
                className="text-lg font-bold mb-3"
                style={{
                  color: colors.textMain,
                  fontFamily: fontFamily.displayBold,
                }}
              >
                {t.language.select_title}
              </Text>
              <TextInput
                testID="language.search"
                value={query}
                onChangeText={setQuery}
                placeholder={t.language.search_placeholder}
                placeholderTextColor={colors.textSubtle}
                className="px-4 py-2.5 text-sm"
                style={{
                  borderRadius: radius.lg,
                  borderWidth: 1.5,
                  borderColor: colors.brandPeachLight,
                  backgroundColor: colors.cardWhiteSolid,
                  color: colors.textMain,
                  fontFamily: fontFamily.medium,
                }}
                cursorColor={colors.brandCoral}
                selectionColor={colors.brandPeachLight}
                autoFocus
              />
            </View>

            <FlatList
              data={filtered}
              keyExtractor={(item) => item.code}
              style={{ maxHeight: 380 }}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isSelected = item.code === currentCode;
                return (
                  <Pressable
                    testID={`language.option.${item.code}`}
                    onPress={() => handleSelect(item)}
                    className="flex-row items-center justify-between px-5 py-3"
                    style={({ pressed }) => ({
                      backgroundColor: isSelected
                        ? 'rgba(246, 118, 115, 0.14)'
                        : pressed
                          ? colors.bgWarm
                          : 'transparent',
                    })}
                  >
                    <Text
                      className="font-medium text-sm flex-1"
                      numberOfLines={1}
                      style={{
                        color: colors.textBrown,
                        fontFamily: fontFamily.medium,
                      }}
                    >
                      {item.nativeName}
                    </Text>
                    <Text
                      className="text-xs ml-3"
                      numberOfLines={1}
                      style={{
                        color: isSelected ? colors.brandCoral : colors.textMuted,
                        fontFamily: fontFamily.medium,
                      }}
                    >
                      {item.name}
                    </Text>
                    {isSelected ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={17}
                        color={colors.brandCoral}
                        style={{ marginLeft: spacing.sm }}
                      />
                    ) : null}
                  </Pressable>
                );
              }}
              ItemSeparatorComponent={() => (
                <View
                  style={{
                    height: 1,
                    backgroundColor: colors.lineSofter,
                    marginHorizontal: spacing.xl,
                  }}
                />
              )}
            />

            <Pressable
              onPress={closePicker}
              className="items-center py-4"
              style={({ pressed }) => ({
                borderTopWidth: 1,
                borderTopColor: colors.lineSoft,
                backgroundColor: pressed ? colors.bgWarmDeep : colors.bgWarm,
              })}
            >
              <Text
                className="text-sm"
                style={{
                  color: colors.textBrown,
                  fontFamily: fontFamily.displayBold,
                  fontWeight: '700',
                }}
              >
                {t.common.cancel}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
