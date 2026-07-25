let pendingAuthReturnPath: string | null = null;

function isSafeInternalPath(path: string): boolean {
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return false;
  return !['/login', '/register', '/oauth-complete'].includes(path);
}

export function rememberAuthReturnPath(path: string): void {
  pendingAuthReturnPath = isSafeInternalPath(path) ? path : null;
}

export function consumeAuthReturnPath(): string | null {
  const path = pendingAuthReturnPath;
  pendingAuthReturnPath = null;
  return path;
}

export function resetAuthReturnPathForTests(): void {
  pendingAuthReturnPath = null;
}
