import { ScrollView, Text, View } from 'react-native';

import { Screen } from '../../components/Screen';
import { SectionLabel } from '../../components/SectionLabel';
import { PostCover } from '../../components/community/PostCover';
import type { CommunityPost } from '../../features/community/useCommunity';
import { colors } from '../../theme/tokens';

/**
 * Every text cover, at the width it actually gets.
 *
 * The cover is generated from whatever sentence a post happens to contain, in
 * whatever language the reader happens to be reading, at whatever length the
 * author happened to write — so the only way to know it works is to put the
 * hard cases side by side. The rows below are the ones that broke something
 * during the build: an English guide whose first sentence was its own title, a
 * German sentence with an unbreakable compound, Chinese with no spaces to wrap
 * at, a body with nothing liftable in it at all.
 *
 * Widths: 148 (a 320dp phone) and 184.5 (a 393dp one). If a line is not
 * readable at 148 it is not readable.
 */

const WIDTHS = [148, 184.5];

function makePost(over: Partial<CommunityPost> & { id: string }): CommunityPost {
  return {
    post_type: 'guide',
    title: '',
    body: '',
    translated_title: null,
    translated_body: null,
    media_items: [],
    action_candidates: [],
    author: { id: 'a', display_name: 'Magdalena', account_kind: 'official' },
    ...over,
  } as unknown as CommunityPost;
}

const CASES: { label: string; post: CommunityPost }[] = [
  {
    label: 'Guide — the first sentence is the title again, so it takes the second',
    post: makePost({
      id: 'c1',
      post_type: 'guide',
      title: 'Getting from BER into the city',
      body:
        'To get from BER into the city smoothly, use the quickest routes available: FEX, S9, S45.\n\n' +
        'For the city trip, remember that an ABC ticket is needed.',
    }),
  },
  {
    label: 'Question — short sentence, largest rung',
    post: makePost({
      id: 'c2',
      post_type: 'question',
      title: 'Where do I register my address?',
      body: 'Has anyone booked one recently?\n\nMy Termin is three weeks out and the deadline is sooner.',
    }),
  },
  {
    label: 'Warning — a sentence carrying a figure, which the scorer prefers',
    post: makePost({
      id: 'c3',
      post_type: 'warning',
      title: 'Ticket inspectors on the M10',
      body: 'The fine is 60 EUR and they check at Warschauer most evenings.',
    }),
  },
  {
    label: 'Recommendation — long sentence, smallest rung',
    post: makePost({
      id: 'c4',
      post_type: 'recommendation',
      title: 'A quiet afternoon by the water',
      body:
        'Step outside your usual routine and choose one part of the city you would not ' +
        'normally visit on purpose, then let the neighbourhood shape the whole afternoon.',
    }),
  },
  {
    label: 'German — unbreakable compound sets the size on its own',
    post: makePost({
      id: 'c5',
      post_type: 'experience',
      title: 'Anerkennung im Handwerk',
      body:
        'Die Anerkennung ausländischer Berufsqualifikationen dauert oft mehrere Monate.\n\n' +
        'Source: make-it-in-germany.com',
    }),
  },
  {
    label: 'Chinese — no spaces to wrap at, and the server could not draw this at all',
    post: makePost({
      id: 'c6',
      post_type: 'guide',
      title: '从机场进城',
      body: '进城最快的是机场快线。记得买一张 ABC 区的票，否则会被罚款。',
    }),
  },
  {
    label: 'Nothing liftable — header and paper, no invented sentence',
    post: makePost({ id: 'c7', post_type: 'guide', title: 'Kurz', body: 'Ja.' }),
  },
];

export default function PlazaCoverGallery() {
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        {CASES.map((testCase) => (
          <View key={testCase.post.id}>
            <SectionLabel>{testCase.label}</SectionLabel>
            <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 10, alignItems: 'flex-start' }}>
              {WIDTHS.map((width) => (
                <View key={width}>
                  <View style={{ width, borderRadius: 12, overflow: 'hidden' }}>
                    <PostCover post={testCase.post} width={width} />
                  </View>
                  <Text style={{ fontSize: 10, color: colors.textMuted, paddingTop: 4 }}>{width}dp</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}
