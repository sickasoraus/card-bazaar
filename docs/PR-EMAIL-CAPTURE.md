# PR: Email Capture Popup (Waitlist)

## Summary
- Adds a modal popup prompting new visitors to join the waitlist.
- Shows once per browser (localStorage) after a short delay; respects dismiss.
- Simple validation; stores submissions locally and supports future backend hook.

## Files Changed
- `index.html`: Adds modal markup and styles.
- `app.js`: Modal logic, validation, localStorage gating, optional POST endpoint.

## Acceptance Criteria
- First-time visitors (not logged in) see a modal after ~2 seconds.
- Entering a valid email and submitting shows a success message and hides the modal.
- Dismissing the modal prevents repeat prompts.
- Desktop and mobile display the same visual layout for the modal.

## Configuration
- Set `EMAIL_CAPTURE_ENDPOINT` in `app.js` to send to a backend/webhook (optional). When null, it simulates success and stores locally.

## How to Test
1. Open the site in a private window → modal appears after ~2s.
2. Enter an invalid email → error; enter a valid email → success.
3. Refresh → modal does not reappear (stored as submitted).
4. Clear `localStorage` or use a new private window to re-test.
