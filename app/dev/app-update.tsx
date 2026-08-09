import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  UpdateAvailableSheet,
  UpdateRequiredSheet,
  WhatsNewSheet,
} from '../../components/appUpdate/UpdateSheets';
import { PageHeader } from '../../components/PageHeader';
import { Screen } from '../../components/Screen';
import { type ReleaseNotes, decideAppUpdate } from '../../lib/appVersion';
import { colors } from '../../theme/tokens';

/**
 * Dev gallery: update prompts in all six states.
 * Dev-only copy stays English and out of the i18n pipeline.
 */

const NOTES: ReleaseNotes = {
  version: '1.3.0',
  title: 'Share what you saw, in video',
  highlights: [
    'Post videos in Plaza — up to 15 minutes',
    'Search now finds posts written in any language',
    'Buddy wishes are one description and one shop',
  ],
};

const LONG_GERMAN: ReleaseNotes = {
  version: '1.3.0',
  title: 'Veröffentlichungshinweise für die Aufenthaltserlaubnisverlängerung',
  highlights: [
    'Videobeiträge auf dem Marktplatz mit Aufenthaltstitelbescheinigungen teilen',
    'Volltextsuche über Anmeldebestätigungen und Krankenversicherungsnachweise',
  ],
};

const EMPTY_NOTES: ReleaseNotes = { version: '1.3.0', title: 'Small fixes', highlights: [] };

type Demo = 'whats_new' | 'available' | 'required' | 'long' | 'empty' | null;

export default function DevAppUpdateGallery() {
  const [demo, setDemo] = useState<Demo>(null);

  // The silent path has no sheet to show, so it is asserted rather than rendered.
  const silent = decideAppUpdate({
    installed: '1.3.0',
    release: {
      platform: 'ios',
      latest_version: '1.3.0',
      minimum_supported_version: null,
      store_url: 'https://apps.apple.com/app/id6768678629',
      current_notes: NOTES,
      latest_notes: NOTES,
    },
    memory: { lastSeenVersion: '1.3.0', snoozedVersion: null, snoozedAt: null },
    now: Date.now(),
  });

  const rows: { key: Demo; label: string; blurb: string }[] = [
    { key: 'whats_new', label: "What's new", blurb: 'First launch after an upgrade' },
    { key: 'available', label: 'Update available', blurb: 'Dismissible, snoozes for 7 days' },
    { key: 'required', label: 'Update required', blurb: 'Below the minimum: no dismiss, no back' },
    { key: 'long', label: 'Long German', blurb: 'Overflow stress for both title and bullets' },
    { key: 'empty', label: 'No highlights', blurb: 'Headline only, bullet list hidden' },
  ];

  return (
    <Screen
      header={<PageHeader title="App update" subtitle="Version prompts in all 6 states" />}
      scroll
      bottomGap={28}
      contentClassName="px-5 gap-3"
    >
      {rows.map((row) => (
        <Pressable
          key={row.label}
          onPress={() => setDemo(row.key)}
          className="rounded-3xl bg-white p-5 active:opacity-80"
        >
          <Text className="text-base font-extrabold text-text-main">{row.label}</Text>
          <Text className="mt-1 text-sm leading-6 text-text-secondary">{row.blurb}</Text>
        </Pressable>
      ))}

      <View
        className="rounded-3xl p-5"
        style={{ borderWidth: 1, borderColor: colors.lineWarm }}
        testID="dev.app-update.silent"
      >
        <Text className="text-base font-extrabold text-text-main">Already up to date</Text>
        <Text className="mt-1 text-sm leading-6 text-text-secondary">
          Nothing renders. decideAppUpdate → {silent.kind}
        </Text>
      </View>

      <WhatsNewSheet visible={demo === 'whats_new'} notes={NOTES} onClose={() => setDemo(null)} />
      <WhatsNewSheet visible={demo === 'long'} notes={LONG_GERMAN} onClose={() => setDemo(null)} />
      <WhatsNewSheet visible={demo === 'empty'} notes={EMPTY_NOTES} onClose={() => setDemo(null)} />
      <UpdateAvailableSheet
        visible={demo === 'available'}
        version="1.3.0"
        notes={NOTES}
        onUpdate={() => setDemo(null)}
        onLater={() => setDemo(null)}
      />
      <UpdateRequiredSheet
        visible={demo === 'required'}
        version="1.3.0"
        notes={NOTES}
        // Production has no dismiss here; the gallery needs a way back out.
        onUpdate={() => setDemo(null)}
      />
    </Screen>
  );
}
