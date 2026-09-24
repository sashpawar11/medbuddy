# 002 — Modal Physics and Document Preview Drawer Motion

- **Status**: DONE
- **Commit**: 377ce0e
- **Severity**: HIGH
- **Category**: Physicality & Origin / Missed Opportunities
- **Estimated scope**: 7 files

## Problem

Across the application, dialog backdrops carry dead Tailwind animation classes (`animate-in fade-in duration-180`), and the dialog container cards themselves have no animation whatsoever. This causes modals to pop onto the screen with zero physical presence, violating `docs/Designv2.md` §12:
> *Modal enter: 180ms ease-out, fade + 8px translate-up*

Additionally, the 380px `DocumentPreview` panel in `src/renderer/components/preview/DocumentPreview.tsx` uses inert classes (`animate-in slide-in-from-right duration-200`) and teleports onto the right side of the screen when a file is selected, breaking spatial continuity with the file list.

```tsx
/* src/renderer/components/explorer/AnalyzeModal.tsx:112 — current */
<div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-180">
  <div className="bg-surface border border-border rounded-lg w-full max-w-[560px] p-6 shadow-md">
```

```tsx
/* src/renderer/components/preview/DocumentPreview.tsx:58 — current */
<aside className="w-[380px] bg-surface border-l border-border flex flex-col h-full shrink-0 animate-in slide-in-from-right duration-200 select-none font-sans">
```

## Target

1. Backdrop on all 6 modals (`AnalyzeModal`, `DiagnosticsModal`, `FolderModal`, `MemberModal`, `OrganizeModal`, `GoogleSyncModal`) uses `.animate-fade-in` (180ms ease-out).
2. The inner modal dialog cards use `.animate-modal-enter` (180ms ease-out, fade + 8px translateY translate-up).
3. `DocumentPreview` uses `.animate-drawer-in` (200ms cubic-bezier(0.2, 0, 0, 1), translateX(100%→0)).
4. `FileExplorer` drag-and-drop overlay uses `.animate-fade-in`.

```tsx
/* Target for modals */
<div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 backdrop-blur-sm p-4 animate-fade-in">
  <div className="bg-surface border border-border rounded-lg w-full max-w-[560px] p-6 shadow-md animate-modal-enter">
```

```tsx
/* Target for DocumentPreview */
<aside className="w-[380px] bg-surface border-l border-border flex flex-col h-full shrink-0 animate-drawer-in select-none font-sans">
```

## Repo conventions to follow

- Utility classes defined in `src/renderer/index.css` (`.animate-fade-in`, `.animate-modal-enter`, `.animate-drawer-in`).
- Modal card centered with `transform-origin: center` (modals are exempt from trigger scaling per AUDIT.md §3).
- Easing matches `cubic-bezier(0.2, 0, 0, 1)`.

## Steps

1. In `src/renderer/components/explorer/AnalyzeModal.tsx`:
   - Replace `animate-in fade-in duration-180` on backdrop with `animate-fade-in`.
   - Add `animate-modal-enter` to the inner dialog card.
2. In `src/renderer/components/diagnostics/DiagnosticsModal.tsx`:
   - Replace `animate-in fade-in duration-180` on backdrop with `animate-fade-in`.
   - Add `animate-modal-enter` to the inner dialog card.
3. In `src/renderer/components/sidebar/FolderModal.tsx`:
   - Replace `animate-in fade-in duration-180` on backdrop with `animate-fade-in`.
   - Add `animate-modal-enter` to the inner dialog card.
4. In `src/renderer/components/sidebar/MemberModal.tsx`:
   - Replace `animate-in fade-in duration-180` on backdrop with `animate-fade-in`.
   - Add `animate-modal-enter` to the inner dialog card.
5. In `src/renderer/components/explorer/OrganizeModal.tsx`:
   - Replace `animate-in fade-in duration-180` on backdrop with `animate-fade-in`.
   - Add `animate-modal-enter` to the inner dialog card.
6. In `src/renderer/components/sync/GoogleSyncModal.tsx`:
   - Replace `animate-in fade-in duration-180` on backdrop with `animate-fade-in`.
   - Add `animate-modal-enter` to the inner dialog card.
7. In `src/renderer/components/preview/DocumentPreview.tsx`:
   - Replace `animate-in slide-in-from-right duration-200` with `animate-drawer-in`.
8. In `src/renderer/components/explorer/FileExplorer.tsx`:
   - Replace `animate-in fade-in` on drag-and-drop overlay with `animate-fade-in`.

## Boundaries

- Do NOT change modal layouts, form inputs, button event handlers, or state.
- Modals must keep their established widths and max-height boundaries.

## Verification

- **Mechanical**:
  - Run `npm run build` to verify clean compilation without syntax errors.
- **Feel check**:
  - Open any modal (e.g. Add Folder, Diagnostics, or Health Overview). The backdrop fades in subtly while the dialog card slides up smoothly by 8px without bounce or overshoot.
  - Click on a document row in File Explorer. The preview drawer slides smoothly in from the right edge in 200ms.
  - In DevTools Animation panel, inspect at 25% speed to verify both the backdrop opacity and modal translateY occur simultaneously in 180ms.
- **Done when**: Modals and drawer animate cleanly on entrance matching `Designv2.md` §12.
