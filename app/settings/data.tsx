import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsHeader, SettingsRow, SettingsSection } from '../../components/SettingsRow';
import { useLanguage } from '../../context/LanguageContext';
import {
  DSRRequest,
  useAccountStatus,
  useCancelDeletion,
  useCreateDSR,
  useDSRList,
  useFetchDSRDownload,
  useLiftRestriction,
} from '../../features/compliance/useCompliance';

export default function DataScreen() {
  const { t, langCode } = useLanguage();
  const status = useAccountStatus();
  const dsrList = useDSRList();
  const createDsr = useCreateDSR();
  const cancelDeletion = useCancelDeletion();
  const liftRestriction = useLiftRestriction();
  const fetchDownload = useFetchDSRDownload();

  const pendingDeletion = status.data?.pending_deletion_at != null;
  const restrictionActive = status.data?.processing_restricted_at != null;
  const graceDays = status.data?.deletion_grace_days_remaining ?? 0;

  const requestErasure = () => {
    Alert.alert(
      t.settings.data_delete_confirm_title,
      t.settings.data_delete_confirm_body,
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.settings.data_delete_action,
          style: 'destructive',
          onPress: () => createDsr.mutate({ request_type: 'erasure' }),
        },
      ],
    );
  };

  const requestExport = () => {
    Alert.alert(
      t.settings.data_export_confirm_title,
      t.settings.data_export_confirm_body,
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.common.confirm,
          onPress: () =>
            createDsr.mutate(
              { request_type: 'portability' },
              { onSuccess: () => Alert.alert(t.settings.data_export_in_progress) },
            ),
        },
      ],
    );
  };

  const requestRestriction = () => {
    Alert.alert(
      t.settings.data_restrict_confirm_title,
      t.settings.data_restrict_confirm_body,
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.common.confirm,
          onPress: () => createDsr.mutate({ request_type: 'restriction' }),
        },
      ],
    );
  };

  const handleCancelDeletion = () => {
    cancelDeletion.mutate(undefined, {
      onSuccess: () => Alert.alert(t.settings.data_delete_cancelled),
    });
  };

  const handleLiftRestriction = () => {
    liftRestriction.mutate();
  };

  const handleDownload = (dsr: DSRRequest) => {
    fetchDownload.mutate(dsr.id, {
      onSuccess: async ({ download_url }) => {
        try {
          await Linking.openURL(download_url);
        } catch {
          Alert.alert(t.common.error);
        }
      },
      onError: () => Alert.alert(t.settings.data_export_expired),
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F4F5F8]" edges={['top']}>
      <SettingsHeader title={t.settings.data_title} onBack={() => router.back()} />
      <ScrollView className="flex-1" contentContainerClassName="pb-12 pt-2">
        {pendingDeletion ? (
          <PendingDeletionCard
            title={t.settings.data_delete_pending_title}
            body={t.settings.data_delete_pending_body.replace('{days}', String(graceDays))}
            actionLabel={t.settings.data_delete_cancel_action}
            onAction={handleCancelDeletion}
            pending={cancelDeletion.isPending}
          />
        ) : null}

        {restrictionActive ? (
          <PendingDeletionCard
            title={t.settings.data_restrict_active_title}
            body={t.settings.data_restrict_active_body}
            actionLabel={t.settings.data_restrict_lift_action}
            onAction={handleLiftRestriction}
            pending={liftRestriction.isPending}
            tone="info"
          />
        ) : null}

        <SettingsSection title={t.settings.data_title}>
          <SettingsRow
            icon="cloud-download-outline"
            label={t.settings.data_export}
            hint={t.settings.data_export_hint}
            onPress={requestExport}
          />
          <SettingsRow
            icon="pause-circle-outline"
            label={t.settings.data_restrict}
            hint={t.settings.data_restrict_hint}
            onPress={requestRestriction}
          />
          <SettingsRow
            icon="trash-outline"
            label={t.settings.data_delete}
            hint={t.settings.data_delete_hint}
            onPress={requestErasure}
            destructive
          />
        </SettingsSection>

        <DSRHistorySection
          title={t.settings.data_request_history}
          items={dsrList.data ?? []}
          loading={dsrList.isLoading}
          langCode={langCode}
          tStatus={{
            pending: t.settings.dsr_status_pending,
            in_progress: t.settings.dsr_status_in_progress,
            completed: t.settings.dsr_status_completed,
            rejected: t.settings.dsr_status_rejected,
            extended: t.settings.dsr_status_extended,
          }}
          dueLabel={t.settings.dsr_due_at}
          downloadLabel={t.settings.data_export_download}
          onDownload={handleDownload}
          downloading={fetchDownload.isPending}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function PendingDeletionCard({
  title,
  body,
  actionLabel,
  onAction,
  pending,
  tone,
}: {
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
  pending: boolean;
  tone?: 'info';
}) {
  const isInfo = tone === 'info';
  return (
    <View className="mx-4 mb-4 mt-2 rounded-[20px] px-5 py-4" style={{ backgroundColor: isInfo ? '#FFF8E1' : '#FFE4E6' }}>
      <View className="mb-2 flex-row items-center gap-2">
        <Ionicons name={isInfo ? 'pause-circle' : 'alert-circle'} size={18} color={isInfo ? '#8B5A00' : '#F47C7C'} />
        <Text className="text-[15px] font-extrabold" style={{ color: isInfo ? '#8B5A00' : '#A30A1F' }}>
          {title}
        </Text>
      </View>
      <Text className="text-[13px] leading-5" style={{ color: isInfo ? '#8B5A00' : '#5C0712' }}>
        {body}
      </Text>
      <Pressable
        onPress={onAction}
        disabled={pending}
        className="mt-3 self-start rounded-full px-4 py-2"
        style={{ backgroundColor: isInfo ? '#8B5A00' : '#F47C7C' }}
      >
        {pending ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text className="text-[13px] font-bold text-white">{actionLabel}</Text>
        )}
      </Pressable>
    </View>
  );
}

function DSRHistorySection({
  title,
  items,
  loading,
  langCode,
  tStatus,
  dueLabel,
  downloadLabel,
  onDownload,
  downloading,
}: {
  title: string;
  items: DSRRequest[];
  loading: boolean;
  langCode: string;
  tStatus: Record<DSRRequest['status'], string>;
  dueLabel: string;
  downloadLabel: string;
  onDownload: (dsr: DSRRequest) => void;
  downloading: boolean;
}) {
  const formatter = useMemo(
    () => new Intl.DateTimeFormat(langCode, { month: 'short', day: 'numeric' }),
    [langCode],
  );

  if (loading) {
    return (
      <View className="mt-4 items-center">
        <ActivityIndicator color="#F47C7C" />
      </View>
    );
  }

  if (items.length === 0) return null;

  return (
    <View className="mb-6">
      <Text className="mb-2 px-5 text-[12px] font-semibold uppercase tracking-wider text-neutral-400">
        {title}
      </Text>
      <View className="mx-4 overflow-hidden rounded-[20px] bg-white">
        {items.map((item, idx) => {
          const downloadable =
            (item.request_type === 'access' || item.request_type === 'portability') &&
            item.status === 'completed';
          let dueText = '';
          try {
            dueText = dueLabel.replace('{date}', formatter.format(new Date(item.due_at)));
          } catch {
            dueText = item.due_at;
          }
          return (
            <View
              key={item.id}
              className="px-4 py-3.5"
              style={
                idx < items.length - 1
                  ? { borderBottomWidth: 1, borderBottomColor: '#EEF0F4' }
                  : undefined
              }
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-[14px] font-semibold text-neutral-900">
                  {item.request_type}
                </Text>
                <Text className="text-[12px] font-semibold text-neutral-500">
                  {tStatus[item.status]}
                </Text>
              </View>
              <Text className="mt-1 text-[12px] text-neutral-500">{dueText}</Text>
              {downloadable ? (
                <Pressable
                  onPress={() => onDownload(item)}
                  disabled={downloading}
                  className="mt-2 self-start rounded-full bg-[#F47C7C] px-3 py-1.5"
                >
                  {downloading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text className="text-[12px] font-bold text-white">{downloadLabel}</Text>
                  )}
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}
