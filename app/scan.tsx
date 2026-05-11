import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert, Linking, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLanguage } from '../context/LanguageContext';

const PROFILE_DEEP_LINK_RE =
  /^vianter:\/\/profile\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export default function ScanQRCodeScreen() {
  const { t } = useLanguage();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  // Camera fires onBarcodeScanned repeatedly; lock once per scan to avoid
  // navigating multiple times on the same code.
  const lockRef = useRef(false);

  const handleBack = useCallback(() => router.back(), []);

  const handleBarcode = useCallback(
    ({ data }: { data: string }) => {
      if (lockRef.current) return;
      const match = PROFILE_DEEP_LINK_RE.exec(data.trim());
      if (!match) {
        lockRef.current = true;
        setScanning(false);
        Alert.alert(t.profile.scan_qr_invalid_title, t.profile.scan_qr_invalid_body, [
          {
            text: t.profile.scan_qr_again,
            onPress: () => {
              lockRef.current = false;
              setScanning(true);
            },
          },
          { text: t.common.cancel, style: 'cancel', onPress: handleBack },
        ]);
        return;
      }
      lockRef.current = true;
      setScanning(false);
      router.replace(`/users/${match[1]}` as never);
    },
    [t, handleBack],
  );

  const renderHeader = () => (
    <View className="flex-row items-center px-4 py-3">
      <Pressable onPress={handleBack} hitSlop={8}>
        <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
      </Pressable>
      <Text className="ml-2 text-[16px] font-semibold text-white">
        {t.profile.scan_qr_title}
      </Text>
    </View>
  );

  if (!permission) {
    return (
      <SafeAreaView className="flex-1 bg-black" edges={['top']}>
        {renderHeader()}
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 bg-black" edges={['top']}>
        {renderHeader()}
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="camera-outline" size={56} color="rgba(255,255,255,0.5)" />
          <Text className="mt-4 text-center text-[16px] font-semibold text-white">
            {t.profile.scan_qr_permission_title}
          </Text>
          <Text className="mt-2 text-center text-[13px] leading-5 text-white/70">
            {permission.canAskAgain
              ? t.profile.scan_qr_permission_body
              : t.profile.scan_qr_permission_denied}
          </Text>
          <Pressable
            onPress={async () => {
              if (permission.canAskAgain) {
                await requestPermission();
              } else {
                await Linking.openSettings();
              }
            }}
            className="mt-6 rounded-full bg-white px-6 py-2.5"
          >
            <Text className="text-[14px] font-semibold text-black">
              {t.profile.scan_qr_permission_grant}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanning ? handleBarcode : undefined}
      >
        <SafeAreaView className="flex-1" edges={['top']}>
          {renderHeader()}
          <View className="flex-1 items-center justify-center px-8">
            <View
              style={{
                width: 240,
                height: 240,
                borderRadius: 24,
                borderWidth: 2,
                borderColor: 'rgba(255,255,255,0.7)',
                backgroundColor: 'transparent',
              }}
            />
            <Text className="mt-6 text-center text-[14px] font-medium text-white">
              {t.profile.scan_qr_aim_hint}
            </Text>
          </View>
        </SafeAreaView>
      </CameraView>
    </View>
  );
}
