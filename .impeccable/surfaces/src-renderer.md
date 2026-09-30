---
version: 1
slug: "src-renderer"
primary_target: "src/renderer"
related_targets: []
---

# MedBuddy renderer surface brief

## Scope
Operate surface for the complete MedBuddy Electron renderer. The redesign covers the persistent shell, home dashboard, member/folder navigation, document explorer, previews, overviews, overview history, health timeline, chat assistant, provider settings, sync and diagnostics overlays, empty states, loading states, and both light and dark themes. Product behavior, data claims, terminology, and existing workflows remain intact.

## Audience, job, and constraints
The user is managing a family medical archive and needs to orient themselves quickly, find records, read a saved overview, and choose the correct local or cloud execution boundary. The interface must serve a reading-first caregiver while retaining efficient archive tools. The renderer is packaged for desktop operating systems, with a practical minimum window and resizable sidebar. Long names, many records, OCR progress, provider failure, empty folders, cached reports, citations, and reduced-motion preferences are first-class states.

## Direction
Calm clinical cockpit: a quiet, high-legibility operations desk built from clinical chart dividers, lab requisition bands, monitoring readouts, and archival index tabs. The primary move is a clear state-led workspace: active profile, folder, data locality, and next action are visible before decorative context. Light mode is the daytime reading environment: soft mineral canvas, white report surfaces, graphite ink, and a single cobalt action hue. Dark mode is the evening console: ink-blue canvas, raised slate surfaces, luminous but restrained cobalt, and brighter semantic signals. Teal is reserved for local provenance, violet for external execution, and sage/amber/clay for clinical states.

## Direction contract

THESIS: A family medical vault should feel like a calm clinical cockpit, not a dashboard assembled from cards: every view answers where I am, what the data says, and whether anything leaves this device.

OWN-WORLD: Mineral neutrals, paper-white report planes, graphite dividers, cobalt selection bands, compact clinical labels, tabular figures, and restrained state color. The signature is a thin cobalt “reading rail” that connects the active profile and scope to the current view without turning every surface into a card.

STORY: The user enters a private workspace, sees the active family member and document volume, moves into a folder, reviews extraction and analysis state, and leaves with a source-traceable report or a question for a clinician. The interface makes privacy a navigational fact, not a footnote.

FIRST VIEWPORT: A compact app header names the active profile and scope, a low-contrast status strip reports local/cloud execution and sync, and the first content plane is a two-column orientation view: a direct “next best action” workflow rail on the left and recent health syntheses on the right. The sidebar remains a stable, resizable index. The primary action is contextual and appears once per view.

FORM: Candidate 7 from the grounded direction catalog; the visual grammar combines clinical chart indexing, laboratory bands, and a monitoring desk while rejecting decorative AI gradients, glass panels, and generic equal-weight KPI grids.

## Signature interaction
Selecting a profile, folder, report, or provenance state moves a single cobalt reading rail through the shell and briefly reveals the scope context in the header. The rail is a low-motion state cue, not a page-load animation.

## Cross-surface reach
The same surface ladder, rail, labels, state vocabulary, compact tables, and focus treatment carry from navigation to every screen. Dense archive views preserve their density; reading views gain more air without changing the navigation model.

## Unresolved decisions
The final font asset, exact spacing calibration, and any additional illustration should be judged from the built light and dark renders. Do not invent clinical claims, customer proof, or performance numbers.

## Design seed
Seed key: d6e903c3. Assigned direction: candidate 7, calm clinical cockpit.
Challenger verdicts: industrial streetwear — competitive on bold state labels, declined as a world because its hazard grammar would overpower clinical data; raise the discipline of unmistakable active-state labeling. Gravity-rain garden — declined; no product clarity. International airport wayfinding — competitive on decision-point navigation, declined as a world because its yellow sign language would hijack status meaning; raise the discipline of one next decision at a time. Factory records catalog — competitive on indexed source identity, declined because it obscures reading comfort; raise the discipline of compact source and date indexing. Pixel arcade — declined; no product clarity. Printing darkroom — competitive on staged reveal, declined because its amber ground conflicts with neutral reading light; raise the discipline of a deliberate reveal moment. Assignment raised with: active-state labeling, one-next-decision wayfinding, source indexing, and a single staged reveal.
