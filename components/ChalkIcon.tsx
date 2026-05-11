import { Image } from 'expo-image';
import type { ImageStyle, StyleProp } from 'react-native';

const ICONS = {
  odyssey: require('../assets/images/UI/1.png'),
  plaza: require('../assets/images/UI/2.png'),
  profile: require('../assets/images/UI/3.png'),
  menu: require('../assets/images/UI/4.png'),
  upload: require('../assets/images/UI/5.png'),
  share: require('../assets/images/UI/6.png'),
  social: require('../assets/images/UI/7.png'),
  scribe: require('../assets/images/UI/8.png'),
  search: require('../assets/images/UI/9.png'),
  message: require('../assets/images/UI/10.png'),
  plus: require('../assets/images/UI/11.png'),
  camera: require('../assets/images/UI/12.png'),
  history: require('../assets/images/UI/13.png'),
} as const;

export type ChalkIconName = keyof typeof ICONS;

type Props = {
  name: ChalkIconName;
  size?: number;
  color?: string;
  style?: StyleProp<ImageStyle>;
};

export function ChalkIcon({ name, size = 24, color, style }: Props) {
  return (
    <Image
      source={ICONS[name]}
      style={[
        { width: size, height: size },
        color ? { tintColor: color } : null,
        style,
      ]}
      contentFit="contain"
    />
  );
}
