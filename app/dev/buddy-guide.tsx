import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { BuddyFormField } from '../../components/buddy/BuddyFormField';
import { BuddyGuideAnchor } from '../../components/guide/BuddyGuideAnchor';
import { BuddyGuideSpotlight } from '../../components/guide/BuddyGuideSpotlight';
import { useBuddyGuide } from '../../features/guide/useBuddyGuide';
import {
  GuidePublishConfirmCard,
  GuideStepCard,
  SpotlightRing,
  SpotlightScrim,
} from '../../components/guide/spotlightParts';
import { PageHeader } from '../../components/PageHeader';
import { Screen } from '../../components/Screen';
import { StateBlock } from '../../components/StateBlock';
import { SurfaceCard } from '../../components/SurfaceCard';
import { getTranslations } from '../../lib/i18n';
import { colors, spacing, typography } from '../../theme/tokens';

const noop = () => undefined;
const en = getTranslations('en');
const de = getTranslations('de');
const zh = getTranslations('zh');

function StateHeading({ children }: { children: string }) {
  return <Text style={[typography.bodyStrong, { color: colors.textMain }]}>{children}</Text>;
}

// One static spotlight moment: fake control + scrim hole + ring + step card.
function SpotlightStage({
  t,
  stepNumber,
  stepCount,
  title,
  body,
  showBack,
  targetLabel,
}: {
  t: typeof en;
  stepNumber: number;
  stepCount: number;
  title: string;
  body: string;
  showBack: boolean;
  targetLabel: string;
}) {
  const hole = { x: 26, y: 30, width: 200, height: 60 };
  return (
    <View style={{ height: 340, borderRadius: 24, overflow: 'hidden', backgroundColor: '#FFF8F1' }}>
      <View
        style={{
          position: 'absolute',
          left: hole.x + 6,
          top: hole.y + 6,
          width: hole.width - 12,
          height: hole.height - 12,
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.brandCoral,
        }}
      >
        <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>{targetLabel}</Text>
      </View>
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} pointerEvents="none">
        <SpotlightScrim hole={hole} />
        <SpotlightRing hole={hole} radius={16} />
      </View>
      <GuideStepCard
        stepNumber={stepNumber}
        stepCount={stepCount}
        title={title}
        body={body}
        progressTemplate={t.guide.step_progress}
        backLabel={t.guide.back_step}
        skipAllLabel={t.guide.skip_all}
        continueLabel={t.guide.continue_step}
        showBack={showBack}
        onBack={noop}
        onSkipAll={noop}
        onContinue={noop}
        style={{ position: 'absolute', left: 16, right: 16, top: hole.y + hole.height + 14 }}
      />
    </View>
  );
}

export default function BuddyGuideGallery() {
  // Live rig: the real overlay measuring real anchors, including one pinned to
  // the bottom-right like the Buddy tab's + button (the geometry that decides
  // whether the step card flips above its target).
  const liveGuide = useBuddyGuide('feed', false);
  const [description, setDescription] = useState(
    'Two cream Tokyo stationery sets, medium size. The lid must be matte, not glossy.',
  );
  const [whereToBuy, setWhereToBuy] = useState('Don Quijote, Shinjuku, Tokyo');
  const [emptyDescription, setEmptyDescription] = useState('');
  const [emptyWhereToBuy, setEmptyWhereToBuy] = useState('');
  const [deDescription, setDeDescription] = useState(
    'Zwei cremefarbene Schreibwaren-Sets aus Tokio in mittlerer Größe — der Deckel muss unbedingt matt und nicht glänzend sein.',
  );

  return (
    <Screen
      header={(
        <PageHeader
          title="Buddy walkthrough + wish form"
          subtitle="Normal · long German · empty · loading · self · other"
        />
      )}
      scroll
      bottomGap={spacing['2xl']}
      contentStyle={{ paddingHorizontal: spacing.xl, gap: spacing['2xl'] }}
      testID="screen.dev.buddy-guide"
    >
      <View style={{ gap: spacing.md }}>
        <StateHeading>0. Live — real overlay, real anchors (bottom-pinned target)</StateHeading>
        <Pressable
          testID="dev.buddy-guide.start"
          onPress={liveGuide.restart}
          style={{
            minHeight: 46,
            borderRadius: 23,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.brandCoral,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Run the feed chapter here</Text>
        </Pressable>
        <BuddyGuideAnchor step="feed_categories">
          <SurfaceCard tone="cream" padding={spacing.lg}>
            <Text style={[typography.body, { color: colors.textMuted }]}>Category rail (step 2)</Text>
          </SurfaceCard>
        </BuddyGuideAnchor>
        <BuddyGuideAnchor step="feed_saved" style={{ alignSelf: 'flex-start' }}>
          <SurfaceCard tone="white" padding={spacing.md}>
            <Text style={[typography.body, { color: colors.textMuted }]}>Saved (step 3)</Text>
          </SurfaceCard>
        </BuddyGuideAnchor>
      </View>

      <View style={{ gap: spacing.md }}>
        <StateHeading>1. Normal — wish fields (one description, one where-to-buy)</StateHeading>
        <SurfaceCard tone="white" style={{ gap: spacing.md }}>
          <BuddyFormField
            label={en.buddy.field_description}
            hint={en.buddy.field_description_hint}
            value={description}
            onChangeText={setDescription}
            placeholder={en.buddy.compose_description_placeholder}
            multiline
            maxLength={2500}
          />
          <BuddyFormField
            label={en.buddy.field_where_to_buy}
            hint={en.buddy.field_where_to_buy_hint}
            value={whereToBuy}
            onChangeText={setWhereToBuy}
            placeholder={en.buddy.compose_where_to_buy_placeholder}
            maxLength={100}
          />
        </SurfaceCard>
        <SpotlightStage
          t={en}
          stepNumber={2}
          stepCount={8}
          title={en.buddy_guide.wish_description_title}
          body={en.buddy_guide.wish_description_body}
          showBack
          targetLabel={en.buddy.field_description}
        />
      </View>

      <View style={{ gap: spacing.md }}>
        <StateHeading>2. Long German — labels, hints and step copy wrap</StateHeading>
        <SurfaceCard tone="white" style={{ gap: spacing.md }}>
          <BuddyFormField
            label={de.buddy.field_description}
            hint={de.buddy.field_description_hint}
            value={deDescription}
            onChangeText={setDeDescription}
            placeholder={de.buddy.compose_description_placeholder}
            multiline
            maxLength={2500}
          />
          <BuddyFormField
            label={de.buddy.field_where_to_buy}
            hint={de.buddy.field_where_to_buy_hint}
            value=""
            onChangeText={noop}
            placeholder={de.buddy.compose_where_to_buy_placeholder}
            maxLength={100}
          />
        </SurfaceCard>
        <SpotlightStage
          t={de}
          stepNumber={5}
          stepCount={8}
          title={de.buddy_guide.wish_shipping_title}
          body={de.buddy_guide.wish_shipping_body}
          showBack
          targetLabel={de.buddy.field_accepts_shipping}
        />
      </View>

      <View style={{ gap: spacing.md }}>
        <StateHeading>3. Empty — untouched form, first walkthrough step (no target yet)</StateHeading>
        <SurfaceCard tone="white" style={{ gap: spacing.md }}>
          <BuddyFormField
            label={zh.buddy.field_description}
            hint={zh.buddy.field_description_hint}
            value={emptyDescription}
            onChangeText={setEmptyDescription}
            placeholder={zh.buddy.compose_description_placeholder}
            multiline
            maxLength={2500}
          />
          <BuddyFormField
            label={zh.buddy.field_where_to_buy}
            hint={zh.buddy.field_where_to_buy_hint}
            value={emptyWhereToBuy}
            onChangeText={setEmptyWhereToBuy}
            placeholder={zh.buddy.compose_where_to_buy_placeholder}
            maxLength={100}
          />
        </SurfaceCard>
        <View style={{ height: 300, borderRadius: 24, overflow: 'hidden', backgroundColor: '#FFF8F1' }}>
          <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} pointerEvents="none">
            <SpotlightScrim hole={null} />
          </View>
          <GuideStepCard
            stepNumber={1}
            stepCount={4}
            title={zh.buddy_guide.feed_intro_title}
            body={zh.buddy_guide.feed_intro_body}
            progressTemplate={zh.guide.step_progress}
            backLabel={zh.guide.back_step}
            skipAllLabel={zh.guide.skip_all}
            continueLabel={zh.guide.continue_step}
            showBack={false}
            onBack={noop}
            onSkipAll={noop}
            onContinue={noop}
            style={{ position: 'absolute', left: 16, right: 16, top: 90 }}
          />
        </View>
      </View>

      <View style={{ gap: spacing.md }}>
        <StateHeading>4. Loading — nothing to wait for</StateHeading>
        <SurfaceCard tone="white" padding={spacing.lg}>
          <Text style={[typography.body, { color: colors.textMuted }]}>
            The Buddy tour is local-only: chapters are read from AsyncStorage once and every step
            advances in the same frame as the tap. Nothing auto-starts before that read resolves, so
            a returning user never sees a flash of a tour they already finished.
          </Text>
        </SurfaceCard>
      </View>

      <View style={{ gap: spacing.md }}>
        <StateHeading>5. Self — the guided Post tap asks first (never auto-publishes)</StateHeading>
        <View style={{ borderRadius: 24, overflow: 'hidden', backgroundColor: 'rgba(36,26,22,0.30)', paddingTop: 40 }}>
          <GuidePublishConfirmCard
            title={en.guide.confirm_publish_title}
            body={en.buddy_guide.confirm_publish_body}
            confirmLabel={en.guide.confirm_publish_cta}
            cancelLabel={en.guide.confirm_publish_back}
            onConfirm={noop}
            onCancel={noop}
          />
        </View>
      </View>

      <View style={{ gap: spacing.md }}>
        <StateHeading>6. Other — feed chapter, seen state</StateHeading>
        <SpotlightStage
          t={en}
          stepNumber={4}
          stepCount={4}
          title={en.buddy_guide.feed_create_title}
          body={en.buddy_guide.feed_create_body}
          showBack
          targetLabel="＋"
        />
        <StateBlock
          tone="neutral"
          icon="checkmark-circle-outline"
          title="Already seen"
          message="Once a chapter is finished or skipped it never auto-starts again. The ? button in the Buddy header and in the composer header replays it on demand."
        />
      </View>

      {/* Bottom-pinned target: same geometry as the Buddy tab's + button. */}
      <BuddyGuideAnchor
        step="feed_create"
        style={{ position: 'absolute', bottom: 24, right: 24, zIndex: 30 }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.brandCoral,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 26, fontWeight: '800' }}>＋</Text>
        </View>
      </BuddyGuideAnchor>

      <BuddyGuideSpotlight chapter="feed" />
    </Screen>
  );
}
