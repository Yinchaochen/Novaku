import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChalkIcon } from '../../components/ChalkIcon';
import { SettingsHeader } from '../../components/SettingsRow';
import { useLanguage } from '../../context/LanguageContext';
import { DocumentChatSection } from '../../features/documents/DocumentChatSection';
import { DocumentRecord, useDocuments, useUploadDocument } from '../../features/documents/useDocuments';

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { error?: { message?: string } } } }).response;
    const message = response?.data?.error?.message;
    if (message) return message;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

export default function ScribeLegacyScreen() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { data: docs, isLoading, isError, isFetching, refetch } = useDocuments();
  const upload = useUploadDocument();
  const documents = docs ?? [];
  const uploadError = upload.isError ? getErrorMessage(upload.error, t.common.error) : null;

  const [cameraBusy, setCameraBusy] = useState(false);

  const pickAndUpload = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      multiple: false,
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    upload.mutate({
      uri: asset.uri,
      mimeType: asset.mimeType ?? 'application/octet-stream',
      fileName: asset.name ?? 'upload',
    });
  };

  const captureAndUpload = async () => {
    if (cameraBusy) return;
    setCameraBusy(true);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(t.documents.title, t.documents.scan_permission_denied);
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      upload.mutate({
        uri: asset.uri,
        mimeType: asset.mimeType ?? 'image/jpeg',
        fileName: asset.fileName ?? `scan-${Date.now()}.jpg`,
      });
    } finally {
      setCameraBusy(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <SettingsHeader title={t.labs.scribe_label} onBack={() => router.back()} />

      <View className="flex-row justify-end px-5 pb-2">
        <Pressable
          onPress={pickAndUpload}
          disabled={upload.isPending}
          accessibilityRole="button"
          accessibilityLabel={t.documents.upload}
          style={{
            width: 46,
            height: 46,
            borderRadius: 23,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#F0EEFF',
            borderWidth: 1,
            borderColor: '#DED9FF',
          }}
        >
          {upload.isPending ? (
            <ActivityIndicator size="small" color="#FF9F6E" />
          ) : (
            <ChalkIcon name="upload" size={28} color="#FF9F6E" />
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerClassName="px-5 pb-32 gap-3"
        refreshControl={
          <RefreshControl refreshing={isFetching && !upload.isPending} onRefresh={refetch} tintColor="#FF9F6E" />
        }
      >
        {isLoading && <ActivityIndicator color="#FF9F6E" />}
        {uploadError && <Text className="text-danger text-center">{uploadError}</Text>}
        {isError && !documents.length && <Text className="text-danger text-center">{t.common.error}</Text>}
        {documents.map((doc) => (
          <DocumentCard key={doc.id} doc={doc} />
        ))}
        {!isLoading && !documents.length && !isError && (
          <View className="items-center py-16">
            <Text className="text-gray-400 text-center">{t.documents.empty}</Text>
          </View>
        )}
      </ScrollView>

      <View
        pointerEvents="box-none"
        className="absolute left-0 right-0 items-center"
        style={{ bottom: Platform.OS === 'ios' ? 48 + insets.bottom : 48 }}
      >
        <Pressable
          onPress={captureAndUpload}
          disabled={upload.isPending || cameraBusy}
          accessibilityRole="button"
          accessibilityLabel={t.documents.scan}
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#6269D9',
            shadowColor: '#000',
            shadowOpacity: 0.18,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: 6,
          }}
        >
          {cameraBusy ? (
            <ActivityIndicator size="large" color="#FFFFFF" />
          ) : (
            <ChalkIcon name="camera" size={52} color="#FFFFFF" />
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function DocumentCard({ doc }: { doc: DocumentRecord }) {
  const { t, langCode } = useLanguage();

  const documentTitle = useMemo(() => {
    if (doc.analysis_summary) {
      try {
        const parsed = JSON.parse(doc.analysis_summary) as {
          document_type?: string;
          summary?: Record<string, string>;
        };
        if (parsed.document_type && parsed.document_type !== 'unreadable') {
          return parsed.document_type;
        }
      } catch {
        // fall through
      }
    }
    return doc.file_name ?? t.documents.untitled;
  }, [doc.analysis_summary, doc.file_name, t.documents.untitled]);

  const summary = useMemo(() => {
    if (!doc.analysis_summary) return null;
    try {
      const parsed = JSON.parse(doc.analysis_summary) as { summary?: Record<string, string> };
      const text = parsed.summary;
      if (!text) return null;
      return text[langCode] ?? text.en ?? text.zh ?? Object.values(text)[0] ?? null;
    } catch {
      return null;
    }
  }, [doc.analysis_summary, langCode]);

  const processingLabel = useMemo(() => {
    if (doc.processing_status === 'pending') return t.documents.scanning;
    if (doc.processing_status === 'ocr_done') return t.documents.analyzing;
    return null;
  }, [doc.processing_status, t.documents.analyzing, t.documents.scanning]);

  return (
    <View className="bg-white rounded-3xl p-4 shadow-sm">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="font-bold text-gray-900 flex-1 pr-3" numberOfLines={1}>
          {documentTitle}
        </Text>
        <Text className="text-xs text-gray-400">{t.documents.status[doc.processing_status]}</Text>
      </View>

      {summary && <Text className="text-gray-600 text-sm">{summary}</Text>}

      {doc.processing_status === 'failed' && doc.error_detail && (
        <Text className="mt-3 text-sm text-danger" numberOfLines={3}>
          {doc.error_detail}
        </Text>
      )}

      {processingLabel && (
        <View className="mt-3 flex-row items-center gap-2">
          <ActivityIndicator size="small" color="#FF9F6E" />
          <Text className="text-sm text-primary">{processingLabel}</Text>
        </View>
      )}

      {doc.processing_status === 'interpreted' ? <DocumentChatSection doc={doc} /> : null}
    </View>
  );
}
