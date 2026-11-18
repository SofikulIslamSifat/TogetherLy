# Togetherly

*A little life, shared together.*

Togetherly is an Android-first shared-life app for a private space with two members. It combines shared shopping lists, weekly meal planning, tasks, a private photo gallery, and in-app activity notifications.

This repository contains the application source, Supabase SQL migrations and security-test templates, Android app assets, and EAS Build profiles. It is **release-prepared source, not a verified production release**. A real Supabase project, dependency installation, Android build, and two-account device testing are still required.

## Technology

- Expo SDK 58, React Native 0.88, TypeScript, and Expo Router.
- Supabase Auth, Postgres, Row Level Security, Storage, and Realtime.
- TanStack Query and Zustand.
- React Hook Form and Zod.

## Requirements

- Node.js 22.13 or newer.
- npm.
- Android Studio with a compatible Android SDK for local Android builds, or an EAS account for cloud builds.
- A Supabase project.
- EAS CLI for cloud builds (`npm install --global eas-cli`).

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create your local environment file:

   ```bash
   cp .env.example .env
   ```

   On Windows PowerShell, use `Copy-Item .env.example .env`.

3. Set these values in `.env` using your Supabase project's API settings:

   ```dotenv
   EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
   ```

   Use a publishable key only. Never put a service-role key, secret key, database password, or other server credential in the mobile app or any `EXPO_PUBLIC_` variable.

4. Apply the migrations in `supabase/migrations/` in filename order. With the Supabase CLI installed and the project linked, review the target project and then run:

   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   ```

   The migrations create profile/avatar support, two-member spaces and invitations, shopping, meals, tasks, memories, and notifications. Back up an existing database before applying migrations to a non-empty project.

5. In Supabase Auth settings:
   - Enable email/password authentication.
   - Set the site's email confirmation behavior intentionally.
   - Add `togetherly://reset-password` to the allowed redirect URLs.
   - Configure an appropriate production email provider and test delivery.

6. Start the app:

   ```bash
   npx expo start
   ```

   Press `a` to open an Android emulator, or use a compatible development client on a physical Android device.

## Android builds with EAS

The repository includes `eas.json` with two Android profiles:

- `preview`: internally distributed APK for tester installation.
- `production`: Android App Bundle (AAB) for a Play Console release track.

Before the first build:

1. Sign in and initialize the EAS project:

   ```bash
   eas login
   eas init
   ```

2. Copy the generated EAS project ID into `expo.extra.eas.projectId` in `app.json`. Do not invent or reuse a project ID.
3. Configure `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` as EAS environment variables for the environments used by your build profiles. These are client configuration values; do not upload service-role or secret keys.
4. Confirm the Android application ID `com.togetherly.app`. Once published, changing it creates a different Play Store application.
5. Build a tester APK:

   ```bash
   npm run build:android:preview
   ```

6. After the release checklist is complete, create the production bundle:

   ```bash
   npm run build:android:production
   ```

EAS can manage Android signing credentials. Protect access to the EAS account and do not commit signing credentials or keystores. The production profile enables remote app-version management and automatic version-code increments; follow the EAS prompts and confirm the selected environment before each build.

For a local native Android project, run `npm run prebuild:android` and then use the generated Android project with Android Studio or Gradle. Prebuild generates native files; review them before committing or building.

## Validation commands

Run these from the project root after installing dependencies:

```bash
npm run typecheck
npm run lint
npm test -- --passWithNoTests
npx expo-doctor
npx expo config --type public
```

The source archive has not been connected to a live Supabase project. SQL migrations and pgTAP tests are included but have not been applied or executed against a live database. A complete TypeScript typecheck, Expo Doctor run, Android compilation, physical-device QA, and Play Console submission remain pending until the project is configured in the developer's environment.

## App configuration and assets

- Android package: `com.togetherly.app`.
- URL scheme: `togetherly`.
- App version: `1.0.0` (initial source value).
- Android version code: `1` (EAS production profile increments remotely).
- App icon, adaptive icon, and splash artwork are in `assets/`.
- `.env.example` contains placeholders only. `.env` is ignored by Git.

## Security and release notes

- Supabase authorization and RLS are the security boundary; hiding UI routes is not authorization.
- The mobile app must use only the Supabase publishable key.
- Profiles, shared-space membership, shopping, meals, tasks, memories, and notifications have membership/ownership policies in the included migrations.
- Avatar and shared-memory photos use private Storage buckets and policy-controlled access.
- Invitation codes are single-use, stored as hashes, and expire after seven days.
- Notifications are in-app only. Remote push notifications are not configured.
- Password reset email requests and the reset-password route exist in source. The actual email provider, redirect behavior, and recovery flow must be tested with a real Supabase project and installed Android app.
- No privacy policy, support website, Play Store listing, or public release has been created by this project source.

## Project structure

```text
app/                  Expo Router screens and navigation
assets/               App icon, adaptive icon, and splash image
components/common/    Shared UI components
constants/            Design tokens
features/auth/        Authentication provider and flows
features/spaces/      Shared-space feature APIs and hooks
lib/                  Supabase client, query client, validation
supabase/migrations/  Ordered Postgres migrations
supabase/tests/       pgTAP security-test templates
docs/                 Release and QA checklists
```

## Phase status

| Phase | Status |
|---|---|
| 1. Project setup and design system | Source scaffolded; full build validation pending |
| 2. Authentication and profiles | Implemented in source; live Supabase verification pending |
| 3. Shared spaces and invitations | Implemented in source; live database verification pending |
| 4. Shared shopping lists and items | Implemented in source; live database verification pending |
| 5. Shared meal planning | Implemented in source; live database verification pending |
| 6. Shared tasks | Implemented in source; live database verification pending |
| 7. Shared memories and private photo gallery | Implemented in source; live Storage/database verification pending |
| 8. Shared activity notifications | Implemented in source; live database verification pending |
| 9. UI polish and accessibility | Implemented in source; device review pending |
| 10. Release readiness | Build profiles, app assets, and release documentation prepared; production validation pending |

See [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md) before creating a preview or production build.
