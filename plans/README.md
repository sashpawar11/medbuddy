# Animation Implementation Plans

Distilled from the motion audit following Emil Kowalski's animation philosophy and `docs/Designv2.md` §12.

## Plan Catalog

| Plan | Title | Severity | Status | Dependencies |
|---|---|---|---|---|
| [001](001-core-motion-tokens-and-reduced-motion.md) | Core Motion Tokens, Keyframes, and Reduced Motion Foundation | HIGH | DONE | None |
| [002](002-modal-physics-and-drawer-motion.md) | Modal Physics and Document Preview Drawer Motion | HIGH | DONE | 001 |
| [003](003-toast-transitions-and-performance-cleanup.md) | Toast Transitions and Performance / transition-all Cleanup | MEDIUM | DONE | 001 |

## Recommended Execution Order

1. **Plan 001** must be executed first — it defines the keyframes, tokens, and utility classes in `index.css` and `tailwind.config.js`.
2. **Plan 002** can be executed immediately after Plan 001 — it wires modals and the drawer panel to the new animation classes.
3. **Plan 003** completes the suite by refining toasts, eliminating `transition-all` across high-frequency dashboard components, and removing inappropriate logo scale bounce.
