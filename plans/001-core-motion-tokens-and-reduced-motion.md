# 001 — Core Motion Tokens, Keyframes, and Reduced Motion Foundation

- **Status**: DONE
- **Commit**: 377ce0e
- **Severity**: HIGH
- **Category**: Accessibility & Cohesion & Tokens
- **Estimated scope**: 2 files (`src/renderer/index.css`, `tailwind.config.js`)

## Problem

Components across the application use animation utility classes like `animate-in`, `fade-in`, `slide-in-from-bottom-2`, `slide-in-from-right`, and `duration-180`, but `tailwindcss-animate` is not installed, and no `@keyframes` or animation classes exist in the stylesheet. As a result, all modals, drawers, and toasts pop into the DOM with zero transition.

Furthermore, there is zero `prefers-reduced-motion` handling in the codebase, directly violating `docs/Designv2.md` §12 and WCAG 2.1 guideline 2.3.3. Infinite animations (`animate-pulse`, `animate-ping`) run indefinitely for users who require reduced motion.

```css
/* src/renderer/index.css:124 — current */
  /* Motion */
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --duration-fast: 100ms;
  --duration-base: 180ms;
  --duration-panel: 200ms;
```

```javascript
/* tailwind.config.js:8 — current */
  theme: {
    extend: {
      colors: { ... },
      borderRadius: { ... },
      boxShadow: { ... },
      fontFamily: { ... },
      fontSize: { ... },
      spacing: { ... },
    },
  },
  plugins: [],
```

## Target

1. Expand CSS motion tokens in `src/renderer/index.css` to define Emil Kowalski UI easing standards and `Designv2.md` specifications:
   - `--ease-out: cubic-bezier(0.2, 0, 0, 1);`
   - `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);`
2. Define hardware-accelerated `@keyframes` and utility classes for:
   - `fadeIn` (180ms ease-out)
   - `modalEnter` (180ms ease-out, opacity 0→1, translateY(8px→0))
   - `drawerSlideIn` (200ms cubic-bezier(0.2, 0, 0, 1), translateX(100%→0))
   - `toastEnter` (200ms ease-out, opacity 0→1, translateY(12px→0))
3. Add a global `@media (prefers-reduced-motion: reduce)` block in `src/renderer/index.css` that disables transform animations, keeps opacity crossfades, and turns pulses/spins into static states per §12.
4. Expose transition durations, easings, and animation names in `tailwind.config.js`.

```css
/* target in src/renderer/index.css */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes modalEnter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes drawerSlideIn {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

@keyframes toastEnter {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  .animate-pulse, .animate-ping, .animate-spin {
    animation: none !important;
  }
}
```

## Repo conventions to follow

- Tokens live in `:root` and `[data-theme="dark"]` in `src/renderer/index.css`.
- Tailwind configuration extends tokens under `theme.extend` in `tailwind.config.js`.
- Respect `Designv2.md` §12: no bounce, no overshoot, strict AA accessibility.

## Steps

1. In `src/renderer/index.css`, update the motion tokens:
   - Add `--ease-out: cubic-bezier(0.2, 0, 0, 1);`
   - Add `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);`
2. In `src/renderer/index.css`, declare `@keyframes fadeIn`, `@keyframes modalEnter`, `@keyframes drawerSlideIn`, and `@keyframes toastEnter`.
3. In `src/renderer/index.css`, add utility classes:
   - `.animate-fade-in`
   - `.animate-modal-enter`
   - `.animate-drawer-in`
   - `.animate-toast-enter`
4. In `src/renderer/index.css`, add the `@media (prefers-reduced-motion: reduce)` block.
5. In `tailwind.config.js`, add `transitionTimingFunction`, `transitionDuration`, and `animation` mappings to `theme.extend`.

## Boundaries

- Do NOT install extra npm packages (no external plugins needed; pure CSS is lighter and hardware-accelerated).
- Do NOT alter existing color or spacing tokens.
- Do NOT touch business logic or IPC handlers.

## Verification

- **Mechanical**:
  - Run `npm run build` to verify Tailwind compiles and TypeScript checks pass.
- **Feel check**:
  - Inspect `prefers-reduced-motion: reduce` in Chrome DevTools Rendering tab. Ensure all looping dots/spinners freeze immediately into static indicators.
- **Done when**: `npm run build` succeeds without CSS warnings, and animation classes are available across the renderer.
