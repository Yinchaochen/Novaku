import { act, render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { usePrivacyMaskStore } from '../../store/privacyMaskStore';
import { MASK_COLOR, PrivacyMask, PrivateText } from '../PrivacyMask';

beforeEach(() => usePrivacyMaskStore.setState({ masking: false }));

it('draws nothing extra until a screenshot is being taken', async () => {
  const tree = await render(
    <PrivacyMask>
      <Text>Avatar</Text>
    </PrivacyMask>,
  );
  expect(tree.queryByTestId('privacy-mask')).toBeNull();

  await act(async () => usePrivacyMaskStore.setState({ masking: true }));
  expect(tree.getByTestId('privacy-mask')).toBeTruthy();
});

it('paints private text as a solid bar while masking', async () => {
  const tree = await render(<PrivateText style={{ color: 'black' }}>Lisumchen</PrivateText>);
  const flat = () => [tree.getByText('Lisumchen').props.style].flat(3);
  expect(flat()).not.toContainEqual(expect.objectContaining({ backgroundColor: MASK_COLOR }));

  await act(async () => usePrivacyMaskStore.setState({ masking: true }));
  expect(flat()).toContainEqual({ color: 'transparent', backgroundColor: MASK_COLOR });
});
