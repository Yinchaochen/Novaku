import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { useLanguage } from '../../context/LanguageContext';
import type { InfoUpdateKind } from '../../lib/postUpdates';

/** D-171: the source changed this post's time, place or deadline, or
 *  cancelled it; the date pill below already shows the new value. */
export function InfoUpdateTag({ kind }: { kind: InfoUpdateKind }) {
  const { t } = useLanguage();
  const alarming = kind === 'cancelled' || kind === 'gone';
  const label = {
    time: t.plaza.info_tag_time,
    place: t.plaza.info_tag_place,
    deadline: t.plaza.info_tag_deadline,
    cancelled: t.plaza.info_tag_cancelled,
    gone: t.plaza.info_tag_gone,
  }[kind];
  return (
    <View
      testID="post.info-update-tag"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        marginBottom: 6,
        backgroundColor: alarming ? '#FDECEC' : '#FFF4E0',
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
      }}
    >
      <Ionicons
        name={alarming ? 'alert-circle' : 'refresh-circle'}
        size={11}
        color={alarming ? '#C81E3A' : '#8A5A12'}
      />
      <Text
        style={{ marginLeft: 4, fontSize: 10.5, fontWeight: '700', color: alarming ? '#C81E3A' : '#8A5A12' }}
      >
        {label}
      </Text>
    </View>
  );
}
