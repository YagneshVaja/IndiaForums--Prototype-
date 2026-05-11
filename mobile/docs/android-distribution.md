# Android Distribution — IndiaForums Mobile

How to ship a build to internal testers (friends, QA) using EAS Build.
This doc covers Android only. iOS / TestFlight is a follow-up.

---

## One-time setup (you, the maintainer)

You only do this once per machine / per project.

### 1. Install the EAS CLI globally

```bash
npm install -g eas-cli
eas --version   # verify (need >= 16.x)
```

### 2. Log into Expo

```bash
eas login
```

If you don't have an Expo account yet, create one at https://expo.dev/signup
first (free).

### 3. Initialize the EAS project

From `mobile/`:

```bash
cd mobile
eas init
```

This will:
- Create the project on expo.dev under your account.
- Replace the `YOUR_EAS_PROJECT_ID` placeholder in `app.json` with the real id.
- Link this codebase to the cloud project.

Commit the resulting `app.json` change.

### 4. Configure Android credentials

```bash
eas credentials
```

Pick `Android` → `production` → `Set up a new keystore`. Let EAS generate and
store the keystore for you (this is the modern default — no local `.jks` files
to lose). The same keystore is used for `preview` and `production` profiles, so
upgrades in the Play Store later will be signed consistently.

---

## Build profiles (in `eas.json`)

| Profile | Output | Distribution | Use for |
|---|---|---|---|
| `development` | Debug APK with dev client | internal | Day-to-day dev on real devices, hot reload over LAN |
| `preview` | Release APK | internal (install URL) | Sharing with friends / QA testers |
| `production` | Release AAB | Play Store | Play Store internal track → closed → open → prod |

Why APK for preview but AAB for production: Play Store requires AAB; sideload
install requires APK.

---

## Daily workflows

### A. Share a build with a friend (the main use case)

```bash
cd mobile
npm run build:preview:android
```

EAS will:
1. Upload the project to the build server.
2. Build a release APK in the cloud (~10–20 min).
3. Print an install URL like `https://expo.dev/accounts/<you>/projects/indiaforums/builds/<id>`.

Send that URL to your tester. They open it on their Android phone, tap
**Install**, and accept "Install from unknown sources" if prompted. No Expo
Go required. The APK is fully standalone.

You can also see all builds at https://expo.dev → your project → Builds.

### B. Push a JS-only fix without rebuilding (OTA)

> Requires `expo-updates` to be installed. **Not set up yet** — see "Optional:
> enable OTA updates" below. Skip this section until then.

```bash
npm run update:preview -- --message "Fix forum pagination"
```

Testers get the update next time they relaunch the app. Native changes (new
Expo plugin, new permission, native module added) still need a fresh build.

### C. Dev client for fast iteration on a real device

Build once:

```bash
npm run build:dev:android
```

Install the resulting APK on your phone. Then for daily work just run
`npm run start` on your laptop and scan the QR with the dev client app — full
hot reload on a real device, including all your native modules (MMKV,
SecureStore, etc.) which Expo Go can't host.

### D. Release to Play Store (later, when ready)

```bash
npm run build:prod:android   # produces signed AAB
npm run submit:android        # uploads AAB to Play Console internal track
```

You'll need a Google Play Console account ($25 one-time) and a service-account
JSON for `eas submit`. Configure the path in `eas.json` under `submit` when
you reach that step.

---

## Versioning

We use **`appVersionSource: "remote"`** in `eas.json`. This means:

- The human-readable `version` (e.g. `0.1.0`) lives in `app.json` — bump it
  manually when you cut a release.
- The Android `versionCode` is managed by EAS (`autoIncrement: true` on the
  production profile). You don't need to touch it.

Convention: bump `app.json` `version` using SemVer:
- `0.1.x` → bug fixes shared with testers
- `0.x.0` → new feature batches
- `1.0.0` → first Play Store release

---

## Environment variables

Two layers:

1. **Build-time** (baked into the APK): set in `eas.json` per profile under
   `env`, or via EAS Secrets:
   ```bash
   eas secret:create --scope project --name SENTRY_DSN --value "<dsn>" --type string
   ```
   Anything referenced via `process.env.X` at build time will be inlined.

2. **Runtime** (read from `expo-constants` `extra` block): not secret. OK for
   API base URLs that differ per profile.

Right now the API base URL is hardcoded in `src/services/api.ts`. If you ever
need a staging vs prod backend, switch to reading from
`expo-constants` → `extra` and set per-profile values in `app.config.ts`.

---

## Optional: enable OTA updates

Once you have a `preview` build out and want to push JS fixes without
rebuilding:

```bash
npx expo install expo-updates
eas update:configure
```

This will:
- Add `expo-updates` to the project.
- Add an `updates.url` and `runtimeVersion` block to `app.json`.
- Wire the `channel` from `eas.json` to update delivery.

After that, `eas update --channel preview` is live.

---

## Optional: crash reporting + perf monitoring

Recommended stack (lightweight, works with Expo managed workflow):

- **Sentry** for crashes + performance traces — `npx expo install sentry-expo`
  then add the config plugin to `app.json` and a Sentry project DSN as an EAS
  Secret. Free tier is generous.
- **Expo's built-in `errorRecovery` + `expo-application`** for basic device /
  install metadata if you don't want a third party yet.

Skip this for the first round of friend testing. Add it before opening the
Play Store internal track.

---

## Tester install instructions (copy-paste to your friends)

> 1. Open this link on your Android phone: `<paste install URL here>`
> 2. Tap **Install**. If your browser asks "allow install from this source",
>    say yes — it's a one-time prompt for Chrome/Drive.
> 3. Open the app from your home screen.
> 4. If you see a "blocked by Play Protect" warning, tap **More details →
>    Install anyway**. The build is signed but not Play-Store-distributed yet.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `eas init` fails with auth error | `eas logout && eas login` |
| Build fails on `gradlew` step | Almost always a native module version mismatch — run `npx expo-doctor` and follow its suggestions |
| APK installs but crashes on launch | Check the build's logs on expo.dev → Builds → click build → Logs tab. Usually a missing config plugin or env var |
| Tester says "App not installed" | Old version with same package name already installed — uninstall first, or bump `versionCode` (auto on `production` profile, not on `preview`) |
| `versionCode` collision on preview | Add `"autoIncrement": true` to the `preview` profile in `eas.json` |
