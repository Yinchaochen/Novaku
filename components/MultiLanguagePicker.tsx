import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LANGUAGES } from '../lib/languages';

export function MultiLanguagePicker({
  visible,
  onClose,
  selected,
  onChange,
  title,
  searchPlaceholder,
  emptyText,
  doneLabel,
}: {
  visible: boolean;
  onClose: () => void;
  selected: string[];
  onChange: (codes: string[]) => void;
  title: string;
  searchPlaceholder: string;
  emptyText: string;
  doneLabel: string;
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return LANGUAGES;
    return LANGUAGES.filter(
      (l) =>
        l.code.toLowerCase().includes(q) ||
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q),
    );
  }, [query]);

  const toggle = (code: string) => {
    onChange(
      selected.includes(code)
        ? selected.filter((c) => c !== code)
        : [...selected, code],
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-neutral-200">
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={24} color="#3B2A22" />
          </Pressable>
          <Text className="text-[15px] font-semibold text-neutral-900">{title}</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text className="text-[15px] font-semibold text-[#FF9F6E]">{doneLabel}</Text>
          </Pressable>
        </View>

        <View className="px-4 py-2">
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={searchPlaceholder}
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            autoCorrect={false}
            className="rounded-2xl bg-neutral-100 px-4 py-3 text-[15px] text-neutral-900"
          />
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.code}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View className="items-center justify-center py-12">
              <Text className="text-[14px] text-neutral-400">{emptyText}</Text>
            </View>
          }
          renderItem={({ item }) => {
            const active = selected.includes(item.code);
            return (
              <Pressable
                onPress={() => toggle(item.code)}
                className="flex-row items-center justify-between px-4 py-3 border-b border-neutral-100"
              >
                <View className="flex-1 pr-3">
                  <Text className="text-[15px] font-semibold text-neutral-900">
                    {item.nativeName}
                  </Text>
                  <Text className="text-[12px] text-neutral-500 mt-0.5">
                    {item.name} · {item.code}
                  </Text>
                </View>
                {active ? (
                  <Ionicons name="checkmark-circle" size={22} color="#FF9F6E" />
                ) : (
                  <View className="w-[22px] h-[22px] rounded-full border border-neutral-300" />
                )}
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}
