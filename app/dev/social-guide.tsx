import { Pressable, Text, View } from 'react-native';

import { SocialGuideAnchor } from '../../components/guide/SocialGuideAnchor';
import {
  GuidePublishConfirmCard,
  GuideStepCard,
  SpotlightRing,
  SpotlightScrim,
} from '../../components/guide/spotlightParts';
import { SocialGuideSpotlight } from '../../components/guide/SocialGuideSpotlight';
import { PageHeader } from '../../components/PageHeader';
import { Screen } from '../../components/Screen';
import { SurfaceCard } from '../../components/SurfaceCard';
import { socialChapterSteps } from '../../features/guide/socialGuide';
import { useSocialGuide } from '../../features/guide/useSocialGuide';
import { useSocialGuideStore } from '../../store/socialGuideStore';
import { getTranslations } from '../../lib/i18n';
import { colors, spacing, typography } from '../../theme/tokens';

/**
 * Dev gallery: the Social walkthrough in all six states.
 * Dev-only headings stay English and out of the i18n pipeline.
 */

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
  withHole = true,
}: {
  t: typeof en;
  stepNumber: number;
  stepCount: number;
  title: string;
  body: string;
  showBack: boolean;
  targetLabel?: string;
  withHole?: boolean;
}) {
  const hole = withHole ? { x: 26, y: 30, width: 220, height: 56 } : null;
  return (
    <View style={{ height: 360, borderRadius: 24, overflow: 'hidden', backgroundColor: '#FFF8F1' }}>
      {hole ? (
        <View
          style={{
            position: 'absolute',
            left: hole.x + 6,
            top: hole.y + 6,
            width: hole.width - 12,
            height: hole.height - 12,
            borderRadius: 999,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.brandCoral,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>{targetLabel}</Text>
        </View>
      ) : null}
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} pointerEvents="none">
        <SpotlightScrim hole={hole} />
        {hole ? <SpotlightRing hole={hole} radius="pill" /> : null}
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
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          top: hole ? hole.y + hole.height + 14 : 120,
        }}
      />
    </View>
  );
}

export default function SocialGuideGallery() {
  // Live rig: the real overlay measuring real anchors, including one pinned to
  // the bottom of the scroll content — the geometry that decides whether the
  // step card flips above its target.
  const liveGuide = useSocialGuide('list', false);

  return (
    <Screen
      header={(
        <PageHeader
          title="Social walkthrough"
          subtitle="Live · normal · long German · no target · confirm · last step"
        />
      )}
      scroll
      bottomGap={spacing['2xl']}
      contentStyle={{ paddingHorizontal: spacing.xl, gap: spacing['2xl'] }}
      testID="screen.dev.social-guide"
    >
      <View style={{ gap: spacing.md }}>
        <StateHeading>0. Live — real overlay, real anchors</StateHeading>
        <Pressable
          testID="dev.social-guide.start"
          onPress={liveGuide.restart}
          style={{
            minHeight: 46,
            borderRadius: 23,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.brandCoral,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Run the list chapter here</Text>
        </Pressable>
        {/* Jump straight to a step: the ring geometry is the part a headless
            browser cannot reach by tapping Continue, and it is the part that
            broke on Android before (GOTCHAS #8). */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {socialChapterSteps('list').map((meta, index) => (
            <Pressable
              key={meta.id}
              testID={`dev.social-guide.jump.${meta.id}`}
              onPress={() => useSocialGuideStore.getState().setStep(meta.id)}
              style={{
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: colors.lineWarm,
              }}
            >
              <Text style={[typography.caption, { color: colors.textMuted }]}>{index + 1}</Text>
            </Pressable>
          ))}
        </View>
        <SocialGuideAnchor step="list_tabs">
          <SurfaceCard tone="cream" padding={spacing.lg}>
            <Text style={[typography.body, { color: colors.textMuted }]}>Friends / Buddy (step 2)</Text>
          </SurfaceCard>
        </SocialGuideAnchor>
        <SocialGuideAnchor step="list_self_chat">
          <SurfaceCard tone="white" padding={spacing.lg}>
            <Text style={[typography.body, { color: colors.textMuted }]}>Self chat row (step 3)</Text>
          </SurfaceCard>
        </SocialGuideAnchor>
        <SocialGuideAnchor step="list_create" style={{ alignSelf: 'flex-start' }}>
          <SurfaceCard tone="white" padding={spacing.md}>
            <Text style={[typography.body, { color: colors.textMuted }]}>+ (step 4)</Text>
          </SurfaceCard>
        </SocialGuideAnchor>
        <SocialGuideAnchor step="list_search">
          <SurfaceCard tone="white" padding={spacing.md}>
            <Text style={[typography.body, { color: colors.textMuted }]}>Search (step 5)</Text>
          </SurfaceCard>
        </SocialGuideAnchor>
        <SocialGuideAnchor step="list_notifications" style={{ alignSelf: 'flex-start' }}>
          <SurfaceCard tone="white" padding={spacing.md}>
            <Text style={[typography.body, { color: colors.textMuted }]}>Bell (step 6)</Text>
          </SurfaceCard>
        </SocialGuideAnchor>
      </View>

      <View style={{ gap: spacing.md }}>
        <StateHeading>1. Normal — Friends / Buddy step</StateHeading>
        <SpotlightStage
          t={en}
          stepNumber={2}
          stepCount={6}
          title={en.social_guide.list_tabs_title}
          body={en.social_guide.list_tabs_body}
          showBack
          targetLabel="Friends / Buddy"
        />
      </View>

      <View style={{ gap: spacing.md }}>
        <StateHeading>2. Long German — chat composer step wraps</StateHeading>
        <SpotlightStage
          t={de}
          stepNumber={1}
          stepCount={7}
          title={de.social_guide.chat_input_title}
          body={de.social_guide.chat_input_body}
          showBack={false}
          targetLabel="Nachricht"
        />
      </View>

      <View style={{ gap: spacing.md }}>
        <StateHeading>3. No target — opening step, centred card</StateHeading>
        <SpotlightStage
          t={zh}
          stepNumber={1}
          stepCount={6}
          title={zh.social_guide.list_intro_title}
          body={zh.social_guide.list_intro_body}
          showBack={false}
          withHole={false}
        />
      </View>

      <View style={{ gap: spacing.md }}>
        <StateHeading>4. Confirm — the tour never creates anything itself</StateHeading>
        <SurfaceCard tone="white" padding={0} style={{ overflow: 'hidden' }}>
          <GuidePublishConfirmCard
            testID="dev.social-guide.confirm"
            title={en.social_guide.confirm_group_title}
            body={en.social_guide.confirm_group_body}
            confirmLabel={en.social_guide.confirm_group_cta}
            cancelLabel={en.guide.confirm_publish_back}
            onConfirm={noop}
            onCancel={noop}
          />
        </SurfaceCard>
        <SurfaceCard tone="white" padding={0} style={{ overflow: 'hidden' }}>
          <GuidePublishConfirmCard
            testID="dev.social-guide.confirm-event"
            title={zh.social_guide.confirm_event_title}
            body={zh.social_guide.confirm_event_body}
            confirmLabel={zh.social_guide.confirm_event_cta}
            cancelLabel={zh.guide.confirm_publish_back}
            onConfirm={noop}
            onCancel={noop}
          />
        </SurfaceCard>
      </View>

      <View style={{ gap: spacing.md }}>
        <StateHeading>5. Last step — meetup form, no next step after this</StateHeading>
        <SpotlightStage
          t={en}
          stepNumber={4}
          stepCount={4}
          title={en.social_guide.event_submit_title}
          body={en.social_guide.event_submit_body}
          showBack
          targetLabel="Create"
        />
      </View>

      {/* The live rig's overlay, mounted last so it paints over the gallery. */}
      <SocialGuideSpotlight chapter="list" enabled={false} />
    </Screen>
  );
}
