import {
  consumeAuthReturnPath,
  rememberAuthReturnPath,
  resetAuthReturnPathForTests,
} from '../authReturnPath';

describe('auth return path', () => {
  beforeEach(() => resetAuthReturnPathForTests());

  it('returns a shared post after authentication exactly once', () => {
    rememberAuthReturnPath('/p/post-123');

    expect(consumeAuthReturnPath()).toBe('/p/post-123');
    expect(consumeAuthReturnPath()).toBeNull();
  });

  it('rejects external and auth-loop destinations', () => {
    rememberAuthReturnPath('//evil.example');
    expect(consumeAuthReturnPath()).toBeNull();

    rememberAuthReturnPath('/login');
    expect(consumeAuthReturnPath()).toBeNull();
  });
});
