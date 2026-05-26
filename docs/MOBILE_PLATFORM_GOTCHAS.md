# Postervia 移动端踩坑参考(iOS 26 + Android + RN 0.81 + Expo SDK 54)

> **谁该读这个**:任何要写新 RN UI / Modal / Native 模块 / EAS 配置 / Sentry 代码的人(包括 Claude agent)。
>
> **怎么用**:动手前扫一遍"编码 checklist";出 bug 时跳到"诊断 checklist";好奇为什么这么规定的看"踩过的坑"详解。

---

## 0. 这份文档跟 `RETROSPECTIVES.md` 的分工

| 文件 | 范围 | 风格 |
|---|---|---|
| [`F:/Yolu/collaboration/RETROSPECTIVES.md`](../../collaboration/RETROSPECTIVES.md) | **流程层面**的复盘(诊断方法论、为什么 5 天没修好) | postmortem,按事件 |
| 本文件 | **平台技术层面**的坑(iOS vs Android、Modal、Safe Area、Patch、EAS env) | 知识库,按主题 |

两份配合读 —— RETROSPECTIVES 教你**怎么诊断**,本文教你**踩过哪些坑**。

---

## 1. 8 天踩坑时间线(2026-05-18 → 2026-05-26)

完整事件叙事见 RETROSPECTIVES.md 2026-05-24 entry,这里只做技术 phase 标记:

| Phase | Builds | 假设 | 实际根因 | 状态 |
|---|---|---|---|---|
| A | 22-25 | RCTEventEmitter / TurboModule bug | 错的方向,但 patch (D-027) 自身是对的 backstop | 误诊 5 天 |
| B | 26-30 | 关 `newArchEnabled` 绕过新架构 | 4 个 deps 硬要 new arch(`react-native-maps@1.27`, `reanimated@4`, `nativewind/css-interop`, `expo-image`),走不通 | 死路 |
| C | 31 | safe-area-context #681:`RNCSafeAreaView` Fabric 组件在 iOS 26 + new arch 下挂不进 `RCTRootView` → SBCrossfadeView 找不到 host → splash 永不退场 | ✅ 真根因 | 修复:[`patches/react-native-safe-area-context+5.6.2.patch`](../patches) |
| D | 32 | iOS Modal 独立 UIWindow → safe-area 上下文不可靠 → 9 个 Modal 的 back button 卡在 status bar 底下 | ✅ iOS 特定 quirk | 修复:`4c51106` + `35d9986` |
| E | 33 | iOS 26 UIScene strict mode → `pageSheet` 嵌在 `fullScreen` 父 Modal 里时 scene 卡死,捕获所有 touch | ✅ iOS 26 新增限制 | 修复:`b09f97d` |
| F | 33 | EAS 产线 build 拿不到 `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`(`.env` 是 gitignored,GHA workflow 没传) | ✅ 配置缺口 | 修复:`8d0ef47` |

---

## 2. 真正咬过我们的坑(技术详解)

### 坑 #1 — `RNCSafeAreaView` Fabric 组件在 iOS 26 + new arch 下挂载失败

**症状**:
- iOS 26 设备 cold start → 进 splash → 永不退场(SBCrossfadeView fade 不出来)
- 同样代码 Android 完全正常
- Sentry `boot:body_ready` 永远不触发(JS 都没起来)

**根因**:
`react-native-safe-area-context@5.6.2` 的 `RNCSafeAreaView` 是 codegen 出的 Fabric native component。iOS 26 + 新架构的某条 mount path 上,它**不能正确注册进 `RCTRootView`**。SpringBoardUI 的 SBCrossfadeView 找不到 RN 的 host view,frame 不更新,splash 一直盖在上面。

**为什么 Android 没事**:Android 没有 SBCrossfadeView 这个 OS 层 splash 机制,RN root view 通过 Activity 的 setContentView 直接接管,跳过了"找 host"这一步。

**为什么不能关新架构绕过**(Build 26-30 走过的死路):
SDK 54 的 4 个核心 dep 硬锁定 new arch:
- `react-native-maps@1.27.x` — codegen-only fabric component
- `react-native-reanimated@4.x` — workletcore 要新架构
- `nativewind` 经 `react-native-css-interop` — babel preset 假定新架构
- `expo-image` 部分版本

所以**没法关新架构** —— 只能解决新架构里这个 bug。

**最终修复**(D-031, 2026-05-25):

`patches/react-native-safe-area-context+5.6.2.patch`(~139 行)把 `<NativeSafeAreaView>` codegenNativeComponent 调用替换成纯 JS:

```typescript
// Before (native Fabric component)
return <NativeSafeAreaView edges={...} {...props} />;

// After (JS-only, our patch)
const insets = useSafeAreaInsets();
const insetStyle = {
  paddingTop: edges.has('top') ? insets.top : 0,
  paddingRight: edges.has('right') ? insets.right : 0,
  paddingBottom: edges.has('bottom') ? insets.bottom : 0,
  paddingLeft: edges.has('left') ? insets.left : 0,
};
return <View {...props} style={[insetStyle, style]} />;
```

**关键**:public API 完全不变(`edges` / `style` / `ref` / `pointerEvents` 都行),0 行 user code 改动。

**upstream**:https://github.com/AppAndFlow/react-native-safe-area-context/issues/681 截至 2026-05-26 仍 open。

**警告**:升级到 `react-native-safe-area-context@5.7+` 之前先 verify upstream 是不是已经修了。如果没修,patch 也要相应更新。

---

### 坑 #2 — iOS Modal 是独立 UIWindow,safe-area 上下文不可靠传递

**症状**:
- 在 Modal 里用 `<SafeAreaView edges={['top']}>` 包内容
- back button / header 在 iOS 上**渲染在 status bar / notch 下面**(y=8pt),被 23:19 时间显示挡住
- Android 完全正常,padding 自动避开

**根因**:
iOS 的 `<Modal>` 不是 root window 的子 view,它是**自己创建一个 UIWindow**。`react-native-safe-area-context` 的 `<SafeAreaProvider>` 在 root window 注册,跟踪的是 root UIWindow 的 safeAreaInsets。Modal 的 UIWindow 跟 root 是**两个独立的 windows**,各自有 safeAreaInsets,但 React Context 只看 root 的。

(注:这跟坑 #1 的 patch 是**独立的两个问题**。即使没打那个 patch,这个 quirk 也存在。)

**Android 为什么没事**:Android Modal 用 Dialog,Dialog 是 Activity 内部的子 View Hierarchy,跟 Activity 共享同一个 Window。SafeAreaProvider 看的就是这个 Window,值是对的。

**修复模式**(Build 32, commit `4c51106` + `35d9986`):

在 Modal 内**别用** `<SafeAreaView>`,改用**从外层 component scope 抓出来的 insets**:

```tsx
function PlazaScreen() {
  const insets = useSafeAreaInsets();  // ← root SafeAreaProvider context, 值可靠

  return (
    <>
      <Modal
        visible={composerVisible}
        animationType="slide"
        presentationStyle="fullScreen"  // ← 见坑 #3
        onRequestClose={closeComposer}
      >
        {/* ❌ 不要这样:<SafeAreaView edges={['top']}> */}
        {/* ✅ 改这样: */}
        <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: '...' }}>
          {/* Modal 内容 */}
        </View>
      </Modal>
    </>
  );
}
```

**关键点**:
- `useSafeAreaInsets()` 在 **`PlazaScreen` scope 调用,不是在 Modal 内部调用**。
- 调用点必须在 root `<SafeAreaProvider>` 的 React context 树里。
- Modal 内只是"使用"这个值,不重新读 context。

**对于 lazy-loaded 的 child component(比如 `LocationPicker`)**:
把 `outerInsets` 作为 prop 传进去:

```tsx
<LocationPickerLazy
  outerInsets={insets}  // 从 PlazaScreen scope 来
  onConfirm={...}
  onCancel={...}
/>
```

(这一步当前 LocationPicker 还没改,见"未完成 followup"一节)

**已修复的 9 个 Modal**:
- `app/(tabs)/plaza.tsx` compose Modal
- `app/(tabs)/social.tsx` × 5(Connections / CreateGroup / Conversation / Forward / CreateMeetup)
- `features/community/CommunityPostDetailModal.tsx`
- `features/tasks/OdysseyDetailModal.tsx`
- `components/ReportSheet.tsx`

---

### 坑 #3 — iOS 26 UIScene strict mode:`pageSheet` **不能**嵌在 `fullScreen` 父 Modal 里

**症状**:
- 用户点 Plaza "+" → compose Modal 打开 ✅
- 用户点 "Add Location" → LocationPicker Modal 试图打开 → **整个 app 卡死**
  - Plaza 滚动 = 死
  - LangPill 点不动
  - 其他按钮全部 unresponsive
  - 只有杀进程重开 app 才恢复

**根因**:
iOS 26 严格强制 UIScene lifecycle("UIScene lifecycle will soon be required" 警告)。
- `Modal` 默认 `presentationStyle` 在 iOS 13+ 是 `pageSheet`(drag-to-dismiss 的卡片)
- `pageSheet` 的语义是"露出父 Modal 一部分"
- 在 `fullScreen` 父 Modal 上面,**没有可露出的边缘**

iOS 26 之前:OS 容忍这个矛盾,pageSheet 强行渲染成几乎 fullScreen。
iOS 26 之后:OS 拒绝呈现 → **child scene 被创建但永不 present** → 但它的 UIWindow 已经在前台 → **抢走所有 touch** → 表面看上去整个 app 都卡了。

**Android 为什么没事**:Android Modal 没有 UIScene 这套东西,Dialog 单纯 z-order 叠,叠多少层都行。

**修复**(Build 33, commit `b09f97d`):

任何嵌套在 fullScreen 父 Modal 里的子 Modal,**必须显式声明 `presentationStyle`**:
- 用 `presentationStyle="fullScreen"`(子 Modal 内容覆盖全屏)
- **或** `transparent={true}`(自动用 `overFullScreen`,跟 fullScreen 互不冲突)

**安全矩阵**:

| 父 Modal | 子 Modal | iOS 26 | 备注 |
|---|---|---|---|
| `fullScreen` | `fullScreen` | ✅ | Scene 推栈,正常 |
| `fullScreen` | `transparent` (→ overFullScreen) | ✅ | overFullScreen 不需要露出父,合法 |
| `fullScreen` | **default (pageSheet)** | ❌ **卡死** | 这次的 bug |
| `fullScreen` | `pageSheet` 显式 | ❌ 卡死 | 同上 |
| `fullScreen` | `formSheet` | ⚠️ 没实测,推测同 pageSheet | 避免 |

**Postervia 当前所有 Modal 审计结果**(2026-05-26):

| 文件 | Modal | presentationStyle | 嵌套位置 | OK? |
|---|---|---|---|---|
| plaza.tsx | compose | `fullScreen` | 顶层 | ✅ |
| plaza.tsx | LocationPicker | `fullScreen`(刚改) | 嵌在 compose 里 | ✅ |
| social.tsx | Menu | `transparent` | 顶层 | ✅ |
| social.tsx | Connections | `fullScreen` | 顶层 | ✅ |
| social.tsx | CreateGroup | `fullScreen` | 顶层 | ✅ |
| social.tsx | Conversation(chat) | `fullScreen` | 顶层 | ✅ |
| social.tsx | Forward | `fullScreen` | 顶层 | ✅ |
| social.tsx | Image lightbox | `transparent` | 嵌在 Conversation 里 | ✅ |
| social.tsx | CreateMeetup | `fullScreen` | 嵌在 Conversation 里 | ✅ |
| components/places/PlacePicker.tsx | (内部) | `fullScreen`(刚改) | 嵌在 CreateMeetup 里 | ✅ |
| CommunityPostDetailModal.tsx | (主) | `fullScreen` | 顶层 | ✅ |
| OdysseyDetailModal.tsx | (主) | `fullScreen` | 顶层 | ✅ |
| ReportSheet.tsx | (主) | `fullScreen` | 嵌在 PostDetail / OdysseyDetail 里 | ✅ |
| CommentComposerSheet.tsx | (主) | `transparent` | 嵌在 PostDetail / OdysseyDetail 里 | ✅ |
| LanguagePicker.tsx | (主) | `transparent` | 在 PageHeader(顶层) | ✅ |
| PaywallSheet.tsx | (主) | `transparent` | 顶层 | ✅ |
| ReactionPicker.tsx | (主) | `transparent` | 嵌在 PostDetail 里 | ✅ |
| datetime/*Picker | (各) | 多数 `transparent` | 嵌在 compose Modal 里 | ✅ |

---

### 坑 #4 — `EXPO_PUBLIC_*` env vars 不会从 `.env` 自动到达 EAS Build

**症状**:
- `npm start` 本地跑:`GooglePlacesAutocomplete` 搜索框正常渲染
- `eas build --local` 本地从开发机跑:正常
- **GitHub Actions 跑出来的产线 IPA / AAB:搜索框完全不出现**

**根因**:
- `.env` 是 **gitignored**(正确,不该 commit secret)
- 本地 `npm start` / `eas build --local` 通过 `dotenv` 自动读 `.env`
- **GitHub Actions runner 上根本没有 `.env` 文件**(repo 不带)
- `eas.json` 的 `env` block 也没声明这个 key
- 所以 EAS Build metro bundler 拿到的 `process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = undefined`
- `<GooglePlacesAutocomplete query={{key: '', ...}}>` 新版会**直接 bail 不渲染 input**

**为什么 Android 看起来正常**:用户拿到的 Android 截图是从**本地 dev / preview build** 来的(`.env` 有值);GHA 跑的 production AAB 同样有这个 bug,只是用户没测到。

**修复**(commit `8d0ef47`):
GitHub workflow 的 `env` block 注入 GitHub Secret:

```yaml
# .github/workflows/ios-build.yml + android-build.yml
env:
  EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
  SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
  EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: ${{ secrets.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY }}  # ← 必须显式注入
```

**`EXPO_PUBLIC_*` env var 传递路径全梳理**:

| 场景 | 来源 | EXPO_PUBLIC_* 可见性 |
|---|---|---|
| `npm start`(开发) | `.env` via dotenv | ✅ |
| `eas build --local`(开发机) | shell env + `.env` via dotenv | ✅ |
| `eas build`(EAS Cloud) | `eas.json` env block + EAS Cloud secrets | 要在 `eas.json` 写或 EAS Cloud 设 |
| **GHA workflow 跑 `eas build --local`** | **workflow YAML 的 env block** | **必须显式注入,否则 undefined** |

**新加 EXPO_PUBLIC_* env var 的硬规则**(写代码前必看):

1. 在 `.env` 加(本地 dev 用)
2. 在 GitHub Secrets 加同名 secret(`EXPO_PUBLIC_*` 名字一字不差)
3. 在 `.github/workflows/ios-build.yml` 的 `env:` block 加一行 `EXPO_PUBLIC_FOO: ${{ secrets.EXPO_PUBLIC_FOO }}`
4. 在 `.github/workflows/android-build.yml` 同步加
5. (可选) 在 `eas.json` 的 `production.env` block 加(给从开发机跑 EAS Cloud build 用)

**漏掉任何一步 = 产线 build 拿不到值,但本地 dev 看不出来**(silent fail)。

---

### 坑 #5 — Sentry config drift,5 天对着空 dashboard 调试

见 [`F:/Yolu/collaboration/RETROSPECTIVES.md`](../../collaboration/RETROSPECTIVES.md) 2026-05-24 entry。

**TL;DR**:rebrand novaku → postervia 时建了新 Sentry project,但 `eas.json` 里的 DSN 还指着旧 project。`lib/sentry.ts` 用 `if (!DSN) return;` silent fail,没人注意到事件根本没到 dashboard。5 天 + 7 个 build 凭空猜测。

**那一节里写了 5 条铁律**,本文件不重复,直接[去看 RETROSPECTIVES.md](../../collaboration/RETROSPECTIVES.md)。

---

## 3. iOS vs Android 关键差异速查表

### Modal

| | iOS | Android |
|---|---|---|
| 底层实现 | UIWindow(独立) | Dialog(Activity 内) |
| 默认 `presentationStyle` | `pageSheet`(iOS 13+) | `fullScreen` always |
| 嵌套 `pageSheet` in `fullScreen` | iOS 26: ❌ **卡死** | ✅ 没事 |
| SafeArea Context 在 Modal 内部 | ⚠️ **不可靠** | ✅ 可靠 |
| Drag-to-dismiss | `pageSheet` 自带 | 默认无 |

### Cold start / Splash

| | iOS | Android |
|---|---|---|
| 机制 | `LaunchScreen.storyboard` → SBCrossfadeView crossfade 到 `RCTRootView` | SplashScreen API → 首次 render |
| Fabric mount 失败时 | **App appear frozen at splash** | 短暂黑屏然后 render |

### Safe area

| | iOS | Android |
|---|---|---|
| 数据源 | `UIWindow.safeAreaInsets`(每个 Window 独立) | `WindowInsets` API(每个 Window 一份) |
| Modal 内是否可靠 | ❌ Modal 是新 UIWindow | ✅ Dialog 跟 Activity 共享 |
| `react-native-safe-area-context@5.6.2` | iOS 26 + newArch 下 native 组件挂载失败(已 patch) | ✅ 正常 |

### Build / CI 成本

| | iOS | Android |
|---|---|---|
| GHA runner | `macos-latest` | `ubuntu-latest` |
| GHA 分钟数乘数 | **10×** | 1× |
| 工具链 | Xcode 26 / iOS 26 SDK | Android SDK 35 |
| 本地构建时长 | ~16-20 min(macOS) | ~12-15 min(Ubuntu) |

### 分发

| | iOS | Android |
|---|---|---|
| 开发者账号 | $99/年 | $25 一次性 |
| 提交渠道 | App Store Connect + TestFlight | Play Console(4 tracks) |
| Auto-submit via EAS | 需要 `ascAppId` in eas.json | 需要 service account JSON + Play API access |
| Review 时间 | 1-3 天 | 数小时至 1 天 |
| Beta 测试 | TestFlight(≤10k) | Internal(≤100) / Closed(≤200) / Open |
| 包格式 | IPA | AAB(Play Store)/ APK(直装) |

### 写代码时碰到的细节差异

| 主题 | iOS | Android |
|---|---|---|
| `KeyboardAvoidingView` 的 `behavior` | `"padding"` | `undefined`(系统自带 windowSoftInputMode) |
| `Modal` 状态栏处理 | 看 `presentationStyle` | 默认透明 |
| Hardware back button | 不存在 | 触发 `onRequestClose` |
| Native 模块兼容 Fabric | 严格,坑多 | 宽松 |
| Patch 命中率 | 多数 patch 是 iOS-only(D-027 等) | 多数 patch 是 cross-platform |

---

## 4. 编码 checklist(写新代码前看这个)

### 写新 `<Modal>` 时
- [ ] **显式写 `presentationStyle="fullScreen"`**(除非你**真的**要 transparent overlay,那就用 `transparent={true}`)
- [ ] 如果这个 Modal **会被嵌套在另一个 Modal 里**:父子都必须 fullScreen,或子用 transparent
- [ ] Modal 内**不要用** `<SafeAreaView edges={['top']}>`,改用 `<View style={{paddingTop: outerInsets.top, ...}}>`
- [ ] `outerInsets` 必须从**包住 Modal 的外层 component scope** 调 `useSafeAreaInsets()` 拿到(不要在 Modal 内部重读)
- [ ] 对 lazy-loaded child(`<Suspense>` 包的)→ 把 `outerInsets` 作为 prop 传进去

### 加 native 模块 / 改 native 行为
- [ ] 先确认是否兼容 iOS 26 + new architecture (Fabric)
- [ ] 真机 install + cold start 测过(模拟器不算)
- [ ] 任何 `node_modules` 改动用 `npx patch-package <name>` 生成 patch,commit `patches/` 目录
- [ ] patches 要 commit message 写清:patch 解决了什么 upstream issue 编号

### 加 `EXPO_PUBLIC_*` env var
**五个地方同步改,漏一个就出 silent bug**:

1. `.env`(本地 dev)
2. GitHub Secrets(名字一字不差)
3. `.github/workflows/ios-build.yml` env block
4. `.github/workflows/android-build.yml` env block
5. (可选) `eas.json` 的 production env block

**模板**:
```yaml
# in workflow YAML, env: block
EXPO_PUBLIC_FOO: ${{ secrets.EXPO_PUBLIC_FOO }}
```

```bash
# in .env (gitignored)
EXPO_PUBLIC_FOO=actual_value_here
```

### 加 Sentry instrumentation
- [ ] 写**诊断性 `captureMessage('boot:*' / 'startup:*')` 探针**前,先想清楚:它的清理 owner 是谁?什么时候清?
  - 推荐:在引入探针的 commit 里同时开 GitHub issue 提醒后续清理
  - 或者用 `if (__DEV__)` 包,确保不进产线
- [ ] **fire-and-forget endpoints(埋点 / impression / view 类)**:加进 `lib/api.ts` 的 `isBestEffortTelemetry()` 白名单,5xx 不进 Sentry
- [ ] **用户主动操作的 endpoints(login / create_post / chat)**:5xx **要**进 Sentry,信号宝贵
- [ ] **`ECONNABORTED`**(axios 超时)→ 不进 Sentry(已在 beforeSend 过滤),原因:多半是 iOS 后台暂停 setTimeout 造成的伪超时

### 改 build 配置 / EAS
- [ ] 单一原则:**一次 build 改一件事**,直到 feedback loop 验证可信(RETROSPECTIVES Rule 3)
- [ ] EAS auto-submit 改动:验证 `eas.json` 的 `submit.production.{ios,android}` block 完整
- [ ] iOS auto-submit:`ascAppId` 必填(看 [memory](file:///C:/Users/lenovo/.claude/projects/F--Yolu/memory/reference_eas_ios_submit_ascappid.md))
- [ ] Android auto-submit:需要 `GOOGLE_SERVICE_ACCOUNT_KEY_BASE64` GitHub secret + Play Console API access 配置

---

## 5. 诊断 checklist(出 bug 时看这个)

### 症状:Splash 卡死 / 进不到登录页(iOS-only)
1. **第一步**:看 Sentry 有没有 `boot:body_ready` 事件 → 没有 = JS 没起来 = native 初始化失败
2. **如果 Sentry 完全空**:check DSN config drift(看 RETROSPECTIVES Rule 1)
3. **iPhone.log 里**有 SBCrossfadeView 错误 → safe-area-context #681(已 patch,verify patch 还在 `patches/`)
4. **Android 也复现** → 不是平台特定,是 RN bridge / native init 问题

### 症状:某个 Modal 打开后整个 app 卡死(iOS-only)
1. 这个 Modal **嵌套在另一个 Modal 里**了吗?
2. 父 Modal 是 `presentationStyle="fullScreen"` 吗?
3. 这个子 Modal 自己**没**写 `presentationStyle` 也**没** `transparent={true}`?
4. → 就是坑 #3,加 `presentationStyle="fullScreen"` 到子 Modal

### 症状:某 component 在 dev 正常但产线 build 不渲染
1. 这个 component 用到 `process.env.EXPO_PUBLIC_*` 吗?(`grep` 全文件)
2. 这个 var 在 `.github/workflows/*-build.yml` 的 env block 里吗?
3. GitHub Secret 里有这个名字的 secret 吗?
4. → 就是坑 #4,补全 5 个地方

### 症状:Sentry 全是 `ECONNABORTED`
1. 不是 bug,是 iOS 后台暂停 setTimeout 造成的伪超时
2. `lib/sentry.ts` 的 `_beforeSend` 应该已经过滤 — verify
3. **真的网络坏了**的信号是 `code: 'ERR_NETWORK'`(没收到 response),不是 `ECONNABORTED`

### 症状:Sentry 全是 5xx
1. 这是哪个 endpoint?
2. **fire-and-forget telemetry**(`/community/recommendation/events` / impression / view 类)→ 加进 `lib/api.ts` 的 `isBestEffortTelemetry()`,不报
3. **用户主动操作**(login / create_post / message)→ **真问题**,查后端 Sentry / Railway / structlog

### 症状:某 endpoint 504 但后端 Sentry / Railway log 完全没记录
1. → 请求**根本没到 backend**,是 Railway 边缘 proxy 自己回的
2. 不可代码修;long-term 升级 Railway Pro 或迁 platform
3. 客户端这边过滤掉避免吃 Sentry quota(同上一条)

---

## 6. 相关 artifact 索引

### 关键 commits(8 天 + 修复)

| Commit | 内容 |
|---|---|
| `c44c72e` | Build 31 — patch safe-area-context for iOS 26(真根因) |
| `4c51106` | Plaza compose Modal SafeAreaView fix |
| `35d9986` | 另 4 个 Modal 同模式 fix |
| `ef52be8` | 清理 Build 22-31 诊断探针 |
| `dae3c4d` | Android build workflow 新建 |
| `2111763` | Sentry dSYM 上传容错(`SENTRY_ALLOW_FAILURE=true`) |
| `fbf9744` | Sentry filter `ECONNABORTED` 噪音 |
| `492d6a4` | Sentry filter 埋点 endpoint 的 5xx 噪音 |
| `847a33a` | 清掉漏网的 `startup:tabs_layout_mounted` 探针 |
| `b09f97d` | 嵌套 Modal `fullScreen`(LocationPicker + PlacePicker) |
| `8d0ef47` | GHA workflow 注入 `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` |

### 重要 patches(`patches/`)
- `react-native+0.81.5.patch` — D-027 RCTTurboModule `@try/@catch` 包裹(iOS-only,backstop)
- `react-native-safe-area-context+5.6.2.patch` — IOS-LOGIN-108 / 坑 #1(iOS 26 关键)

### 其他相关文档
- [`F:/Yolu/collaboration/RETROSPECTIVES.md`](../../collaboration/RETROSPECTIVES.md) — 流程层面 5 天复盘 + 5 条铁律
- [`F:/Yolu/collaboration/DECISIONS.md`](../../collaboration/DECISIONS.md) — D-027 / D-028 / D-031 等架构决策
- [`F:/Yolu/collaboration/HANDOFF.md`](../../collaboration/HANDOFF.md) — 8 天的逐日 diary
- [`F:/Yolu/CLAUDE.md`](../../CLAUDE.md) — 项目规则 + 国际化硬规则

---

## 7. 未完成的 followup(给未来的自己)

### 防御性 cleanup(不阻塞 v1,但有空就做)
- [ ] `LocationPicker` / `PlacePicker` 接 `outerInsets` prop:虽然 patched SafeAreaView 现在 OK,但 outer-scope 模式更鲁棒,跟 9 个 Modal 一致
- [ ] `scripts/verify-deployment-config.ts`:RETROSPECTIVES Rule 2,CI 检查 DSN / API URL / env vars(目前手动验)
- [ ] 全文件搜索 `pointerEvents="box-none"` —— RN 0.81 已 deprecate prop 形式,要迁到 `style.pointerEvents`

### v1 上架前必修
- [ ] **GCP Maps API key 加 Application Restriction**(bundle ID + SHA-1) —— memory 里 2026-05-12 警告过,目前 key unrestricted,被刷光额度的风险敞口
- [ ] **Play Console API Access** 配通(目前 UI 找不到入口,手动 upload AAB 暂解)
- [ ] **Postervia+ paywall 重新启用**(memory `project_postervia_plus_hidden.md`)

### v2+ 规划
- [ ] Self-hosted Sentry(memory `project_postervia_monitoring_roadmap.md`)
- [ ] Railway 升 Pro / 评估其他 platform(高频 504 时启动)

---

## 8. 给 future agent 的一段话

如果你是 Claude(或别的 AI agent)接手 Postervia 移动端:

1. **先扫这个文件**,然后看 RETROSPECTIVES.md。这两份加起来覆盖了 8 天踩过的所有坑。
2. 写新 Modal / 改 env / 加 native 模块**之前**,翻第 4 节"编码 checklist"。
3. 出 bug 之前先看第 5 节"诊断 checklist",别凭直觉乱试。
4. 不要重复同样的错误 —— 8 天 30+ builds 已经付过学费了。

不犯老错,就是真的进步。
