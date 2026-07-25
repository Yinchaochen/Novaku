export const CONSENT_DOCUMENT_VERSION = '2026-05-05.v1';

export function requiredOAuthRegistrationConsents() {
  return [
    {
      consent_type: 'tos',
      granted: true,
      document_version: CONSENT_DOCUMENT_VERSION,
    },
    {
      consent_type: 'privacy_policy',
      granted: true,
      document_version: CONSENT_DOCUMENT_VERSION,
    },
  ];
}
