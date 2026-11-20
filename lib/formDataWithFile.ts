import { Platform } from 'react-native';

export interface UploadFile {
  uri: string;
  name: string;
  type: string;
}

export async function formDataWithFile({ uri, name, type }: UploadFile): Promise<FormData> {
  const form = new FormData();
  if (Platform.OS === 'web') {
    // A browser's FormData turns { uri, name, type } into the string "[object Object]" and the API answers 422.
    const blob = await (await fetch(uri)).blob();
    form.append('file', new File([blob], name, { type }));
  } else {
    form.append('file', { uri, name, type } as unknown as Blob);
  }
  return form;
}
