import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

export interface SettingsRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint?: string;
  onPress: () => void;
  destructive?: boolean;
}

export function SettingsRow({ icon, label, hint, onPress, destructive }: SettingsRowProps) {
  const color = destructive ? '#F47C7C' : '#3B2A22';
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 px-4 py-4"
      android_ripple={{ color: '#F4F5F8' }}
    >
      <View className="h-9 w-9 items-center justify-center rounded-full bg-[#F4F5F8]">
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View className="flex-1">
        <Text className="text-[15px] font-semibold" style={{ color }}>
          {label}
        </Text>
        {hint ? (
          <Text className="mt-0.5 text-[12px] leading-4 text-neutral-500" numberOfLines={2}>
            {hint}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color="#C4C9D4" />
    </Pressable>
  );
}

export function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-6">
      <Text className="mb-2 px-5 text-[12px] font-semibold uppercase tracking-wider text-neutral-400">
        {title}
      </Text>
      <View className="mx-4 overflow-hidden rounded-[20px] bg-white">{children}</View>
    </View>
  );
}

export function SettingsHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View className="flex-row items-center px-3 py-3">
      <Pressable
        onPress={onBack}
        className="h-10 w-10 items-center justify-center"
        hitSlop={8}
      >
        <Ionicons name="arrow-back" size={24} color="#3B2A22" />
      </Pressable>
      <Text className="ml-1 text-[18px] font-extrabold text-neutral-900">{title}</Text>
    </View>
  );
}
