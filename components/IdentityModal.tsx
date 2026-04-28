import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';

import { useLanguage } from '../context/LanguageContext';
import { useUpdateIdentity } from '../features/auth/useAuth';
import * as secureStore from '../lib/secureStore';

export const IDENTITY_CONFIRMED_KEY = 'identity_confirmed';

const IDENTITIES = ['newcomer', 'resident', 'traveler'] as const;
type Identity = typeof IDENTITIES[number];

interface Props {
  visible: boolean;
  onDone: () => void;
  currentIdentity?: string;
}

export function IdentityModal({ visible, onDone, currentIdentity }: Props) {
  const { t } = useLanguage();
  const update = useUpdateIdentity();
  const [selected, setSelected] = useState<Identity>(
    (currentIdentity as Identity) ?? 'newcomer'
  );

  useEffect(() => {
    setSelected((currentIdentity as Identity) ?? 'newcomer');
  }, [currentIdentity, visible]);

  const handleConfirm = async () => {
    await update.mutateAsync(selected);
    await secureStore.setItemAsync(IDENTITY_CONFIRMED_KEY, 'true');
    onDone();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View
        className="flex-1 justify-center items-center px-6"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      >
        <View className="bg-white rounded-3xl p-6 w-full">
          <Text className="text-xl font-bold text-gray-900 mb-2 text-center">
            {t.auth.identity_label}
          </Text>
          <Text className="text-gray-500 text-sm text-center mb-6">
            {t.auth.identity_hint ?? ''}
          </Text>

          <View className="gap-3 mb-6">
            {IDENTITIES.map((id) => (
              <Pressable
                key={id}
                onPress={() => setSelected(id)}
                className={`py-4 rounded-2xl items-center border-2 ${
                  selected === id
                    ? 'bg-primary border-primary'
                    : 'bg-white border-gray-200'
                }`}
              >
                <Text
                  className={`font-bold text-base ${
                    selected === id ? 'text-white' : 'text-gray-700'
                  }`}
                >
                  {t.auth[`identity_${id}`]}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={handleConfirm}
            disabled={update.isPending}
            className="bg-primary rounded-2xl py-4 items-center"
          >
            {update.isPending
              ? <ActivityIndicator color="#fff" />
              : <Text className="text-white font-bold text-base">{t.common.confirm}</Text>}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
