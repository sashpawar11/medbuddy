# Design System — Family Medical Vault
**A calm, precise visual language for a private, local-first medical records app**

| | |
|---|---|
| **Status** | v1.0 |
| **Owner** | Design |
| **Applies to** | Electron desktop app (React + TypeScript), light theme primary, dark theme secondary |
| **Companion doc** | `PRD_Family_Medical_Vault.md` |

---

## 0. How to use this document

This is the single source of truth for how the app looks and behaves visually. It is organized so an engineer can implement directly from it and a designer can extend it without breaking consistency:

- **§1–2** — why the app should feel the way it does (read once, refer back when in doubt).
- **§3–8** — the raw material: color, type, spacing, radius, elevation, icons.
- **§9** — components, built from that raw material.
- **§10–11** — the two things that make this app *this* app, not a generic dashboard: health data visualization, and the privacy/provenance system.
- **§12–14** — motion, accessibility, dark mode.
- **§15** — what to avoid, explicitly.
- **§16** — copy-pasteable CSS custom properties.

When a component's spec conflicts with a token in §3–8, the token wins — components should never hardcode a raw value.

---

## 1. Design principles

These are ranked. When two principles pull in different directions, the higher one wins.

1. **Legible over decorative.** People will read lab values, dosages, and dates in this app, sometimes for an aging parent, sometimes stressed. Every choice about size, weight, contrast, and color is made for a 55-year-old reading a cholesterol panel at 11pm, not for a portfolio screenshot.
2. **Calm, not clinical-cold.** Reference the confidence of a well-run clinic, not the sterility of a hospital form. Warm neutrals over stark white/black. No alarm-red unless something is genuinely flagged.
3. **Trust is a visual feature.** Because this app touches sensitive data and makes explicit local-vs-cloud tradeoffs, "what is happening to my data" must be legible at a glance, everywhere it's relevant — not buried in settings copy.
4. **Quiet by default, precise on demand.** The UI recedes; the data is the content. Chrome (borders, shadows, dividers) is minimal and functional. Density is earned through alignment and whitespace, not by shrinking type.
5. **Native, not web-generic.** This is a desktop app running on macOS, Windows, and Linux. It should feel like a considered piece of software (Linear, Notion, Things), not a webpage stretched into a window.
6. **Consistent over novel.** One button style, one card style, one radius scale, applied everywhere. Novelty is spent on the two or three moments that matter (the dashboard, the provenance indicator) — not spread thin across every screen.

---

## 2. Brand personality & inspiration

**Personality in three words:** *Composed, trustworthy, exact.*

If this app were a person, it's the calm doctor's-office administrator who has your file organized before you ask — not a hype-y health-tech startup, not a spreadsheet.

**Explicit inspiration (visual language, not assets):**

| Product | What we're taking from it |
|---|---|
| **Linear** | Hairline borders over heavy shadows, tight information density, restrained single-hue accent color, keyboard-first interactions |
| **Notion** | Calm neutral canvas, generous line-height on body text, sidebar/tree navigation pattern |
| **Apple Health** | Metric-card vocabulary, plain-language summaries paired with numbers, respectful use of status color |
| **Stripe Dashboard** | Data-dense tables that stay legible, precise numeric typography (tabular figures), restrained charts |
| **Mercury (banking)** | How a security/trust-sensitive product uses color sparingly and confidently — most of the UI is neutral, color is reserved for meaning |
| **1Password** | How a "your data, your device" story is made visible in the UI itself (vault metaphor, lock iconography, local/cloud distinctions) |

We are explicitly **not** referencing: AI-startup gradient hero sections, glassmorphism, neumorphism, bouncy/playful consumer health apps (Duolingo-style), or dashboard templates with rainbow KPI cards.

---

## 3. Color system

### 3.1 Philosophy

Five hue families, each with exactly one job. No hue is reused for two meanings.

| Family | Job | Never used for |
|---|---|---|
| **Ink** (neutral) | Structure — text, backgrounds, borders | Any status or meaning |
| **Vault** (blue) | Brand + primary actions | Status, provenance |
| **Sage** (green) | "Normal / good / synced" status only | Local vs. cloud, brand |
| **Amber** | "Borderline / attention / pending" status only | Provenance |
| **Clay** (muted red) | "Flagged / error / critical" status only | Destructive-but-routine actions (see §9.1) |
| **Teal** | "On this device" provenance only | Any status meaning |
| **Violet** | "Leaves this device / external API" provenance only | Any status meaning |

Clay and Teal/Violet are the two deliberate exceptions to "no decorative color": provenance (Teal/Violet) is load-bearing per the PRD's privacy requirements, and it must never be confusable with clinical status (Sage/Amber/Clay), which is why it sits on a completely different part of the color wheel.

### 3.2 Neutral — "Ink"

A cool, very slightly blue-tinted neutral (not pure gray, not warm beige) — reads as premium and calm rather than sterile.

| Token | Hex | Light-mode usage |
|---|---|---|
| `ink-25` | `#FBFBFD` | App background |
| `ink-50` | `#F6F7FA` | Sidebar / recessed panel background |
| `ink-100` | `#EEF0F5` | Subtle fills, hover on ghost elements |
| `ink-200` | `#E1E4EC` | Default borders, dividers |
| `ink-300` | `#CBD0DC` | Stronger borders, input borders |
| `ink-400` | `#9CA4B6` | Disabled text, placeholder text |
| `ink-500` | `#6F7891` | Secondary/meta text, icons |
| `ink-600` | `#525B72` | Secondary body text |
| `ink-700` | `#3A4257` | Primary body text (default) |
| `ink-800` | `#242B3D` | Headings, high-emphasis text |
| `ink-900` | `#141926` | Reserved for dark-mode surfaces (see §14) |

### 3.3 Primary — "Vault" (blue)

The single brand hue. Deliberately a deep, desaturated blue — closer to a bank or clinic than a tech startup. Never gradiented.

| Token | Hex | Usage |
|---|---|---|
| `vault-50` | `#EEF3FC` | Selected-row / active-nav background |
| `vault-100` | `#DCE8F9` | Light fills, info banners |
| `vault-200` | `#B7D0F2` | Hover fills |
| `vault-300` | `#8AB2E8` | Chart secondary line, disabled primary button |
| `vault-400` | `#5991DB` | Hover state of primary actions |
| `vault-500` | `#3873C9` | **Primary brand color** — links, focus rings |
| `vault-600` | `#2C5CA8` | **Primary button default**, active nav icon |
| `vault-700` | `#234780` | Primary button pressed state |
| `vault-800` | `#1B3760` | Dark-mode primary accent |
| `vault-900` | `#142942` | Reserved |

### 3.4 Status hues

Deliberately muted — these describe medical findings, and a person reading them may already be anxious. Saturation is capped well below "alert" red/green so the palette informs without alarming.

**Sage (normal / good / synced)**
| Token | Hex |
|---|---|
| `sage-100` (bg tint) | `#E6F4EC` |
| `sage-300` (border) | `#A8D9BC` |
| `sage-600` (text/icon) | `#1E8A57` |

**Amber (borderline / attention / pending)**
| Token | Hex |
|---|---|
| `amber-100` (bg tint) | `#FBF1DC` |
| `amber-300` (border) | `#EBC876` |
| `amber-600` (text/icon) | `#A6720F` |

**Clay (flagged / critical / error)** — a muted brick-red, not a saturated alarm red.
| Token | Hex |
|---|---|
| `clay-100` (bg tint) | `#F9EAE7` |
| `clay-300` (border) | `#E4A99E` |
| `clay-600` (text/icon) | `#B54A3A` |

> **Rule:** status is never conveyed by color alone. Every status chip pairs color with an icon (●/▲/✕-style glyphs, see §9.3) and a text label. This matters for colorblind users reading their own lab flags — see §13.

### 3.5 Provenance hues (data locality — see §11.1)

**Teal — "stays on this device"**
| Token | Hex |
|---|---|
| `teal-100` (bg tint) | `#E1F1F1` |
| `teal-300` (border) | `#9FD3D3` |
| `teal-600` (text/icon) | `#146B72` |

**Violet — "leaves this device"**
| Token | Hex |
|---|---|
| `violet-100` (bg tint) | `#F1ECFA` |
| `violet-300` (border) | `#CBAFEA` |
| `violet-600` (text/icon) | `#6B46A8` |

### 3.6 Semantic token layer

Components should reference *these* names, never raw hues directly, so theming (and dark mode) is a one-file change.

| Semantic token | Light value | Purpose |
|---|---|---|
| `color-bg-app` | `ink-25` | Window background |
| `color-bg-surface` | `#FFFFFF` | Cards, panels, modals |
| `color-bg-recessed` | `ink-50` | Sidebar, table header row |
| `color-bg-hover` | `ink-100` | Row/list hover |
| `color-border-default` | `ink-200` | Default hairline border |
| `color-border-strong` | `ink-300` | Input borders, dividers under emphasis |
| `color-text-primary` | `ink-800` | Headings, primary content |
| `color-text-secondary` | `ink-600` | Body copy |
| `color-text-tertiary` | `ink-500` | Meta, timestamps, captions |
| `color-text-disabled` | `ink-400` | Disabled labels |
| `color-text-on-brand` | `#FFFFFF` | Text on filled `vault-600` buttons |
| `color-brand` | `vault-600` | Primary actions, active states, links |
| `color-brand-hover` | `vault-700` | Primary hover/pressed |
| `color-focus-ring` | `vault-500` @ 35% opacity | Focus outline |
| `color-status-good-*` | `sage-*` | Normal metrics, synced state |
| `color-status-warn-*` | `amber-*` | Borderline metrics, pending sync, retries |
| `color-status-critical-*` | `clay-*` | Flagged metrics, sync error, destructive confirm |
| `color-provenance-local-*` | `teal-*` | "On this device" indicator |
| `color-provenance-cloud-*` | `violet-*` | "External API" indicator |

---

## 4. Typography

### 4.1 Typeface

**Primary (UI + data): Inter.** Bundle it with the app rather than relying on system fonts — Segoe UI (Windows), San Francisco (macOS), and Ubuntu's default all render numerals and line-heights differently enough that a lab-value table would visibly shift alignment across platforms. Inter also has genuinely good tabular figures, which matters more here than in most apps.

**Monospace (technical values): JetBrains Mono.** Reserved for a narrow set of uses: masked API keys, base URLs, document content-hashes, and raw extracted values shown in "source" mode. This gives those specific bits of the UI a "this is exact, unprocessed data" signal without touching the rest of the interface.

```
--font-ui:   "Inter", -apple-system, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
--font-mono: "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace;
```

Fallback stack exists only for the brief flash before Inter loads — the app should never actually render in the fallback long-term.

### 4.2 Type scale

Base UI size is **14px**, not the more common 16px-for-web or 13px-for-dense-apps — a deliberate middle point given the audience skews toward reading someone else's (often older relative's) medical data and legibility is non-negotiable. Line-heights are generous (1.4–1.5×) for the same reason.

| Token | Size / Line-height | Weight | Usage |
|---|---|---|---|
| `text-display` | 28px / 36px | 600 | Page-level titles ("Mom's Records") |
| `text-h1` | 22px / 30px | 600 | Section headers (dashboard title) |
| `text-h2` | 17px / 24px | 600 | Card/panel titles |
| `text-h3` | 15px / 22px | 600 | Sub-section labels, table group headers |
| `text-body` | 14px / 21px | 400 | Default body copy |
| `text-body-medium` | 14px / 21px | 500 | Emphasized body copy, active nav labels |
| `text-small` | 13px / 18px | 400 | Secondary/meta text, form helper text |
| `text-caption` | 12px / 16px | 500 | Timestamps, tags, table column headers (uppercase, `letter-spacing: 0.02em`) |
| `text-metric-lg` | 32px / 38px | 700 | Large dashboard metric values — always tabular figures |
| `text-metric-sm` | 20px / 26px | 600 | Inline/compact metric values (chips, tables) |
| `text-mono` | 13px / 20px | 400 | Monospace values (§4.1) |

**Never go below 12px anywhere in the product.** If something doesn't fit at 12px, restructure the layout rather than shrinking type further.

### 4.3 Numeric typography rules

- All numeric values in tables, metric cards, and charts use `font-variant-numeric: tabular-nums` — columns of numbers must align vertically.
- Units (`mg/dL`, `mmHg`) are set in `text-small` / `color-text-tertiary`, directly after the value, never on their own line unless space-constrained.
- Dates use a single consistent format app-wide: `Mar 12, 2024` (never mix with `03/12/2024` or `12 Mar 2024` in the same view).

---

## 5. Spacing & layout

### 5.1 Spacing scale

An 8px base grid with a 4px half-step for tight, in-component spacing. Every margin, padding, and gap in the product comes from this list — no arbitrary values.

| Token | Value | Typical use |
|---|---|---|
| `space-1` | 4px | Icon-to-label gap, chip internal padding |
| `space-2` | 8px | Compact stack spacing, input internal padding (vertical) |
| `space-3` | 12px | Default gap between related controls |
| `space-4` | 16px | Card internal padding (default), gap between form fields |
| `space-5` | 20px | Gap between cards in a grid |
| `space-6` | 24px | Section internal padding |
| `space-7` | 32px | Gap between major sections |
| `space-8` | 40px | Page-level top padding |
| `space-9` | 48px | Empty-state vertical spacing |
| `space-10` | 64px | Rare — large empty states only |

### 5.2 App shell

Three-pane shell, consistent across the app:

```
┌─────────────┬──────────────────────────────────────┬─────────────────┐
│   Sidebar   │              Main content             │  Detail panel   │
│   240px     │                 flexible               │  380px, optional│
│   fixed     │              min 640px                 │  collapsible    │
└─────────────┴──────────────────────────────────────┴─────────────────┘
```

- **Sidebar (240px, fixed):** member switcher at top, folder tree below, "Overviews" and "Settings" pinned at the bottom. Background `color-bg-recessed`.
- **Main content:** the folder/file view or the dashboard. Background `color-bg-app`. Max content width for reading-heavy views (dashboard, an individual overview) is **840px**, centered, even on ultrawide monitors — line length for plain-language summaries matters more than filling the window.
- **Detail panel (380px):** file preview (PDF/image viewer) or a single flag/metric's detail. Collapses to 0 when nothing is selected; content reflows, doesn't just hide behind whitespace.
- Minimum supported window width: **1024px**. Below the comfortable range, the detail panel auto-collapses before the sidebar does.

### 5.3 Grid & density

- Card grids (metrics, provider profiles, overview history) use a responsive grid with a **280px minimum column width**, `space-5` gutter.
- Table rows: 44px height default, 36px in "compact" density (a user-toggleable preference for power users managing large family archives).

---

## 6. Radius

A restrained three-step scale. Nothing above 14px — the product should read as precise, not soft/toy-like.

| Token | Value | Usage |
|---|---|---|
| `radius-sm` | 6px | Buttons, inputs, chips (non-pill), small icon containers |
| `radius-md` | 10px | Cards, panels, dropdown menus |
| `radius-lg` | 14px | Modals, the app's top-level panels |
| `radius-full` | 9999px | Status pills/badges, avatars, toggle switches only |

---

## 7. Elevation & borders

Elevation is communicated primarily through **hairline borders**, with shadow reserved for genuinely floating elements (menus, modals, toasts). This is the single biggest lever for avoiding a "generic AI-generated" look — flat cards with heavy drop shadows are the tell; bordered flat surfaces read as intentional software.

| Token | Spec | Usage |
|---|---|---|
| `border-hairline` | `1px solid color-border-default` | Card outlines, table row dividers, sidebar divider |
| `shadow-xs` | `0 1px 2px rgba(20, 25, 38, 0.04)` | Buttons on press |
| `shadow-sm` | `0 2px 6px rgba(20, 25, 38, 0.06)` | Dropdown menus, popovers |
| `shadow-md` | `0 8px 24px rgba(20, 25, 38, 0.10)` | Modals |
| `shadow-lg` | `0 16px 40px rgba(20, 25, 38, 0.14)` | Toasts, command palette |

Rule of thumb: if an element sits flush in the layout (a card in a grid, a table row), use a border, not a shadow. If it floats above the layout (menu, modal, toast), use a shadow, and skip the border or use it only at 1px for edge definition.

---

## 8. Iconography

- **Icon set:** [Lucide](https://lucide.dev) (open, consistent, outline-only) — matches the app's line-based, unfilled visual language throughout.
- **Style:** outline only, **1.75px stroke**, never mixed with filled icons. The one exception is status dots (§9.3), which are filled by design — they're indicators, not icons.
- **Sizes:** 16px (inline with text-small/caption), 18px (inline with body text, table rows), 20px (buttons, nav items), 24px (empty states, section headers).
- **Color:** icons inherit `color-text-secondary` by default; only take on semantic/brand color when they *are* the meaning (a status icon, an active nav icon, a provenance icon).
- **No emoji in the product UI.** Emoji read as informal in a context (medical records) where the product's whole value proposition is being taken seriously.

---

## 9. Components

### 9.1 Buttons

| Variant | Background | Text | Border | Usage |
|---|---|---|---|---|
| **Primary** | `vault-600`, hover `vault-700` | white | none | One per view. The single most important action ("Analyze", "Save"). |
| **Secondary** | `color-bg-surface` | `color-text-primary` | `border-hairline` | Default action button — most buttons in the app are this. |
| **Ghost** | transparent, hover `ink-100` | `color-text-primary` | none | Toolbar actions, icon-only buttons. |
| **Destructive** | `color-bg-surface`, text `clay-600` | `clay-600` | `1px solid clay-300` | "Delete", "Remove provider" — outlined, not filled, so it doesn't visually compete with Clay's use as a *status* color. Only fills solid `clay-600` in the final confirmation step of a destructive dialog. |

**Sizing:** `sm` 28px height / `text-small`, `md` 34px height / `text-body` (default), `lg` 40px height / `text-body-medium` (used once per view, for the primary action).

**States:** hover (background shift per table above), active/pressed (darken one step further + `shadow-xs`), focus (2px `color-focus-ring` outline, 2px offset), disabled (50% opacity, no hover response), loading (label replaced by a 14px spinner in the button's text color, button width does not change).

Radius: `radius-sm` throughout.

### 9.2 Inputs & forms

- Text input: 34px height, `border-hairline`, `radius-sm`, `space-3` horizontal padding. Focus state: border becomes `vault-500`, plus the standard focus ring.
- Label sits **above** the field, `text-small` + `color-text-secondary`, `space-1` gap below it.
- Helper/error text sits below the field, `text-caption`. Error state: border `clay-600`, helper text `clay-600`, plus a small inline error icon — never color alone.
- **Toggle switch** (e.g., "Encrypt files before upload"): `radius-full` track, `color-bg-recessed`/`ink-300` off, `vault-600` on. Always paired with a visible label to its left/right — never an icon-only toggle for anything security-relevant.
- **Select / dropdown:** same shell as text input, chevron icon right-aligned, opens a `shadow-sm` menu with `radius-md`.
- Masked secrets (API keys): monospace font, value rendered as `sk-••••••••1a2b` (first few + last 4 characters visible) — never fully hidden with generic dots, so a user can visually confirm *which* key is configured without exposing the whole thing.

### 9.3 Badges & status chips

Every status chip is: colored bg tint + colored 1px border + colored text/icon + a text label. `radius-full`, `text-caption` weight, `space-1` icon-to-label gap, horizontal padding `space-2`.

```
●  Normal        → sage-100 bg / sage-300 border / sage-600 text+dot
▲  Borderline    → amber-100 bg / amber-300 border / amber-600 text+dot
✕  Flagged       → clay-100 bg / clay-300 border / clay-600 text+dot
```

Sync-status chips reuse the same visual grammar with different labels: `Synced` (sage), `Pending` (amber, subtle pulse animation), `Error` (clay), `Conflict` (clay, with a distinct icon — a merge glyph — so it's never confused with a plain error at a glance).

### 9.4 Cards

Base card: `color-bg-surface`, `border-hairline`, `radius-md`, `space-4` internal padding, no shadow at rest. On interactive cards (clickable overview history entries, provider profiles), hover adds `shadow-sm` and lifts the border to `color-border-strong` — never a scale/transform effect (too playful for this product).

**Metric card** (dashboard) — the single most-viewed component in the app:
```
┌──────────────────────────────┐
│ LDL Cholesterol      ▲ Flagged│  ← label (text-h3) + status chip, right-aligned
│                               │
│ 142 mg/dL                    │  ← text-metric-lg, tabular nums, unit in text-tertiary
│ Reference: 0–99               │  ← text-small, text-tertiary
│ ╱‾‾‾ (sparkline)              │  ← inline trend sparkline, 2 data points minimum
│ ↑ from 118 (Jan 2023)         │  ← text-caption, direction arrow colored by status
└──────────────────────────────┘
```
Left border accent (3px, inset): colored by status (`sage-600` / `amber-600` / `clay-600`) — a small, consistent tell that lets someone scan a grid of 12 metric cards and immediately locate the flagged ones without reading every label.

### 9.5 Navigation & sidebar

- **Member switcher** (top of sidebar): each family member as a row with a 28px circular avatar (initials on a deterministic-but-muted background color per person, drawn from a fixed 6-color rotation within the Ink/Vault families — never bright/random per-user colors) + name + relationship label in `text-caption`/tertiary.
- **Folder tree** below: standard disclosure triangles, 20px indent per level, folder icon (closed/open state), `text-body` labels. Active item: `vault-50` background, `vault-600` text and icon, no border needed — background contrast alone is sufficient here since it's binary (selected/not), not a status.
- Pinned footer items ("Overviews", "Settings") separated by `border-hairline`, same row treatment.

### 9.6 File list & tree

- Default view: table-style list (not icon grid) — appropriate for documents that need scanning by name/date/type, not visual browsing like photos.
- Columns: Name (with type icon), Date added, Type, Sync status, size. Sortable headers (`text-caption`, uppercase).
- Multi-select via checkbox that appears on row hover / when any row is selected (doesn't occupy space otherwise).
- Drag-and-drop target state: entire drop zone gets a `vault-500` dashed 2px border + `vault-50` background tint + a centered "Drop files to add to *Bloodwork*" label — always names the destination folder explicitly, given the cost of a misplaced medical document.

### 9.7 Tables

Header row: `color-bg-recessed`, `text-caption` labels, `border-hairline` bottom. Body rows: `border-hairline` between rows only (no vertical lines), hover state `color-bg-hover`. Numeric columns right-aligned with tabular figures; text columns left-aligned.

### 9.8 Tabs

Underline style, not pill/segmented — reads as calmer and more editorial, fits the "reading a report" mental model of the dashboard. Active tab: `color-text-primary` + 2px `vault-600` underline. Inactive: `color-text-secondary`, underline transparent until hover (`ink-300`).

### 9.9 Modals & dialogs

`radius-lg`, `shadow-md`, max-width 480px for confirmations / 640px for content dialogs (e.g., the pre-analysis "here's what will run" confirmation). Title `text-h1`, body `text-body`/secondary, actions bottom-right (secondary action left of primary, per platform convention). A scrim of `ink-900` at 40% opacity behind the modal.

The **pre-analysis confirmation dialog** (PRD §5.3) is a first-class, specific pattern, not a generic modal — see §11.1 for its exact contents.

### 9.10 Toasts

Bottom-right stack, `shadow-lg`, `radius-md`, `color-bg-surface`, max-width 360px, auto-dismiss 5s (persistent for errors, until manually dismissed). Left edge 3px accent colored by type (sage/amber/clay/vault-neutral for plain info).

### 9.11 Tooltips

Dark-surface tooltips even in light mode (`ink-800` background, white text, `radius-sm`, `text-caption`) — a deliberate inversion so tooltips are unambiguously "temporary overlay," distinct from the app's own light cards. 4px offset from trigger, small pointer caret.

### 9.12 Progress & loading

- **Indeterminate spinner:** 1.5px stroke, `color-brand`, used only for genuinely short waits (<2s, e.g., "Test connection").
- **Progress bar:** 4px height, `radius-full`, `ink-200` track / `vault-600` fill — used for extraction/analysis runs where duration is somewhat predictable ("Extracting 12 of 20 documents…").
- **Skeleton loading:** for cached-overview and dashboard loads, use skeleton blocks (`ink-100`, subtle shimmer) shaped like the eventual content, not a centered spinner — since the PRD's own performance bar is "<300ms" for cache hits, this mostly appears during the very first (uncached) analysis.

### 9.13 Empty states

Centered, `space-9` vertical padding: 24px outline icon in `ink-400`, `text-h2` headline in `color-text-primary`, one line of `text-body`/secondary explaining what goes here, one primary or secondary button as the next action. No decorative illustrations — an outline icon is enough; full illustrations skew the product younger/more consumer than its audience.

### 9.14 Persistent disclaimer

A slim, permanent bar — not a dismissible banner, not a modal a user has to click through repeatedly (PRD §8 requires it be unavoidable but this shouldn't mean naggy). Placement: bottom of the dashboard/overview view, `text-caption`, `color-text-tertiary`, `color-bg-recessed`, a small info-outline icon:

> ⓘ These summaries are informational only and not medical advice. Discuss findings with a healthcare provider.

Same treatment, same wording, every time an overview is shown or exported (including in the exported PDF footer) — consistency here is part of what makes it feel like policy rather than legal-team clutter.

---

## 10. Data visualization

Charts are built with Recharts per the PRD stack. Visual rules, independent of library:

- **Line charts (trends):** one line per metric, `vault-600` for the primary/selected metric, `ink-400` for comparison/context lines. 2px stroke, no fill/area under the line (area fills read as "volume," which isn't the right metaphor for a single lab value over time). Data points marked with small filled circles (4px), colored by that point's status (sage/amber/clay) rather than the line's base color — this is how a single trend line visually shows *when* a value crossed into flagged range, without extra annotation clutter.
- **Reference range:** rendered as a soft horizontal band (`ink-100` fill, no border) behind the line, so "in range" vs "out of range" is a spatial fact, not something the user has to compute from the axis labels.
- **Gridlines:** horizontal only, `ink-100`, 1px. No vertical gridlines — dates are legible enough from axis ticks.
- **Axes:** `text-caption`, `color-text-tertiary`, tick lines removed (rely on gridlines).
- **Tooltips on hover:** follow the standard tooltip style (§9.11) but include the date, exact value + unit, and status chip for that point.
- **Sparklines** (inside metric cards, §9.4): same rules at 1/4 scale, no axes/gridlines/tooltip — purely a shape-of-the-trend indicator, the full chart lives in the metric's detail view.
- **Never use a pie/donut chart for clinical data** — proportions of a whole are almost never the right way to read lab metrics, and it invites decorative use.

---

## 11. Domain-specific patterns

### 11.1 The provenance indicator — "on this device" vs. "leaves this device"

This is the app's signature UI element, directly answering the PRD's requirement for a "clear, persistent UI indicator" (§5.2) distinguishing local from cloud execution. It appears in exactly three places, always with identical visual grammar so it's instantly recognizable:

1. **In the provider picker**, next to each profile.
2. **In the pre-analysis confirmation dialog**, as the most prominent line in the dialog — above the file list, not below it.
3. **On every generated overview**, as a small permanent tag near its title (so reopening old history still shows how it was produced).

**Visual spec:**
```
🛡 On this device        (teal-100 bg, teal-300 border, teal-600 icon+text)
☁ Sent to OpenAI (GPT-4o) (violet-100 bg, violet-300 border, violet-600 icon+text)
```
Pill shape (`radius-full`), always paired with the specific provider/model name when cloud (never just "External" — name the destination), `text-small`/medium weight so it doesn't get lost among lighter secondary text.

**Pre-analysis confirmation dialog contents, in order:**
1. Provenance pill (as above) — first thing seen.
2. "This will analyze **12 files** in *Bloodwork → 2024*" (scope, in plain language, with the folder path).
3. Estimated cost/tokens (cloud only) — `text-small`, tertiary.
4. Collapsed-by-default file list ("View 12 files").
5. Primary button: **"Run analysis"** (or **"Run locally"** when provenance is local — the button label itself restates the provenance choice as a final confirmation).

### 11.2 Metric status thresholds — visual, not just data-driven

Because the LLM output (PRD §9) already carries a `status` field (`normal`/`borderline`/`flagged`), the UI's only job is to render that faithfully and consistently — never re-derive or visually soften/exaggerate it. One mapping, everywhere: `normal → sage`, `borderline → amber`, `flagged → clay`. If `confidence: "low"` accompanies a result, add a small dotted-outline treatment to the status chip (not a new color) plus a tooltip explaining why confidence is low — confidence is a modifier on status, not a fourth status color.

### 11.3 Sync status iconography

Distinct icons (not just color) for each Drive-sync state, shown as a small 14px indicator on file rows and folder rows:
- **Synced:** filled sage dot.
- **Pending:** amber dot with a subtle 1.5s pulse (respects `prefers-reduced-motion` — becomes static if set).
- **Error:** clay exclamation.
- **Conflict:** clay icon, but a distinct merge/branch glyph — this is the one state that needs a user decision, so it should never be mistaken for a passive error at a glance.

### 11.4 Provider profile card (Settings)

Card per profile, `radius-md`, showing: profile name, provenance pill (§11.1), model name (monospace), masked key or base URL (monospace, masked per §9.2), a "Test connection" secondary button, and a small "Default" tag on whichever profile is set as default. Cloud and local profiles are visually distinguished *only* through the provenance pill and the field shown (API key vs. base URL) — the card shell itself is identical, reinforcing that they're two equally first-class options, not "the real one and the fallback."

### 11.5 Overview history card

Shown in the "Overviews" library: scope name + date range, provenance pill, a mini status summary (`● 8  ▲ 2  ✕ 1` — count of normal/borderline/flagged metrics, using the same dot glyphs as §9.3), generated date, and a version indicator (`v2 · previous: Mar 2024`) when it's a re-run of an earlier scope.

---

## 12. Motion & interaction

Motion is used to clarify state changes, never to delight for its own sake — no springs, no bounce, no overshoot.

| Interaction | Duration | Easing |
|---|---|---|
| Hover (color/background) | 100ms | ease-out |
| Button press | 80ms | ease-out |
| Panel/detail-pane open-close | 200ms | cubic-bezier(0.2, 0, 0, 1) |
| Modal enter | 180ms | ease-out, fade + 8px translate-up |
| Toast enter/exit | 200ms | ease-out, slide from bottom-right |
| Skeleton shimmer | 1.4s loop | linear |

All motion respects `prefers-reduced-motion: reduce` by dropping translate/scale components and keeping only opacity crossfades, with pulses (§11.3) becoming static.

---

## 13. Accessibility standards

- **Contrast:** every text/background pairing in §3.6 meets WCAG AA (4.5:1 body text, 3:1 for `text-h1`/`display` sizes and icons). Status colors are chosen at a value-step that holds AA against both their own tint background *and* against `color-bg-surface`.
- **Never color alone:** every status, sync, and provenance indicator pairs color with an icon and a text label (already specified per-component above) — this is a hard requirement given the audience includes colorblind users reading their own flagged lab values.
- **Focus visibility:** every interactive element has a visible 2px focus ring (`color-focus-ring`) with 2px offset; never `outline: none` without a replacement.
- **Keyboard navigation:** folder tree, file table, and metric-card grid are all fully arrow-key/tab navigable; the pre-analysis dialog and all destructive confirmations are operable without a mouse.
- **Screen readers:** every chart has an adjacent, visually-hidden data table equivalent (metric, value, unit, status, date) — trend information should never exist only as pixels.
- **Minimum text size:** 12px floor, as noted in §4.2, with 14px as the practical default for anything data-bearing.

---

## 14. Dark mode

Dark mode is secondary but fully specified, not an inverted afterthought. Base surfaces are a warm-neutral-avoiding, slightly blue charcoal (never pure black, which causes halation around white text and reads harsher than intended).

| Semantic token | Dark value |
|---|---|
| `color-bg-app` | `#10141F` |
| `color-bg-surface` | `#171C29` |
| `color-bg-recessed` | `#0C0F17` |
| `color-bg-hover` | `#202638` |
| `color-border-default` | `#262D40` |
| `color-border-strong` | `#333C54` |
| `color-text-primary` | `#EDEFF5` |
| `color-text-secondary` | `#AEB5C7` |
| `color-text-tertiary` | `#7C859C` |
| `color-brand` | `#6FA0E6` *(vault-400, brightened for dark bg)* |
| `sage` (status good) | text/icon `#4FCB92`, bg tint `#12291F`, border `#255A41` |
| `amber` (status warn) | text/icon `#E8B95B`, bg tint `#2E2412`, border `#5C4A22` |
| `clay` (status critical) | text/icon `#E28A78`, bg tint `#301D18`, border `#5C3A30` |
| `teal` (local) | text/icon `#4FC4C4`, bg tint `#0F2626`, border `#245252` |
| `violet` (cloud) | text/icon `#B896E8`, bg tint `#241A34`, border `#4B3768` |

Rules carried over unchanged: elevation is still primarily border-based (borders lighten instead of darken to read as "raised"); shadows in dark mode use pure black at lower opacity (`rgba(0,0,0,0.4–0.6)`) since dark-on-dark shadows need more contrast to register. Reference-range chart bands (§10) switch to `#1C2333` in dark mode.

---

## 15. Anti-patterns — explicitly avoid

Called out directly because they are the fastest way for this product to look like generic AI-generated output rather than considered software:

- **No purple/blue gradients** on buttons, headers, or cards. Violet exists in this system for exactly one meaning (§3.5) and never as a decorative gradient partner to Vault blue.
- **No glassmorphism or frosted-blur panels.** Surfaces are opaque and flat, differentiated by hairline borders (§7).
- **No drop shadows on flush/grid elements** (cards in a grid, table rows) — border only. Reserve shadow for floating elements.
- **No saturated alarm-red.** Clay (§3.4) is the only "critical" color in the product; it is muted by design so a flagged lab value informs rather than triggers panic.
- **No decorative illustrations or emoji in empty states, onboarding, or status messaging** — an outline icon (§8) plus clear copy is enough.
- **No bouncy/spring motion** anywhere (§12) — this is a trust product, not a consumer social app.
- **No mixing filled and outline icon styles.** Lucide, outline, 1.75px stroke, everywhere except status dots.
- **No radius above 14px**, and no fully-rounded ("pill") shapes except badges, avatars, and toggles (§6) — avoid a soft/bubbly, consumer-app read.
- **Don't reuse Sage/Amber/Clay for anything except clinical status.** Don't reuse Teal/Violet for anything except data provenance. A palette where every hue has exactly one job is what keeps a dashboard with a dozen simultaneous indicators (status + sync + provenance) legible instead of noisy.
- **Don't make the disclaimer (§9.14) a dismissible interruption.** It's ambient, permanent, and quiet — treating it as a nag will train users to stop reading it, which defeats its purpose.

---

## 16. Design tokens — CSS reference

Ready to drop into a global stylesheet; `[data-theme="dark"]` overrides the same custom properties.

```css
:root {
  /* Neutral */
  --ink-25: #FBFBFD;  --ink-50: #F6F7FA;  --ink-100: #EEF0F5;
  --ink-200: #E1E4EC; --ink-300: #CBD0DC; --ink-400: #9CA4B6;
  --ink-500: #6F7891; --ink-600: #525B72; --ink-700: #3A4257;
  --ink-800: #242B3D; --ink-900: #141926;

  /* Brand */
  --vault-50: #EEF3FC; --vault-100: #DCE8F9; --vault-200: #B7D0F2;
  --vault-300: #8AB2E8; --vault-400: #5991DB; --vault-500: #3873C9;
  --vault-600: #2C5CA8; --vault-700: #234780; --vault-800: #1B3760;

  /* Status */
  --sage-100: #E6F4EC;  --sage-300: #A8D9BC;  --sage-600: #1E8A57;
  --amber-100: #FBF1DC; --amber-300: #EBC876; --amber-600: #A6720F;
  --clay-100: #F9EAE7;  --clay-300: #E4A99E;  --clay-600: #B54A3A;

  /* Provenance */
  --teal-100: #E1F1F1;   --teal-300: #9FD3D3;   --teal-600: #146B72;
  --violet-100: #F1ECFA; --violet-300: #CBAFEA; --violet-600: #6B46A8;

  /* Semantic */
  --color-bg-app: var(--ink-25);
  --color-bg-surface: #FFFFFF;
  --color-bg-recessed: var(--ink-50);
  --color-bg-hover: var(--ink-100);
  --color-border-default: var(--ink-200);
  --color-border-strong: var(--ink-300);
  --color-text-primary: var(--ink-800);
  --color-text-secondary: var(--ink-600);
  --color-text-tertiary: var(--ink-500);
  --color-text-disabled: var(--ink-400);
  --color-brand: var(--vault-600);
  --color-brand-hover: var(--vault-700);
  --color-focus-ring: rgba(56, 115, 201, 0.35);

  /* Typography */
  --font-ui: "Inter", -apple-system, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  --font-mono: "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace;

  /* Spacing */
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px; --space-4: 16px;
  --space-5: 20px; --space-6: 24px; --space-7: 32px; --space-8: 40px;
  --space-9: 48px; --space-10: 64px;

  /* Radius */
  --radius-sm: 6px; --radius-md: 10px; --radius-lg: 14px; --radius-full: 9999px;

  /* Elevation */
  --shadow-xs: 0 1px 2px rgba(20, 25, 38, 0.04);
  --shadow-sm: 0 2px 6px rgba(20, 25, 38, 0.06);
  --shadow-md: 0 8px 24px rgba(20, 25, 38, 0.10);
  --shadow-lg: 0 16px 40px rgba(20, 25, 38, 0.14);

  /* Motion */
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --duration-fast: 100ms;
  --duration-base: 180ms;
  --duration-panel: 200ms;
}

[data-theme="dark"] {
  --color-bg-app: #10141F;
  --color-bg-surface: #171C29;
  --color-bg-recessed: #0C0F17;
  --color-bg-hover: #202638;
  --color-border-default: #262D40;
  --color-border-strong: #333C54;
  --color-text-primary: #EDEFF5;
  --color-text-secondary: #AEB5C7;
  --color-text-tertiary: #7C859C;
  --color-brand: #6FA0E6;
  --color-brand-hover: #8AB2E8;
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.45);
  --shadow-md: 0 8px 28px rgba(0, 0, 0, 0.55);
  --shadow-lg: 0 16px 44px rgba(0, 0, 0, 0.6);

  --sage-100: #12291F;  --sage-300: #255A41;  --sage-600: #4FCB92;
  --amber-100: #2E2412; --amber-300: #5C4A22; --amber-600: #E8B95B;
  --clay-100: #301D18;  --clay-300: #5C3A30;  --clay-600: #E28A78;
  --teal-100: #0F2626;   --teal-300: #245252;   --teal-600: #4FC4C4;
  --violet-100: #241A34; --violet-300: #4B3768; --violet-600: #B896E8;
}
```

---

*This document governs visual and interaction design decisions for Family Medical Vault. Component-level implementation details (React component APIs, prop names) belong in the engineering codebase, not here — this file is the contract those components should be built against.*
