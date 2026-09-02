import { forwardRef, useState } from 'react';
import { Pressable, StyleProp, TextInput, TextInputProps, ViewStyle } from 'react-native';

import { FloatingInputSheet } from './FloatingInputSheet';

export interface KeyboardSafeTextInputProps
  extends Pick<
    TextInputProps,
    | 'placeholder'
    | 'placeholderTextColor'
    | 'multiline'
    | 'numberOfLines'
    | 'textAlignVertical'
    | 'maxLength'
    | 'keyboardType'
    | 'autoCapitalize'
    | 'accessibilityLabel'
    | 'style'
    | 'testID'
  > {
  value: string;
  onChangeText: (text: string) => void;
  /** NativeWind classes forwarded to the proxy input. */
  className?: string;
  /** Blocks opening the sheet (mirrors editable={false} semantics). */
  disabled?: boolean;
  /** Open the sheet as soon as the field mounts (autoFocus replacement). */
  autoOpen?: boolean;
  /** Layout styles for the touch wrapper — only needed when the original
      input was a flex child (e.g. flex: 1 inside a row). */
  containerStyle?: StyleProp<ViewStyle>;
  sheetTestID?: string;
}

// D-052: drop-in replacement for TextInputs the keyboard can cover. The field
// renders exactly as before but as a non-editable proxy; real typing happens
// in FloatingInputSheet above the keyboard, and Confirm commits the draft
// back through onChangeText — so react-hook-form Controllers and plain
// useState fields work unchanged. Presses are handled by a wrapper Pressable
// (an editable={false} TextInput does not reliably receive presses on
// Android, and RNTL refuses to dispatch them at all); the input itself is
// pointerEvents="none". The forwarded ref still points at the proxy
// TextInput so guide spotlight targets measure the visual field, not the
// wrapper with its margins.
export const KeyboardSafeTextInput = forwardRef<TextInput, KeyboardSafeTextInputProps>(
  function KeyboardSafeTextInput(
    { value, onChangeText, className, disabled, autoOpen, containerStyle, sheetTestID, ...inputProps },
    ref,
  ) {
    const [sheetVisible, setSheetVisible] = useState(autoOpen === true);

    return (
      <>
        <Pressable
          onPress={() => setSheetVisible(true)}
          disabled={disabled}
          style={containerStyle}
          testID={inputProps.testID ? `${inputProps.testID}.proxy` : undefined}
          accessibilityLabel={inputProps.accessibilityLabel ?? inputProps.placeholder}
        >
          <TextInput
            ref={ref}
            {...inputProps}
            className={className}
            value={value}
            editable={false}
            caretHidden
            pointerEvents="none"
            // The proxy displays a value, it never edits one — so it must not
            // behave like a scrollable editor. A single-line TextInput parks
            // its scroll at the caret, which sits at the end of a
            // programmatically set value: a title wider than the field
            // rendered with its first characters cut off and no ellipsis to
            // admit it ("Explore Berlin's…" showed as "…lore Berlin's…").
            // Wrapping instead of scrolling keeps every character reachable.
            multiline
            scrollEnabled={false}
            // multiline defaults to top-alignment; single-line callers still
            // expect their text centred in the field's minHeight.
            textAlignVertical={
              inputProps.multiline ? (inputProps.textAlignVertical ?? 'top') : 'center'
            }
          />
        </Pressable>
        <FloatingInputSheet
          visible={sheetVisible}
          initialValue={value}
          placeholder={inputProps.placeholder}
          multiline={inputProps.multiline}
          maxLength={inputProps.maxLength}
          keyboardType={inputProps.keyboardType}
          autoCapitalize={inputProps.autoCapitalize}
          onConfirm={onChangeText}
          onClose={() => setSheetVisible(false)}
          testID={sheetTestID ?? (inputProps.testID ? `${inputProps.testID}.sheet` : undefined)}
        />
      </>
    );
  },
);
