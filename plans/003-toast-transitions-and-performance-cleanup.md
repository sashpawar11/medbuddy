# 003 — Toast Transitions and Performance / transition-all Cleanup

- **Status**: DONE
- **Commit**: 377ce0e
- **Severity**: MEDIUM
- **Category**: Performance & Physicality
- **Estimated scope**: 8 files

## Problem

1. `src/renderer/components/common/Toast.tsx` uses inert classes `transition-all animate-in fade-in slide-in-from-bottom-2`. Toasts pop onto the screen with no animation and disappear instantaneously when dismissed.
2. Across `MetricCard.tsx`, `HomeDashboard.tsx`, `OverviewDashboard.tsx`, `OverviewsHistory.tsx`, and `FileExplorer.tsx`, cards and filter chips use `transition-all`. This causes expensive off-GPU recalculations on hover.
3. In `src/renderer/components/common/MedBuddyLogo.tsx:22`, `hover:scale-[1.02]` adds gratuitous bounce to the brand logo, violating the clinical trust guideline in `docs/Designv2.md` §15 ("No bouncy/spring motion anywhere").
4. In `src/renderer/components/explorer/AnalyzeModal.tsx:164`, the analysis progress bar animates `transition-[width] duration-300 ease-out`, forcing continuous layout reflows during AI extraction.

```tsx
/* src/renderer/components/common/Toast.tsx:56 — current */
className={`pointer-events-auto flex items-start gap-3 p-3.5 bg-surface rounded-md border border-border border-l-[3px] ${item.border} shadow-lg transition-all animate-in fade-in slide-in-from-bottom-2`}
```

```tsx
/* src/renderer/components/common/MetricCard.tsx:137 — current */
className={`relative bg-surface rounded-lg border border-border/80 p-4 flex flex-col justify-between transition-all duration-150 shadow-xs hover:shadow-sm ${statusGlow} ${
```

```tsx
/* src/renderer/components/common/MedBuddyLogo.tsx:22 — current */
className="relative flex items-center justify-center shrink-0 rounded-xl shadow-xs transition-transform hover:scale-[1.02]"
```

## Target

1. `Toast.tsx`:
   - Animate each toast with `.animate-toast-enter` (200ms ease-out, translate-up from bottom 12px + opacity).
   - Change `transition-all` to `transition-[opacity,transform] duration-150 ease-out`.
2. Clean up `transition-all` on cards and interactive elements:
   - `MetricCard.tsx`: `transition-[border-color,box-shadow] duration-100 ease-out`
   - `HomeDashboard.tsx`: `transition-[border-color,box-shadow] duration-100 ease-out`
   - `OverviewDashboard.tsx`: `transition-[border-color,box-shadow] duration-100 ease-out`
   - `OverviewsHistory.tsx`: `transition-[border-color,box-shadow] duration-100 ease-out`
   - `FileExplorer.tsx` tag filters: `transition-[background-color,border-color,color] duration-100 ease-out`
3. `MedBuddyLogo.tsx`:
   - Remove `hover:scale-[1.02]`. Keep crisp, flat visual appearance.
4. `AnalyzeModal.tsx`:
   - Replace layout-reflow `transition-[width]` with hardware-accelerated transform scaling: `style={{ transform: `scaleX(${progress / 100})`, transformOrigin: 'left' }}` and `transition-transform duration-200 ease-out`.

## Repo conventions to follow

- Duration budgets: hover states at 100ms, button press at 80-100ms, toasts at 200ms ease-out.
- No scale/bounce on buttons or logos per `Designv2.md` §12.

## Steps

1. In `src/renderer/components/common/Toast.tsx`:
   - Replace `transition-all animate-in fade-in slide-in-from-bottom-2` with `animate-toast-enter transition-[opacity,transform] duration-150 ease-out`.
2. In `src/renderer/components/common/MetricCard.tsx`:
   - Replace `transition-all duration-150` with `transition-[border-color,box-shadow] duration-100 ease-out`.
3. In `src/renderer/components/common/MedBuddyLogo.tsx`:
   - Remove `hover:scale-[1.02]` and `transition-transform`.
4. In `src/renderer/components/dashboard/HomeDashboard.tsx`:
   - Replace `transition-all` on action cards and recent file cards with `transition-[border-color,box-shadow] duration-100 ease-out`.
5. In `src/renderer/components/dashboard/OverviewDashboard.tsx`:
   - Replace `transition-all` on report cards with `transition-[border-color,box-shadow] duration-100 ease-out`.
6. In `src/renderer/components/dashboard/OverviewsHistory.tsx`:
   - Replace `transition-all` on history cards with `transition-[border-color,box-shadow] duration-100 ease-out`.
7. In `src/renderer/components/explorer/FileExplorer.tsx`:
   - Replace `transition-all` on tag filter buttons with `transition-[background-color,border-color,color] duration-100 ease-out`.
8. In `src/renderer/components/explorer/AnalyzeModal.tsx`:
   - Switch progress bar from `w-[${progress}%]` to GPU `scaleX` transform.

## Boundaries

- Do NOT alter toast state management in `App.tsx`.
- Do NOT alter metric value calculations or range bar geometry.

## Verification

- **Mechanical**:
  - Run `npm run build` and ensure TypeScript and CSS compilation succeed.
  - Run `npm test` to verify no integration regressions.
- **Feel check**:
  - Trigger a toast (e.g. file import, save settings). Verify it slides up 12px smoothly in 200ms from the bottom right corner.
  - Hover over metric cards and dashboard cards. Verify borders highlight instantly without layout stutter.
  - Hover over the sidebar logo. Confirm no scaling or bounce occurs.
- **Done when**: All `transition-all` instances on hot UI elements are replaced with discrete GPU properties, and toasts enter with smooth 200ms motion.
