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

  const handleSelect = (lang: Language) => {
    onSelect(lang);
    setOpen(false);
    setQuery('');
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        className="flex-row items-center gap-1 px-3 py-1.5 rounded-xl bg-white/20 border border-white/30"
        activeOpacity={0.7}
      >
        <Text className="text-sm font-semibold text-white">
          {current.nativeName.length > 8
            ? current.nativeName.slice(0, 8) + '…'
            : current.nativeName}
        </Text>
        <Text className="text-white text-xs opacity-80">▾</Text>
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => { setOpen(false); setQuery(''); }}
      >
        <Pressable
          className="flex-1 justify-center items-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onPress={() => { setOpen(false); setQuery(''); }}
        >
          <Pressable
            className="w-5/6 rounded-3xl overflow-hidden"
            style={{ backgroundColor: '#1a1a2e', maxHeight: 520 }}
            onPress={(e) => e.stopPropagation()}
          >
            <View className="px-5 pt-5 pb-3">
              <Text className="text-white text-lg font-bold mb-3">
                {t.language.select_title}
              </Text>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t.language.search_placeholder}
                placeholderTextColor="rgba(255,255,255,0.4)"
                className="rounded-xl px-4 py-2.5 text-white text-sm"
                style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}
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
                    onPress={() => handleSelect(item)}
                    className="flex-row items-center justify-between px-5 py-3"
                    style={{
                      backgroundColor: isSelected
                        ? 'rgba(91,103,202,0.35)'
                        : 'transparent',
                    }}
                  >
                    <Text className="text-white font-medium text-sm flex-1">
                      {item.nativeName}
                    </Text>
                    <Text
                      className="text-xs ml-3"
                      style={{ color: 'rgba(255,255,255,0.45)' }}
                    >
                      {item.name}
                    </Text>
                    {isSelected && (
                      <Text className="text-primary ml-2 font-bold">✓</Text>
                    )}
                  </Pressable>
                );
              }}
              ItemSeparatorComponent={() => (
                <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 20 }} />
              )}
            />

            <Pressable
              onPress={() => { setOpen(false); setQuery(''); }}
              className="items-center py-4"
              style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' }}
            >
              <Text style={{ color: 'rgba(255,255,255,0.5)' }} className="text-sm">
                {t.common.cancel}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
