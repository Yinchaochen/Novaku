import { fireEvent, render } from '@testing-library/react-native';

import { BuddyCreateMenu } from '../BuddyCreateMenu';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));


describe('BuddyCreateMenu', () => {
  it('opens into companion and wish actions and dispatches the selected action', async () => {
    const onCompanionPress = jest.fn();
    const onWishPress = jest.fn();
    const screen = await render(
      <BuddyCreateMenu
        companionLabel="Find a companion"
        wishLabel="Make a wish"
        openLabel="Open creation menu"
        closeLabel="Close creation menu"
        onCompanionPress={onCompanionPress}
        onWishPress={onWishPress}
      />,
    );

    expect(screen.queryByTestId('buddy.create.companion')).toBeNull();
    await fireEvent.press(screen.getByTestId('buddy.create.toggle'));
    expect(screen.getByText('Find a companion')).toBeTruthy();
    expect(screen.getByText('Make a wish')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('buddy.create.companion'));
    expect(onCompanionPress).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByTestId('buddy.create.toggle'));
    await fireEvent.press(screen.getByTestId('buddy.create.wish'));
    expect(onWishPress).toHaveBeenCalledTimes(1);
  });
});
