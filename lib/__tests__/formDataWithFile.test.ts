import { Platform } from 'react-native';

import { formDataWithFile } from '../formDataWithFile';

const PHOTO = { uri: 'blob:http://localhost:8081/7c0e', name: 'photo.jpg', type: 'image/jpeg' };

describe('formDataWithFile', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reads the blob: or data: uri into a real File on the web', async () => {
    (Platform as { OS: string }).OS = 'web';
    const bytes = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])]);
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      blob: async () => bytes,
    } as Response);
    const append = jest.spyOn(FormData.prototype, 'append');

    const form = await formDataWithFile(PHOTO);

    expect(fetchSpy).toHaveBeenCalledWith(PHOTO.uri);
    expect(append).toHaveBeenCalledTimes(1);
    const [field, part] = append.mock.calls[0];
    expect(field).toBe('file');
    expect(part).toBeInstanceOf(File);
    expect((part as File).name).toBe('photo.jpg');
    expect((part as File).type).toBe('image/jpeg');
    expect((part as File).size).toBe(4);
    expect(form).toBeInstanceOf(FormData);
  });

  it('keeps the { uri, name, type } object React Native streams from disk', async () => {
    (Platform as { OS: string }).OS = 'android';
    const fetchSpy = jest.spyOn(global, 'fetch');
    const append = jest.spyOn(FormData.prototype, 'append');

    await formDataWithFile({ ...PHOTO, uri: 'file:///data/user/0/cache/photo.jpg' });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(append).toHaveBeenCalledWith('file', {
      uri: 'file:///data/user/0/cache/photo.jpg',
      name: 'photo.jpg',
      type: 'image/jpeg',
    });
  });
});
