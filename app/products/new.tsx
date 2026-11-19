import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GradientButton } from '../../components/GradientButton';
import { Screen } from '../../components/Screen';
import { SettingsHeader } from '../../components/SettingsRow';
import { ShopGuideAnchor } from '../../components/guide/ShopGuideAnchor';
import { ShopGuideSpotlight } from '../../components/guide/ShopGuideSpotlight';
import { SHOP_HELP_EMAIL } from '../../components/merchant/ShopSetupSteps';
import { useLanguage } from '../../context/LanguageContext';
import { useUploadCommunityMedia } from '../../features/community/useCommunity';
import {
  type ProductMedia,
  useCreateProduct,
  useDeleteProduct,
  useProduct,
  useUpdateProduct,
} from '../../features/merchants/useMerchants';
import { compressImageForUpload } from '../../lib/imageCompression';
import { openExternalUrl } from '../../lib/links';
import { resolveMediaUrl } from '../../lib/media';
import { parsePriceInput, priceInputFromCents } from '../../lib/merchantFormat';
import { colors } from '../../theme/tokens';

const MAX_PHOTOS = 6;
const INPUT_STYLE = {
  minHeight: 50,
  borderWidth: 2,
  borderColor: '#E5E7EB',
  borderRadius: 999,
  paddingHorizontal: 18,
  fontSize: 16,
  color: colors.textMain,
  backgroundColor: '#FFFFFF',
} as const;

// List or edit a product (D-195). ?id= edits; without it this is the guided first listing.
export default function ProductEditorScreen() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = typeof id === 'string' && id.length > 0;
  const existing = useProduct(editing ? id : null);
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct(editing ? id : '');
  const deleteProduct = useDeleteProduct();
  const uploadMedia = useUploadCommunityMedia();

  const [media, setMedia] = useState<ProductMedia[]>([]);
  const [name, setName] = useState('');
  const [priceText, setPriceText] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [listedId, setListedId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!editing || loaded || !existing.data) return;
    setMedia(existing.data.media_items);
    setName(existing.data.name);
    setPriceText(priceInputFromCents(existing.data.price_gross_cents));
    setDescription(existing.data.description ?? '');
    setLoaded(true);
  }, [editing, loaded, existing.data]);

  const busy = uploading || createProduct.isPending || updateProduct.isPending;

  const pickPhotos = async () => {
    const remaining = MAX_PHOTOS - media.length;
    if (remaining <= 0) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });
    if (result.canceled) return;
    setUploading(true);
    setMessage(null);
    try {
      const added: ProductMedia[] = [];
      for (const asset of result.assets.slice(0, remaining)) {
        const compressed = await compressImageForUpload({
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          fileName: asset.fileName,
          fileSize: asset.fileSize,
        });
        const uploaded = await uploadMedia.mutateAsync(compressed);
        added.push({
          media_url: uploaded.media_url,
          thumb_url: uploaded.thumb_url ?? null,
          width: uploaded.width ?? null,
          height: uploaded.height ?? null,
        });
      }
      setMedia((current) => [...current, ...added].slice(0, MAX_PHOTOS));
    } catch {
      setMessage(t.merchant.upload_failed);
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setMessage(t.merchant.name_required);
      return;
    }
    const price = parsePriceInput(priceText);
    if (price === undefined) {
      setMessage(t.merchant.price_invalid);
      return;
    }
    setMessage(null);
    const body = {
      name: trimmed,
      price_gross_cents: price,
      description: description.trim() || null,
      media_items: media,
    };
    try {
      if (editing) {
        await updateProduct.mutateAsync({ ...body, clear_price: price === null });
        router.back();
      } else {
        const product = await createProduct.mutateAsync(body);
        setListedId(product.id);
      }
    } catch {
      setMessage(t.common.error);
    }
  };

  const resetForAnother = () => {
    setListedId(null);
    setMedia([]);
    setName('');
    setPriceText('');
    setDescription('');
  };

  const confirmDelete = () => {
    if (!editing) return;
    const run = () =>
      void deleteProduct.mutateAsync(id).then(
        () => router.back(),
        () => setMessage(t.common.error),
      );
    if (Platform.OS === 'web') {
      if (window.confirm(`${t.merchant.delete_confirm_title}\n${t.merchant.delete_confirm_body}`)) run();
      return;
    }
    Alert.alert(t.merchant.delete_confirm_title, t.merchant.delete_confirm_body, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.merchant.delete, style: 'destructive', onPress: run },
    ]);
  };

  const emailUs = () =>
    void openExternalUrl(`mailto:${SHOP_HELP_EMAIL}?subject=${encodeURIComponent(t.merchant.email_subject)}`);

  if (editing && existing.isLoading) {
    return (
      <Screen topInset>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.brandCoral} />
        </View>
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgCream }}>
      <Screen
        scroll
        keyboard
        header={
          <View style={{ paddingTop: insets.top, backgroundColor: colors.bgCream }}>
            <SettingsHeader title={editing ? t.merchant.edit_product : t.merchant.add_product} onBack={() => router.back()} />
          </View>
        }
        contentStyle={{ paddingHorizontal: 20, paddingTop: 8, gap: 18 }}
        bottomGap={24}
        testID="product.editor"
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {media.map((item, index) => (
            <View key={`${item.media_url}-${index}`} style={{ width: 96, height: 96 }}>
              <Image
                source={{ uri: resolveMediaUrl(item.thumb_url || item.media_url) ?? undefined }}
                style={{ width: 96, height: 96, borderRadius: 20 }}
                contentFit="cover"
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.merchant.remove_photo}
                onPress={() => setMedia((current) => current.filter((_, i) => i !== index))}
                hitSlop={8}
                style={{ position: 'absolute', right: -6, top: -6, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(36,26,22,0.75)', alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="close" size={16} color="#FFFFFF" />
              </Pressable>
            </View>
          ))}
          {media.length < MAX_PHOTOS ? (
            <ShopGuideAnchor step="product_photos">
              <Pressable
                testID="product.add-photo"
                accessibilityRole="button"
                accessibilityLabel={t.merchant.add_photo}
                onPress={() => void pickPhotos()}
                disabled={uploading}
                style={{ width: 96, height: 96, borderRadius: 20, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#E0C9B8', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', gap: 4 }}
              >
                {uploading ? (
                  <ActivityIndicator color={colors.brandCoral} />
                ) : (
                  <>
                    <Ionicons name="image-outline" size={26} color={colors.brandCoral} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted }}>{t.merchant.add_photo}</Text>
                  </>
                )}
              </Pressable>
            </ShopGuideAnchor>
          ) : null}
        </View>
        <Text style={{ marginTop: -8, fontSize: 13, color: colors.textMuted }}>
          {t.merchant.photos_max} · {t.merchant.photos_cover}
        </Text>

        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textMain }}>{t.merchant.name_label}</Text>
          <ShopGuideAnchor step="product_name">
            <TextInput
              testID="product.name"
              accessibilityLabel={t.merchant.name_label}
              value={name}
              onChangeText={setName}
              maxLength={80}
              placeholder={t.merchant.name_placeholder}
              placeholderTextColor={colors.textSubtle}
              style={INPUT_STYLE}
            />
          </ShopGuideAnchor>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textMain }}>{t.merchant.price_label}</Text>
          <ShopGuideAnchor step="product_price">
            <View style={{ ...INPUT_STYLE, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: colors.textMain }}>€</Text>
              <TextInput
                testID="product.price"
                accessibilityLabel={`${t.merchant.price_label} (${t.merchant.price_vat})`}
                value={priceText}
                onChangeText={setPriceText}
                keyboardType="decimal-pad"
                placeholder="2.40"
                placeholderTextColor={colors.textSubtle}
                style={{ flex: 1, fontSize: 16, color: colors.textMain, minHeight: 46 }}
              />
              <Text style={{ fontSize: 13, color: colors.textMuted }}>{t.merchant.price_vat}</Text>
            </View>
          </ShopGuideAnchor>
          <Text style={{ fontSize: 13, color: colors.textMuted }}>{t.merchant.ask_in_shop}: {t.merchant.optional}</Text>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textMain }}>
            {t.merchant.description_label} <Text style={{ fontSize: 14, fontWeight: '400', color: colors.textMuted }}>{t.merchant.optional}</Text>
          </Text>
          <TextInput
            testID="product.description"
            accessibilityLabel={t.merchant.description_label}
            value={description}
            onChangeText={setDescription}
            maxLength={500}
            multiline
            placeholder={t.merchant.description_placeholder}
            placeholderTextColor={colors.textSubtle}
            style={{ minHeight: 84, borderWidth: 2, borderColor: '#E5E7EB', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: colors.textMain, backgroundColor: '#FFFFFF', textAlignVertical: 'top' }}
          />
        </View>

        {!editing ? (
          <View style={{ backgroundColor: '#FFF4EE', borderRadius: 22, padding: 16, gap: 6 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textMain }}>{t.merchant.email_title}</Text>
            <Text style={{ fontSize: 14, lineHeight: 22, color: colors.textBrown }}>
              {t.merchant.email_body.replace('{email}', SHOP_HELP_EMAIL)}
            </Text>
            <Pressable
              testID="product.email-us"
              accessibilityRole="button"
              onPress={emailUs}
              style={{ alignSelf: 'flex-start', marginTop: 4, minHeight: 40, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1.5, borderColor: '#FBC5B5', backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <Ionicons name="mail-outline" size={16} color="#C0453F" />
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#C0453F' }}>{t.merchant.email_button}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              testID="product.toggle-hidden"
              accessibilityRole="button"
              onPress={() =>
                void updateProduct
                  .mutateAsync({ status: existing.data?.status === 'hidden' ? 'active' : 'hidden' })
                  .catch(() => setMessage(t.common.error))
              }
              style={{ flex: 1, minHeight: 46, borderRadius: 999, borderWidth: 1.5, borderColor: '#E8E0DA', alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textMain }}>
                {existing.data?.status === 'hidden' ? t.merchant.unhide : t.merchant.hide}
              </Text>
            </Pressable>
            <Pressable
              testID="product.delete"
              accessibilityRole="button"
              onPress={confirmDelete}
              style={{ flex: 1, minHeight: 46, borderRadius: 999, borderWidth: 1.5, borderColor: '#F5C2BE', alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textDanger }}>{t.merchant.delete}</Text>
            </Pressable>
          </View>
        )}

        {message ? <Text style={{ textAlign: 'center', fontSize: 14, color: colors.textDanger }}>{message}</Text> : null}

        <ShopGuideAnchor step="product_publish">
          <GradientButton
            label={editing ? t.common.save : t.merchant.publish}
            onPress={() => void submit()}
            loading={busy}
            disabled={busy}
            fullWidth
            size="lg"
          />
        </ShopGuideAnchor>
      </Screen>

      {!editing && !listedId ? <ShopGuideSpotlight chapter="product" /> : null}

      {listedId ? (
        <View
          testID="product.listed"
          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(36,26,22,0.45)', justifyContent: 'flex-end' }}
        >
          <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingBottom: Math.max(insets.bottom, 16) + 8, alignItems: 'center', gap: 8 }}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: '#FFE3D6', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="checkmark" size={28} color="#E9605A" />
            </View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.textMain }}>{t.merchant.published_title}</Text>
            <Text style={{ fontSize: 14, lineHeight: 22, textAlign: 'center', color: colors.textBrown }}>{t.merchant.published_body}</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8, alignSelf: 'stretch' }}>
              <Pressable
                testID="product.list-another"
                accessibilityRole="button"
                onPress={resetForAnother}
                style={{ flex: 1, minHeight: 50, borderRadius: 999, borderWidth: 1.5, borderColor: '#E8E0DA', alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.textMain }}>{t.merchant.list_another}</Text>
              </Pressable>
              <Pressable
                testID="product.view"
                accessibilityRole="button"
                onPress={() => router.replace(`/products/${listedId}`)}
                style={{ flex: 1, minHeight: 50, borderRadius: 999, backgroundColor: colors.brandCoral, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFFFFF' }}>{t.merchant.view_product}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}
