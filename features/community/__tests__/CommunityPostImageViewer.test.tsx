import { fireEvent, render } from '@testing-library/react-native';
import { CommunityPostImageViewer } from '../CommunityPostImageViewer';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return { Image: (props: object) => <View {...props} /> };
});
jest.mock('../../../components/IconCircleButton', () => {
  const { Pressable } = require('react-native');
  return {
    IconCircleButton: ({
      accessibilityLabel,
      children,
      onPress,
    }: {
      accessibilityLabel?: string;
      children: React.ReactNode;
      onPress?: () => void;
    }) => (
      <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress}>
        {children}
      </Pressable>
    ),
  };
});
jest.mock('../../../components/Screen', () => {
  const { View } = require('react-native');
  return { Screen: ({ children }: { children: React.ReactNode }) => <View>{children}</View> };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const labels = {
  closeLabel: 'Close image viewer',
  previousLabel: 'Previous image',
  nextLabel: 'Next image',
};

describe('CommunityPostImageViewer', () => {
  it('shows paging controls for a multi-image post and wraps at both ends', async () => {
    const onIndexChange = jest.fn();
    const screen = await render(
      <CommunityPostImageViewer
        {...labels}
        visible
        mediaUrls={['https://example.com/one.jpg', 'https://example.com/two.jpg', 'https://example.com/three.jpg']}
        activeIndex={0}
        onClose={jest.fn()}
        onIndexChange={onIndexChange}
      />,
    );

    expect(screen.getByText('1/3')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Next image'));
    expect(onIndexChange).toHaveBeenLastCalledWith(1);
    await fireEvent.press(screen.getByLabelText('Previous image'));
    expect(onIndexChange).toHaveBeenLastCalledWith(2);
  });

  it('hides paging controls and the counter for a single image', async () => {
    const screen = await render(
      <CommunityPostImageViewer
        {...labels}
        visible
        mediaUrls={['https://example.com/only.jpg']}
        activeIndex={0}
        onClose={jest.fn()}
        onIndexChange={jest.fn()}
      />,
    );

    expect(screen.queryByLabelText('Previous image')).toBeNull();
    expect(screen.queryByLabelText('Next image')).toBeNull();
    expect(screen.queryByText('1/1')).toBeNull();
  });
});
