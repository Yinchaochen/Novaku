import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { resolveMediaUrl } from '../../lib/media';
import { colors, radius, spacing, typography } from '../../theme/tokens';
import { SurfaceCard } from '../SurfaceCard';

export interface BuddyPhotoItem {
  media_url: string;
  mime_type?: string | null;
  sort_order?: number;
}

interface BuddyPhotoPickerProps {
  items: BuddyPhotoItem[];
  maxItems: number;
  addLabel: string;
  emptyTitle: string;
  emptyHint: string;
  removeLabel: string;
  isUploading?: boolean;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

export function BuddyPhotoPicker({
  items,
  maxItems,
  addLabel,
  emptyTitle,
  emptyHint,
  removeLabel,
  isUploading = false,
  onAdd,
  onRemove,
}: BuddyPhotoPickerProps) {
  const hero = items[0];
  const remaining = items.slice(1);

  return (
    <SurfaceCard padding={0} shadow="card" style={styles.shell} testID="buddy.wish.photos">
      {hero ? (
        <View>
          <Image
            source={resolveMediaUrl(hero.media_url) ?? hero.media_url}
            contentFit="cover"
            transition={140}
            style={styles.heroImage}
          />
          <Pressable
            accessibilityLabel={removeLabel}
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => onRemove(0)}
            style={styles.removeHero}
            testID="buddy.wish.photo.remove.0"
          >
            <Ionicons name="close" size={17} color="#FFFFFF" />
          </Pressable>
          <View style={styles.counterPill}>
            <Ionicons name="images-outline" size={13} color="#FFFFFF" />
            <Text style={styles.counterText}>{items.length} / {maxItems}</Text>
          </View>
        </View>
      ) : (
        <Pressable
          accessibilityLabel={addLabel}
          accessibilityRole="button"
          onPress={onAdd}
          style={styles.empty}
          testID="buddy.wish.photo.add.empty"
        >
          {isUploading ? (
            <ActivityIndicator size="large" color={colors.brandCoral} />
          ) : (
            <View style={styles.emptyIcon}>
              <Ionicons name="image-outline" size={34} color={colors.brandCoral} />
              <View style={styles.emptyPlus}>
                <Ionicons name="add" size={14} color="#FFFFFF" />
              </View>
            </View>
          )}
          <Text style={styles.emptyTitle}>{emptyTitle}</Text>
          <Text style={styles.emptyHint}>{emptyHint}</Text>
        </Pressable>
      )}

      {hero ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbnailRow}
        >
          {remaining.map((item, itemIndex) => {
            const index = itemIndex + 1;
            return (
              <View key={`${item.media_url}-${index}`} style={styles.thumbnailWrap}>
                <Image
                  source={resolveMediaUrl(item.media_url) ?? item.media_url}
                  contentFit="cover"
                  style={styles.thumbnail}
                />
                <Pressable
                  accessibilityLabel={removeLabel}
                  accessibilityRole="button"
                  hitSlop={6}
                  onPress={() => onRemove(index)}
                  style={styles.removeThumbnail}
                  testID={`buddy.wish.photo.remove.${index}`}
                >
                  <Ionicons name="close" size={12} color="#FFFFFF" />
                </Pressable>
              </View>
            );
          })}
          {items.length < maxItems ? (
            <Pressable
              accessibilityLabel={addLabel}
              accessibilityRole="button"
              disabled={isUploading}
              onPress={onAdd}
              style={styles.addThumbnail}
              testID="buddy.wish.photo.add"
            >
              {isUploading ? (
                <ActivityIndicator size="small" color={colors.brandCoral} />
              ) : (
                <>
                  <Ionicons name="add" size={25} color={colors.brandCoral} />
                  <Text numberOfLines={2} style={styles.addText}>{addLabel}</Text>
                </>
              )}
            </Pressable>
          ) : null}
        </ScrollView>
      ) : null}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: 236,
    backgroundColor: colors.bgWarm,
  },
  removeHero: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(36,26,22,0.62)',
  },
  counterPill: {
    position: 'absolute',
    left: spacing.md,
    bottom: spacing.md,
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(36,26,22,0.62)',
  },
  counterText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  empty: {
    minHeight: 236,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing['3xl'],
    backgroundColor: '#FFF4E8',
  },
  emptyIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineWarm,
  },
  emptyPlus: {
    position: 'absolute',
    right: 2,
    bottom: 3,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandCoral,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  emptyTitle: {
    ...typography.subheading,
    marginTop: spacing.lg,
    color: colors.textMain,
    textAlign: 'center',
  },
  emptyHint: {
    ...typography.caption,
    marginTop: spacing.xs,
    maxWidth: 290,
    color: colors.textMuted,
    textAlign: 'center',
  },
  thumbnailRow: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  thumbnailWrap: {
    width: 76,
    height: 76,
  },
  thumbnail: {
    width: 76,
    height: 76,
    borderRadius: radius.md,
    backgroundColor: colors.bgWarm,
  },
  removeThumbnail: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(36,26,22,0.64)',
  },
  addThumbnail: {
    width: 76,
    height: 76,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    backgroundColor: colors.cardCream,
    borderWidth: 1,
    borderColor: colors.lineWarm,
    borderStyle: 'dashed',
  },
  addText: {
    marginTop: 2,
    fontSize: 10,
    lineHeight: 12,
    color: colors.brandDeep,
    textAlign: 'center',
    fontWeight: '700',
  },
});

export default BuddyPhotoPicker;
