import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { PageHeader } from '../../components/PageHeader';
import { Screen } from '../../components/Screen';
import { OdysseyDetailModal } from '../../features/tasks/OdysseyDetailModal';
import { colors } from '../../theme/tokens';

/**
 * Dev gallery: how a task names its source (D-121).
 *
 * Make it in Germany asked for "Mehr dazu auf ‚Make it in Germany'" with a
 * direct link, rather than a formal "Quelle:". That is a sentence where the
 * row previously held a hostname, so the thing worth looking at is whether it
 * still fits beside the open-link on a phone — in German, where it is longest.
 *
 * Dev-only copy stays English and out of the i18n pipeline.
 */

type Node = Parameters<typeof OdysseyDetailModal>[0]['node'];

function node(over: Partial<NonNullable<Node>>): NonNullable<Node> {
  return {
    id: 'dev-node',
    slug: 'de_recognition_of_qualifications',
    title: {
      en: 'Get a foreign qualification recognised',
      de: 'Ausländische Qualifikation anerkennen lassen',
      zh: '办理国外学历/资历认证',
    },
    description: {
      en: 'Germany treats regulated professions differently — medicine, nursing, teaching, law and several trades need a formal equivalence assessment before you may practise.',
      de: 'Bei reglementierten Berufen brauchst du erst eine Gleichwertigkeitsprüfung, bevor du arbeiten darfst.',
      zh: '受管制职业必须先通过资历等同性认定才能执业。',
    },
    deadline_hint: null,
    type: 'side',
    identity_scope: 'all',
    can_parallel: true,
    source_url: 'https://www.make-it-in-germany.com/en/looking-for-foreign-professionals/recruitment/foreign-qualifications',
    last_verified_at: new Date().toISOString(),
    ...over,
  } as NonNullable<Node>;
}

const STATES: { label: string; note: string; node: NonNullable<Node> }[] = [
  {
    label: 'Make it in Germany',
    note: 'The agreed wording replaces the hostname.',
    node: node({}),
  },
  {
    label: 'Another source',
    note: 'Unchanged: the host, because no wording was ever agreed for it.',
    node: node({
      slug: 'berlin_anmeldung',
      title: { en: 'Register your address', de: 'Anmeldung', zh: '户籍登记' },
      source_url: 'https://service.berlin.de/dienstleistung/120686/',
    }),
  },
  {
    label: 'No source',
    note: 'The empty state — nothing to attribute, nothing to link.',
    node: node({ source_url: null }),
  },
  {
    label: 'Never verified',
    note: 'No last_verified_at yet, which is every federal node on day one.',
    node: node({ last_verified_at: null }),
  },
];

export default function TaskSourceGallery() {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);

  return (
    <Screen>
      <PageHeader title="Task source attribution" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        <Text style={{ fontSize: 13, color: colors.textMuted }}>
          Switch the app language to German for the longest form of the label.
        </Text>
        {STATES.map((state, i) => (
          <Pressable
            key={state.label}
            onPress={() => {
              setIndex(i);
              setOpen(true);
            }}
            style={{
              borderRadius: 14,
              borderWidth: 1,
              borderColor: i === index ? colors.brandCoral : 'rgba(0,0,0,0.12)',
              padding: 14,
              backgroundColor: '#FFF8F1',
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textMain }}>
              {state.label}
            </Text>
            <Text style={{ marginTop: 4, fontSize: 12.5, color: colors.textMuted }}>
              {state.note}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <OdysseyDetailModal
        visible={open}
        node={STATES[index].node}
        state={undefined}
        onClose={() => setOpen(false)}
      />
    </Screen>
  );
}
