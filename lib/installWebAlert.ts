import { Alert, Platform } from 'react-native';

type WebAlertButton = {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

type PatchedAlert = typeof Alert.alert & { __posterviaWebPatched?: boolean };

function alertText(title?: string, message?: string): string {
  return [title, message].filter(Boolean).join('\n\n');
}

function runButton(button: WebAlertButton | undefined): void {
  button?.onPress?.();
}

function installWebAlert(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return;
  }

  const currentAlert = Alert.alert as PatchedAlert;
  if (currentAlert.__posterviaWebPatched) {
    return;
  }

  const patchedAlert = ((title?: string, message?: string, buttons?: WebAlertButton[]) => {
    const text = alertText(title, message);
    const normalizedButtons = Array.isArray(buttons) ? buttons : [];
    const cancelButton = normalizedButtons.find((button) => button.style === 'cancel');
    const actionButtons = normalizedButtons.filter((button) => button.style !== 'cancel');

    if (actionButtons.length === 0) {
      window.alert(text);
      runButton(cancelButton);
      return;
    }

    if (actionButtons.length === 1) {
      const action = actionButtons[0];
      if (cancelButton || action.style === 'destructive') {
        if (window.confirm(text)) {
          runButton(action);
        } else {
          runButton(cancelButton);
        }
        return;
      }

      window.alert(text);
      runButton(action);
      return;
    }

    const choices = actionButtons
      .map((button, index) => `${index + 1}. ${button.text ?? String(index + 1)}`)
      .join('\n');
    const answer = window.prompt(`${text}\n\n${choices}`, '');
    const selectedIndex = Number(answer) - 1;
    if (Number.isInteger(selectedIndex) && actionButtons[selectedIndex]) {
      runButton(actionButtons[selectedIndex]);
      return;
    }
    runButton(cancelButton);
  }) as PatchedAlert;

  patchedAlert.__posterviaWebPatched = true;
  (Alert as unknown as { alert: PatchedAlert }).alert = patchedAlert;
}

installWebAlert();
