#!/usr/bin/env bash
# Run inside the emulator step of .github/workflows/cover-screenshots-android.yml:
# install the preview APK, open the cover gallery and photograph it screen by screen.
set -euo pipefail

mkdir -p shots
adb install -r ./postervia-preview.apk

shoot() { adb exec-out screencap -p > "shots/$1.png"; }

# Cold start first so the app's own start-up screens are out of the way, then
# the gallery by deep link (the same route the web build serves at /dev/plaza-cover).
adb shell monkey -p app.novaku.mobile -c android.intent.category.LAUNCHER 1 >/dev/null
sleep 30
shoot 00-launch
adb shell am start -W -a android.intent.action.VIEW -d "postervia://dev/plaza-cover" app.novaku.mobile
sleep 30
shoot 01-gallery-top

# The Chinese faces load on first use; give them time, then walk the page.
for i in $(seq 2 22); do
  adb shell input swipe 540 1900 540 700 700
  sleep 5
  shoot "$(printf '%02d' "$i")-gallery"
done
