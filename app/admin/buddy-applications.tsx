import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsHeader } from '../../components/SettingsRow';
import { useLanguage } from '../../context/LanguageContext';
import {
  BuddyApplicationListItem,
  BuddyApplicationStatus,
  useAdminBuddyApplicationDetail,
  useAdminBuddyApplications,
  useAdminUpdateBuddyApplication,
} from '../../features/buddy/useBuddy';

const FILTERS: { value: BuddyApplicationStatus | null; key: 'all' | BuddyApplicationStatus }[] = [
  { value: 'pending', key: 'pending' },
  { value: 'approved', key: 'approved' },
  { value: 'invited', key: 'invited' },
  { value: 'rejected', key: 'rejected' },
  { value: null, key: 'all' },
];

export default function AdminBuddyApplicationsScreen() {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<BuddyApplicationStatus | null>('pending');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: applications, isLoading } = useAdminBuddyApplications(filter);

  return (
    <SafeAreaView className="flex-1 bg-[#F4F5F8]" edges={['top']}>
      <SettingsHeader title={t.buddy.admin.title} onBack={() => router.back()} />

      <View className="flex-row flex-wrap gap-2 px-4 py-2">
        {FILTERS.map((f) => {
          const active = filter === f.value;
          const label = t.buddy.admin[`filter_${f.key}` as const];
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.value)}
              className="rounded-full px-3 py-1.5 border"
              style={{
                backgroundColor: active ? '#FF9F6E' : '#FFFFFF',
                borderColor: active ? '#FF9F6E' : '#F2DCCB',
              }}
            >
              <Text
                className="text-[13px] font-semibold"
                style={{ color: active ? '#FFFFFF' : '#3B2A22' }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-12 px-4 gap-2">
        {isLoading ? (
          <ActivityIndicator color="#FF9F6E" className="mt-6" />
        ) : !applications || applications.length === 0 ? (
          <Text className="text-center text-neutral-500 mt-12">{t.buddy.admin.empty}</Text>
        ) : (
          applications.map((app) => (
            <ApplicationRow key={app.id} application={app} onPress={() => setSelectedId(app.id)} />
          ))
        )}
      </ScrollView>

      <Modal
        visible={Boolean(selectedId)}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedId(null)}
      >
        {selectedId ? (
          <ApplicationDetail applicationId={selectedId} onClose={() => setSelectedId(null)} />
        ) : null}
      </Modal>
    </SafeAreaView>
  );
}

function ApplicationRow({
  application,
  onPress,
}: {
  application: BuddyApplicationListItem;
  onPress: () => void;
}) {
  const date = new Date(application.created_at).toLocaleString();
  const statusColor = STATUS_COLOR[application.status];

  return (
    <Pressable onPress={onPress} className="rounded-2xl bg-white p-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-[15px] font-bold text-neutral-900">{application.full_name}</Text>
        <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: statusColor.bg }}>
          <Text className="text-[11px] font-semibold" style={{ color: statusColor.text }}>
            {application.status}
          </Text>
        </View>
      </View>
      <Text className="text-[12px] text-neutral-500 mt-1">
        {application.city} · {application.service_categories.join(', ')}
      </Text>
      <Text className="text-[11px] text-neutral-400 mt-1">{date}</Text>
    </Pressable>
  );
}

function ApplicationDetail({
  applicationId,
  onClose,
}: {
  applicationId: string;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const { data: application, isLoading } = useAdminBuddyApplicationDetail(applicationId);
  const update = useAdminUpdateBuddyApplication(applicationId);
  const [notes, setNotes] = useState('');
  const [notesInitialized, setNotesInitialized] = useState(false);

  if (application && !notesInitialized) {
    setNotes(application.reviewer_notes ?? '');
    setNotesInitialized(true);
  }

  const apply = (status: BuddyApplicationStatus) => {
    update.mutate(
      { status, reviewer_notes: notes.trim() || null },
      {
        onSuccess: () => {
          Alert.alert(t.buddy.admin.title, t.buddy.admin.saved_toast, [
            { text: t.common.confirm, onPress: onClose },
          ]);
        },
        onError: () => {
          Alert.alert(t.buddy.admin.title, t.common.error);
        },
      }
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F4F5F8]" edges={['top', 'bottom']}>
      <SettingsHeader title={t.buddy.admin.detail_title} onBack={onClose} />

      <ScrollView className="flex-1" contentContainerClassName="pb-12 px-4 gap-4 pt-2">
        {isLoading || !application ? (
          <ActivityIndicator color="#FF9F6E" className="mt-6" />
        ) : (
          <>
            <View className="rounded-2xl bg-white p-4 gap-1">
              <Text className="text-[18px] font-extrabold text-neutral-900">{application.full_name}</Text>
              <Text className="text-[13px] text-neutral-600">{application.whatsapp}</Text>
              <Pressable
                onPress={() => Linking.openURL(`https://wa.me/${application.whatsapp.replace(/[^\d+]/g, '')}`)}
                className="mt-2 rounded-full bg-[#25D366] px-4 py-2 self-start"
              >
                <Text className="text-white text-[13px] font-semibold">{t.buddy.admin.open_whatsapp}</Text>
              </Pressable>
            </View>

            <DetailSection title={t.buddy.admin.bio_section} body={application.bio} />
            {application.experience ? (
              <DetailSection title={t.buddy.admin.experience_section} body={application.experience} />
            ) : null}

            <View className="rounded-2xl bg-white p-4 gap-1">
              <Text className="text-[12px] font-semibold uppercase tracking-wider text-neutral-400">
                {t.buddy.admin.languages_section}
              </Text>
              <Text className="text-[13px] text-neutral-700">
                Native: {application.native_languages.join(', ') || '—'}
              </Text>
              <Text className="text-[13px] text-neutral-700">
                Fluent: {application.fluent_languages?.join(', ') || '—'}
              </Text>
              {application.gender ? (
                <Text className="text-[13px] text-neutral-700">Gender: {application.gender}</Text>
              ) : null}
              {application.years_in_city != null ? (
                <Text className="text-[13px] text-neutral-700">Years in city: {application.years_in_city}</Text>
              ) : null}
              {application.willing_to_serve_female_only ? (
                <Text className="text-[13px] text-neutral-700">Female-only: yes</Text>
              ) : null}
            </View>

            <View className="rounded-2xl bg-white p-4 gap-1">
              <Text className="text-[12px] font-semibold uppercase tracking-wider text-neutral-400">
                {t.buddy.admin.categories_section}
              </Text>
              <Text className="text-[13px] text-neutral-700">
                {application.service_categories.join(', ')}
              </Text>
            </View>

            <View className="rounded-2xl bg-white p-4 gap-1">
              <Text className="text-[12px] font-semibold uppercase tracking-wider text-neutral-400">
                {t.buddy.admin.meta_section}
              </Text>
              <Text className="text-[13px] text-neutral-700">
                {t.buddy.admin.submitted_at}: {new Date(application.created_at).toLocaleString()}
              </Text>
              <Text className="text-[13px] text-neutral-700">
                {t.buddy.admin.submitted_locale}: {application.submitted_locale ?? '—'}
              </Text>
              <Text className="text-[13px] text-neutral-700">
                {t.buddy.admin.referral_source}: {application.referral_source ?? '—'}
              </Text>
            </View>

            <View>
              <Text className="text-[13px] font-semibold text-neutral-700 mb-2">
                {t.buddy.admin.reviewer_notes_label}
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder={t.buddy.admin.reviewer_notes_placeholder}
                placeholderTextColor="#9CA3AF"
                multiline
                textAlignVertical="top"
                numberOfLines={4}
                className="rounded-2xl bg-white px-4 py-3 text-[15px] text-neutral-900 min-h-[80px]"
              />
            </View>

            <View className="flex-row flex-wrap gap-2">
              <ActionButton
                label={t.buddy.admin.action_approve}
                color="#226A33"
                disabled={update.isPending || application.status === 'approved'}
                onPress={() => apply('approved')}
              />
              <ActionButton
                label={t.buddy.admin.action_invite}
                color="#7B5A14"
                disabled={update.isPending || application.status === 'invited'}
                onPress={() => apply('invited')}
              />
              <ActionButton
                label={t.buddy.admin.action_reject}
                color="#8B2A30"
                disabled={update.isPending || application.status === 'rejected'}
                onPress={() => apply('rejected')}
              />
              <ActionButton
                label={t.buddy.admin.action_reset}
                color="#FF9F6E"
                disabled={update.isPending || application.status === 'pending'}
                onPress={() => apply('pending')}
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailSection({ title, body }: { title: string; body: string }) {
  return (
    <View className="rounded-2xl bg-white p-4 gap-1">
      <Text className="text-[12px] font-semibold uppercase tracking-wider text-neutral-400">
        {title}
      </Text>
      <Text className="text-[14px] leading-5 text-neutral-800">{body}</Text>
    </View>
  );
}

function ActionButton({
  label,
  color,
  disabled,
  onPress,
}: {
  label: string;
  color: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className="rounded-full px-4 py-2"
      style={{ backgroundColor: color, opacity: disabled ? 0.4 : 1 }}
    >
      <Text className="text-white text-[13px] font-semibold">{label}</Text>
    </Pressable>
  );
}

const STATUS_COLOR: Record<BuddyApplicationStatus, { bg: string; text: string }> = {
  pending: { bg: '#F0EEFF', text: '#3B3F8F' },
  approved: { bg: '#E8F8EC', text: '#226A33' },
  invited: { bg: '#FFF6E1', text: '#7B5A14' },
  rejected: { bg: '#FFE9EA', text: '#8B2A30' },
};
