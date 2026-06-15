# Maestro smoke suite

The five flows cover registration and onboarding, login, Plaza publishing,
Buddy contact-to-chat, and language switching.

Run only against an isolated E2E or staging backend. The suite creates users
and Plaza posts. The Android workflow rejects the production API URL.

Prerequisites:

- A standalone APK with package `app.novaku.mobile`
- A completed E2E account with a contactable Buddy post in its Berlin feed
- `TEST_EMAIL`, `TEST_PASSWORD`, and `RUN_SUFFIX`

Local command:

```sh
maestro test \
  -e TEST_EMAIL="e2e@example.com" \
  -e TEST_PASSWORD="replace-me" \
  -e RUN_SUFFIX="local-$(date +%s)" \
  .maestro
```

GitHub Actions requires `E2E_API_URL`, `E2E_TEST_EMAIL`,
`E2E_TEST_PASSWORD`, and `EXPO_TOKEN` secrets. The API URL must not be
`https://api.postervia.app/v1`.
