import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../../theme/tokens';
import { publishButtonState } from '../../lib/publishButtonState';

/**
 * Dev-only gallery for the two things a reader needs before a post can go out:
 * seeing that the composer wants a title and a body, and finding out why Post
 * will not fire. The Plaza tab needs a signed-in session against a live API,
 * so neither could be walked in a browser until this page existed — and both
 * shipped broken on 2026-09-13 (D-127) without anyone seeing it.
 *
 * Dev route under app/dev/ — not a user surface, so copy stays in English and
 * out of the i18n pipeline (same convention as screen-preview.tsx).
 */

const OLD_TITLE_GREY = '#B9B9B9';
const OLD_BODY_GREY = '#C4C4C4';

function Fields({ grey, note }: { grey: string; note: string }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  return (
    <View style={{ backgroundColor: colors.bgCream, padding: 18, borderRadius: 18 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, marginBottom: 10 }}>
        {note}
      </Text>
      <TextInput
        placeholder="Beitragstitel"
        placeholderTextColor={grey}
        value={title}
        onChangeText={setTitle}
        style={{ fontSize: 30, lineHeight: 38, color: title ? '#111111' : grey, fontWeight: '500', marginBottom: 14 }}
      />
      <TextInput
        placeholder="Jemand braucht deine Geschichte"
        placeholderTextColor={grey}
        value={body}
        onChangeText={setBody}
        multiline
        textAlignVertical="top"
        style={{ minHeight: 110, fontSize: 20, lineHeight: 31, color: body ? '#2B2B2B' : grey, paddingTop: 4 }}
      />
    </View>
  );
}

function PostButton({ label, state }: { label: string; state: ReturnType<typeof publishButtonState> }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>
        {label} — opacity {state.opacity}, {state.disabled ? 'not pressable' : 'pressable'}
      </Text>
      <View
        style={{
          height: 54,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 27,
          borderWidth: 1,
          borderColor: 'rgba(255, 200, 175, 0.65)',
          backgroundColor: '#F67673',
          opacity: state.opacity,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 }}>Posten</Text>
      </View>
    </View>
  );
}

export default function PlazaComposerGallery() {
  const ready = { isSubmitting: false, isUploadingMedia: false, canSubmit: true };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView contentContainerStyle={{ padding: 18, gap: 20, paddingBottom: 60 }}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.textMain }}>Plaza composer</Text>

        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textMain }}>
          An empty composer, on the cream it actually sits on
        </Text>
        <Fields grey={OLD_TITLE_GREY} note={'BEFORE — title ' + OLD_TITLE_GREY + ' 1.86:1, body ' + OLD_BODY_GREY + ' 1.66:1'} />
        <Fields grey={colors.textMutedOnCream} note={'AFTER — both ' + colors.textMutedOnCream + ' 5.58:1'} />

        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textMain, marginTop: 8 }}>
          Post button
        </Text>
        <PostButton label="Title and body written" state={publishButtonState(ready)} />
        <PostButton label="Form incomplete — presses, then names the short field" state={publishButtonState({ ...ready, canSubmit: false })} />
        <PostButton label="Submitting" state={publishButtonState({ ...ready, isSubmitting: true })} />
        <PostButton label="Uploading media" state={publishButtonState({ ...ready, isUploadingMedia: true })} />
      </ScrollView>
    </SafeAreaView>
  );
}
