# Glint Productization Iteration Plan

## Product promise

Glint should become an AI Moment Lockscreen: when the user wakes the phone, the lockscreen already shows the one thing that matters most for this moment.

The product must not rely on generating from scratch on every wake. A usable lockscreen has to show something valuable immediately, then refresh only when a real moment changes.

## North star experience

1. The user grants clear, scoped permissions for calendar, notifications, weather, coarse location, and optional health signals.
2. Glint turns those signals into structured moments on device.
3. A render policy decides whether the current moment deserves a new lockscreen, a small local patch, or silence.
4. The chosen moment is generated ahead of time when possible.
5. On wake, the user sees a complete lockscreen in under 500 ms.
6. Feedback and render history tune future choices without uploading raw private data by default.

## Architecture target

```txt
Signal adapters
  -> Moment engine
  -> Render policy
  -> Prompt composer
  -> Render cache
  -> Surface adapter
  -> Feedback and memory
```

### Signal adapters

Inputs:

- Time rhythm: morning, commute, lunch, focus, evening, late night.
- Calendar: upcoming meetings, travel blocks, reminders.
- Notifications: flight, delivery, high-priority messages, weather alerts.
- Weather: rain, wind, temperature swing, severe alerts.
- Coarse location: home, work, transit, airport, station.
- Optional health: steps, sleep, workout completion.

Rule: raw private data is parsed locally first. The model receives only the minimum facts required to generate the lockscreen.

### Moment engine

The engine resolves a `SignalSnapshot` into a single `ResolvedMoment`.

The first implementation lives in `glint-app/services/momentEngine.ts` and supports:

- notification candidates for flight, delivery, and important messages
- calendar briefing candidates
- weather alert candidates
- daily rhythm candidates
- behavior and preference boosts
- recent-render penalties to avoid repetition

### Render policy

Generation rules:

- High urgency event: generate immediately in the background.
- Daily rhythm: pre-generate a few minutes before the expected time.
- Small numeric changes: patch locally instead of regenerating.
- Repeated wake with no new context: reuse cached render.
- Manual creative input: allow live generation and visible waiting.

Initial target:

- 80% of ordinary wakes use cache or local patch.
- High-value moments prepare a new render within 3 seconds.
- Wake-to-usable-screen stays under 500 ms.

### Surface strategy

Ship in three layers:

1. Capacitor full-screen app: current debug and demo surface.
2. Live wallpaper surface: lower-permission Android distribution path.
3. Lock-screen activity or overlay experiments: only after real-device validation.

## Iteration plan

### Phase 1: Productized demo kernel

Duration: 1-2 weeks.

Deliverables:

- Moment engine and deterministic tests.
- Smart Moment entry in the existing sheet.
- Auto-generate current moment after API key is ready.
- Product plan document.
- Build, typecheck, and unit-test scripts.

Acceptance:

- `npm test` passes.
- `npm run typecheck` passes.
- `npm run build` passes.
- Existing presets remain usable.
- App opens into a generated current moment when a Gemini key exists.

### Phase 2: Local memory and cache

Duration: 2-4 weeks.

Deliverables:

- `RenderCache` keyed by moment id and expiry.
- local render history.
- explicit user feedback: useful, too noisy, too dark, wrong priority.
- preference slots: visual tone, quiet hours, priority moment types.

Acceptance:

- Reopening the app within the same moment does not trigger cloud generation.
- Similar visual moods are penalized for at least 6 hours.
- User feedback changes future moment ranking.

### Phase 3: Real Android context adapters

Duration: 4-8 weeks.

Deliverables:

- Calendar adapter.
- Notification listener adapter.
- Weather adapter.
- Coarse location adapter.
- permission onboarding and privacy screen.

Acceptance:

- Every permission is optional and explained.
- Every generated moment can display why it appeared.
- Raw notification text is not sent to the model unless necessary and user-approved.

### Phase 4: Background pre-generation

Duration: 4-8 weeks.

Deliverables:

- background task scheduler.
- render queue with network and battery constraints.
- local patcher for countdowns, temperature, step count, and meeting time.
- failure fallback to last known good render.

Acceptance:

- Daily rhythm moments are ready before their expected window.
- A flight or delivery notification can prepare a render before the next wake.
- No network means no black screen.

### Phase 5: Android surface productization

Duration: 6-10 weeks.

Deliverables:

- live wallpaper prototype.
- lock-screen activity experiment.
- battery profiling.
- real-device QA matrix.

Acceptance:

- One surface works for 7 continuous days on a real Android device.
- Unlock flow is not degraded.
- Battery impact is measured and bounded.

### Phase 6: Action layer

Duration: 8-12 weeks.

Deliverables:

- low-risk actions: open app, navigate, copy draft, open event.
- confirmation-gated actions: book ride, reschedule, reply, buy ticket.
- action audit log.

Acceptance:

- No high-risk action executes without explicit confirmation.
- Action buttons explain what will happen.
- Failed action falls back to opening the relevant app.

### Phase 7: Closed beta

Duration: 3-6 months.

Metrics:

- D1 and D7 retention.
- useful feedback rate.
- wrong-priority rate.
- cloud generations per active day.
- wake-to-usable-screen latency.
- battery impact.
- crash-free sessions.

Release bar:

- stable APK and update path.
- privacy policy.
- supportable permissions model.
- production telemetry with opt-in privacy guardrails.
- rollbackable releases.

## Current implementation status

Implemented in this iteration:

- `momentEngine.ts`: first Moment kernel.
- `momentEngine.test.ts`: deterministic unit tests for priority and prompt composition.
- `renderCache.ts`: local render cache for instant reuse when the resolved moment is still fresh.
- `renderCache.test.ts`: unit tests for cache match, expiry, and moment mismatch behavior.
- `userMemory.ts`: local preference and feedback memory for priority, tone, and render history.
- `userMemory.test.ts`: unit tests for useful feedback, priority correction, tone guidance, and render dedupe.
- `nativeSignals.ts` plus Android `GlintContextPlugin`: first bridge for calendar and notification signals.
- Signal source controls in the home sheet for calendar permission, notification settings, and status refresh.
- Home sheet Smart Moment card.
- Lock screen feedback controls for useful, wrong-priority, and noisy renders.
- App boot auto-generation for the current Smart Moment.
- Foreground refresh policy: refresh signal status and regenerate when the active Moment is missing or expired.
- Initial bundle optimization: Gemini service, Home sheet, and flight demo HTML are code-split out of the lockscreen first load.
- Privacy minimization for notification signals: redact emails, phone numbers, long numeric codes, and drop unknown notification bodies before prompt composition.
- Emulator install smoke: debug APK installs, launches, renders the generated lockscreen, opens the Home sheet, and shows the signal source card.

Still not production-ready:

- Android context adapters are started: calendar permission and notification settings entry points exist, but real-device validation is not complete.
- First local preference memory and render cache are implemented; cross-device memory is not implemented yet.
- Live wallpaper and true lockscreen surfaces are not implemented yet.
- Actions are prompt-level only; they do not execute system tasks.
- Privacy protection is started, but a full user-facing privacy policy and permission explanation flow are still required.
- Emulator validation surfaced intermittent Android system-process ANR dialogs; Glint stayed running, but this must be rechecked on a stable emulator or real device.
