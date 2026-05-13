# hakolect pre-release checklist

Use this checklist before owner-facing confirmation whenever UI behavior, interaction flow, or menu / modal / panel visibility logic has changed.

## 1. When this checklist is required

Run this checklist when the change touches any of the following:

- click / tap triggered UI
- open / close state management
- conditional rendering (`mount` / `unmount`)
- `visibility`, `display`, `opacity`, `pointer-events`
- popover / dropdown / menu / modal / drawer positioning
- viewport-dependent behavior (mobile width, resize, orientation change)

## 2. Fixed record fields (mandatory)

Always record these fields for every verification run:

- Implementer
- Verifier (must be someone other than the implementer)
- Checked at
- Commit hash
- Browser / OS / viewport
- Target mode: grid or list
- Detail panel: open or closed
- Console errors: yes / no
- Network errors: yes / no
- Evidence: before/after screenshot or short recording

## 3. Visibility observation sequence

Record these steps separately. The goal is to catch cases where the UI is *mounted but not visible*.

1. Click / tap trigger executed
2. `open state = true`
3. Target DOM mounted
4. Computed visibility is not `hidden`
5. Rect / top-left position is valid

If step 2 passes but steps 4-5 fail, treat it as a release blocker. That is the same failure class as the three-dot menu incident.

## 4. Standard smoke test

### Display and positioning

- Grid view: three-dot menu opens
- List view: three-dot menu opens
- Detail panel closed: menu opens
- Detail panel open: menu opens
- Mobile width: menu opens
- Near right edge: menu stays visible with corrected position
- Near bottom edge: menu stays visible with corrected position
- Immediately after scrolling: menu opens
- After view toggle: menu opens
- After resize / orientation change: menu opens

### Action routing

- `Detail` opens in read-only mode
- `Edit` opens in edit mode with `Save / Cancel`
- `Move` opens directly into folder-move mode
- `Delete` works

### Production path confirmation

- Production build path `/hakolect/`: confirm grid/list and detail panel closed/open at least once each

## 5. Verification procedure

Use this order so every run is reproducible:

1. Record commit hash and environment.
2. Run local verification for the changed interaction.
3. Check the visibility observation sequence.
4. Run the standard smoke test.
5. Run production-path verification on `/hakolect/`.
6. Save screenshot or short recording.
7. Ask a non-implementer to repeat one verification pass.
8. Only then hand off for owner confirmation.

## 6. Owner handoff conditions

Do not hand off for owner confirmation until all of the following are true:

- Production build `/hakolect/` checks are complete
- One non-implementer verification pass is complete
- Mandatory record fields are filled in
- No unresolved invisible-state behavior remains
- No unresolved UI inconsistency remains

## 7. Reusable record template

```md
### Check run
- Implementer:
- Verifier:
- Checked at:
- Commit hash:
- Browser / OS / viewport:
- Mode: grid / list
- Detail panel: open / closed
- Console errors:
- Network errors:
- Evidence:

### Visibility observation
- Click / tap trigger executed:
- open state = true:
- Target DOM mounted:
- Computed visibility != hidden:
- Rect / top-left valid:

### Smoke test results
- Grid view:
- List view:
- Detail panel closed:
- Detail panel open:
- Mobile width:
- Right edge:
- Bottom edge:
- After scroll:
- After view toggle:
- After resize / orientation change:
- Detail action (read-only start):
- Edit action (editing start):
- Move action (folder move start):
- Delete action:
- Production build `/hakolect/`:

### Handoff decision
- Non-implementer verification complete:
- Unresolved invisible-state behavior:
- Unresolved UI issues:
- Ready for owner confirmation:
```
