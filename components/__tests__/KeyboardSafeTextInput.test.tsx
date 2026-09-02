import { fireEvent, render, screen } from '@testing-library/react-native';

jest.mock('../../context/LanguageContext', () => ({
  useLanguage: () => ({
    t: { common: { confirm: 'Confirm', cancel: 'Cancel' } },
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import { KeyboardSafeTextInput } from '../KeyboardSafeTextInput';

describe('KeyboardSafeTextInput', () => {
  it('opens the sheet on press and commits the draft only on confirm', async () => {
    const onChangeText = jest.fn();
    await render(
      <KeyboardSafeTextInput
        testID="field"
        value="old value"
        onChangeText={onChangeText}
        placeholder="Say something"
      />,
    );

    expect(screen.queryByTestId('field.sheet.input')).toBeNull();
    await fireEvent.press(screen.getByTestId('field.proxy'));

    const sheetInput = screen.getByTestId('field.sheet.input');
    expect(sheetInput.props.value).toBe('old value');

    await fireEvent.changeText(sheetInput, 'brand new text');
    expect(onChangeText).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('field.sheet.confirm'));
    expect(onChangeText).toHaveBeenCalledWith('brand new text');
    expect(screen.queryByTestId('field.sheet.input')).toBeNull();
  });

  it('discards the draft on cancel and on backdrop press', async () => {
    const onChangeText = jest.fn();
    await render(
      <KeyboardSafeTextInput testID="field" value="keep me" onChangeText={onChangeText} />,
    );

    await fireEvent.press(screen.getByTestId('field.proxy'));
    await fireEvent.changeText(screen.getByTestId('field.sheet.input'), 'discard me');
    await fireEvent.press(screen.getByTestId('field.sheet.cancel'));
    expect(onChangeText).not.toHaveBeenCalled();
    expect(screen.queryByTestId('field.sheet.input')).toBeNull();

    await fireEvent.press(screen.getByTestId('field.proxy'));
    await fireEvent.changeText(screen.getByTestId('field.sheet.input'), 'discard me too');
    await fireEvent.press(screen.getByTestId('field.sheet.backdrop'));
    expect(onChangeText).not.toHaveBeenCalled();
  });

  it('reopens with the committed value, not the discarded draft', async () => {
    const onChangeText = jest.fn();
    await render(
      <KeyboardSafeTextInput testID="field" value="committed" onChangeText={onChangeText} />,
    );

    await fireEvent.press(screen.getByTestId('field.proxy'));
    await fireEvent.changeText(screen.getByTestId('field.sheet.input'), 'never confirmed');
    await fireEvent.press(screen.getByTestId('field.sheet.cancel'));

    await fireEvent.press(screen.getByTestId('field.proxy'));
    expect(screen.getByTestId('field.sheet.input').props.value).toBe('committed');
  });

  it('does not open while disabled (editable=false semantics)', async () => {
    await render(
      <KeyboardSafeTextInput testID="field" value="" onChangeText={jest.fn()} disabled />,
    );
    await fireEvent.press(screen.getByTestId('field.proxy'));
    expect(screen.queryByTestId('field.sheet.input')).toBeNull();
  });

  it('autoOpen mounts with the sheet already open (autoFocus replacement)', async () => {
    await render(
      <KeyboardSafeTextInput testID="field" value="bio text" onChangeText={jest.fn()} autoOpen />,
    );
    expect(screen.getByTestId('field.sheet.input').props.value).toBe('bio text');
  });

  it('the proxy field itself is never editable', async () => {
    await render(<KeyboardSafeTextInput testID="field" value="v" onChangeText={jest.fn()} />);
    expect(screen.getByTestId('field').props.editable).toBe(false);
  });
});
