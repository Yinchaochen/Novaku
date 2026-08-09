const { withGradleProperties } = require('@expo/config-plugins');

// Android build tuning, applied to the gradle.properties that prebuild writes.
//
// Both settings exist because run #37 was cancelled at the 60-minute job
// timeout while still compiling native code:
//
//  - reactNativeArchitectures: the default builds all four ABIs. x86 and
//    x86_64 only run on emulators, and Play splits an AAB per device, so a
//    production build that ships arm64-v8a + armeabi-v7a loses no real phone
//    while skipping half the CMake work. Emulator-facing profiles (preview,
//    development, e2e — Maestro runs on x86_64) keep all four.
//  - org.gradle.jvmargs: Gradle itself asked for this in the run #37 log —
//    "Daemon will be stopped at the end of the build after running out of JVM
//    Metaspace", with the default 2 GiB heap / 512 MiB metaspace. A daemon
//    that dies mid-build restarts and recompiles.
const DEVICE_ABIS = 'arm64-v8a,armeabi-v7a';
const JVM_ARGS = '-Xmx4096m -XX:MaxMetaspaceSize=1024m -Dfile.encoding=UTF-8';

function setProperty(items, key, value) {
  const existing = items.find((item) => item.type === 'property' && item.key === key);
  if (existing) {
    existing.value = value;
  } else {
    items.push({ type: 'property', key, value });
  }
  return items;
}

module.exports = function withAndroidBuildTuning(config) {
  return withGradleProperties(config, (cfg) => {
    setProperty(cfg.modResults, 'org.gradle.jvmargs', JVM_ARGS);

    const profile = process.env.EAS_BUILD_PROFILE;
    if (profile === 'production') {
      setProperty(cfg.modResults, 'reactNativeArchitectures', DEVICE_ABIS);
    }
    // Printed so the build log states which ABIs were chosen — otherwise a
    // silently missing EAS_BUILD_PROFILE looks like the tuning simply failed.
    console.log(
      `[withAndroidBuildTuning] profile=${profile ?? '(unset)'} abis=${
        profile === 'production' ? DEVICE_ABIS : 'all (emulator-capable)'
      }`,
    );
    return cfg;
  });
};
