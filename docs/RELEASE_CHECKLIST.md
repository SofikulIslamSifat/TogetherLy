# Togetherly Android Release Checklist

Use this checklist before distributing a tester APK or submitting an Android App Bundle. Items marked **required** must be completed by the project owner in a configured environment; source files alone cannot verify them.

## 1. Project and environment

- [ ] **Required:** Install dependencies with `npm install` and retain the generated lockfile in version control.
- [ ] **Required:** Run `npm run typecheck`, `npm run lint`, `npm test -- --passWithNoTests`, `npx expo-doctor`, and `npx expo config --type public`.
- [ ] **Required:** Create a Supabase project for the intended environment.
- [ ] **Required:** Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` locally and in the matching EAS environment.
- [ ] Confirm no `.env`, secret key, service-role key, signing credential, or database password is committed.
- [ ] Confirm the EAS owner/project ID in `app.json` belongs to the intended account and configure the required EAS build environment.
- [ ] Confirm `com.togetherly.app` is the intended permanent Android application ID.

## 2. Supabase deployment and security

- [ ] Back up the target database before applying schema changes.
- [ ] Review every migration in `supabase/migrations/` and apply them in filename order.
- [ ] Run the pgTAP tests in `supabase/tests/` against the configured project or a disposable test database.
- [ ] Review Supabase Security Advisor findings and resolve relevant errors/warnings.
- [ ] Confirm RLS is enabled and policies match the intended two-member access model.
- [ ] Confirm private avatar and shared-memory buckets are private and Storage policies work for both members and outsiders.
- [ ] Confirm Realtime publication and subscription behavior for shopping, meals, tasks, memories, and calendar events.
- [ ] Confirm invitation expiry, single-use behavior, invalid-token handling, and the two-member limit.
- [ ] Confirm email/password sign-in and email confirmation settings.
- [ ] Add `togetherly://reset-password` to the Supabase Auth allowed redirect URLs.
- [ ] Configure a production email provider and test reset-email delivery and recovery-link handling on Android.
- [ ] Decide backup, retention, account deletion, and support processes before accepting real users.

## 3. Two-account functional QA

Test with two separate accounts in the same shared space, plus a third account that is not a member.

- [ ] Register, sign in, sign out, restore a session after app restart, and handle invalid credentials.
- [ ] Test email confirmation behavior for the selected Supabase configuration.
- [ ] Request a password reset, open the email link on Android, set a new password, and sign in again.
- [ ] Create a space, generate an invitation, accept it from the second account, and verify a third account cannot access the space.
- [ ] Verify a space cannot accept a third member.
- [ ] Create, edit, purchase, and delete shopping items; verify both members see updates and totals.
- [ ] Verify a new daily shopping list starts each day and unfinished items from prior days appear under Incomplete.
- [ ] Create meal entries and ingredients; transfer ingredients to a shopping list and verify duplicates are not transferred twice.
- [ ] Create, assign, edit, complete, reopen, filter, and delete tasks.
- [ ] Add meals, tasks with due dates, plans, and annual important dates to the shared calendar; verify both members see changes in realtime.
- [ ] Upload, view, edit, and delete memories; verify the other member can view them and a non-member cannot.
- [ ] Test offline/poor-network behavior, retry states, empty states, and expired sessions.
- [ ] Verify date/time display, BDT currency display, long text, keyboard behavior, and small-screen layouts.

## 4. Android device QA

- [ ] Install the preview APK on a physical Android device.
- [ ] Check app icon, adaptive icon, splash screen, status bar, navigation bar, and safe-area spacing.
- [ ] Test photo selection, permission denial, upload failures, and large images.
- [ ] Test deep links when the app is closed, in the background, and already open.
- [ ] Check screen reader labels, font scaling, contrast, and minimum touch target sizes.
- [ ] Test app background/resume, force close/reopen, and low-memory behavior.
- [ ] Review Android logs for crashes, unhandled promise rejections, and Supabase errors.
- [ ] Confirm the release build does not expose development menus or debug-only content.

## 5. Play Store preparation

- [ ] Prepare a public privacy policy URL that accurately describes account data, shared content, photos, and data deletion.
- [ ] Prepare a support contact and a process for account/data deletion requests.
- [ ] Prepare store title, short description, full description, screenshots, app icon, and feature graphic.
- [ ] Complete the Play Console Data safety form based on actual SDK behavior and data handling; do not guess.
- [ ] Complete content rating, target audience, ads declaration, app access instructions, and other Play Console policy forms accurately.
- [ ] Confirm app permissions are minimal and explain photo access in context.
- [ ] Upload the production AAB to an internal testing track first.
- [ ] Review Play pre-launch report and crash/ANR results; fix blockers before wider rollout.
- [ ] Confirm version name and version code before each release.

## 6. Build commands

Preview APK for internal testers:

```bash
npm run build:android:preview
```

Production AAB after all required checks pass:

```bash
npm run build:android:production
```

Do not distribute a production build until Supabase deployment, security review, two-account QA, privacy disclosures, and Android device testing are complete.

## Known release blockers at handoff

- No Supabase project is linked to this source archive.
- Database migrations and pgTAP tests have not been run against a live database.
- EAS build environment still requires project-owner setup.
- The npm lockfile still needs review and inclusion in the release commit; install dependencies in the build workspace before building.
- No EAS Android build or physical-device test has been performed.
- Privacy policy, support site, Play Store listing, and account-deletion workflow still require project-owner setup.
