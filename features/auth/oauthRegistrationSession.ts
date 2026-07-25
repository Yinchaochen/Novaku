export type OAuthProvider = 'google' | 'apple';

export interface OAuthRegistrationProfile {
  provider: OAuthProvider;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface OAuthRegistrationSession {
  registrationTicket: string;
  profile: OAuthRegistrationProfile;
}

let currentSession: OAuthRegistrationSession | null = null;

export function setOAuthRegistrationSession(session: OAuthRegistrationSession): void {
  currentSession = session;
}

export function getOAuthRegistrationSession(): OAuthRegistrationSession | null {
  return currentSession;
}

export function clearOAuthRegistrationSession(): void {
  currentSession = null;
}
