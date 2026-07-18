import { readFileSync } from 'node:fs';

const workflow = readFileSync(
  new URL('../.github/workflows/ios-build.yml', import.meta.url),
  'utf8',
);
const fmtPodspec = readFileSync(
  new URL(
    '../node_modules/react-native/third-party-podspecs/fmt.podspec',
    import.meta.url,
  ),
  'utf8',
);

const failures = [];

if (workflow.includes('xcodebuild -downloadPlatform iOS')) {
  failures.push('ios-build.yml must not download an already-installed iOS platform');
}

if (!fmtPodspec.includes('spec.prepare_command')) {
  failures.push('fmt.podspec must patch fmt 11.0.2 during CocoaPods installation');
}

if (!fmtPodspec.includes('FMT_USE_CONSTEVAL 0')) {
  failures.push('fmt.podspec must disable the Xcode 26-incompatible consteval path');
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('iOS Xcode 26 build workarounds verified');
