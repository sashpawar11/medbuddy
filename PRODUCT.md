# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

MedBuddy is for a person managing their own medical records alongside records for children, partners, and aging parents. The primary working context is a desktop session used to scan records, understand a family member's health history, and prepare useful questions before a healthcare visit. The interface also needs to remain efficient for repeated organization, analysis, and archive management.

The selected product context for this redesign is a balanced family vault: reading and comprehension are the default, while power-user tools remain available without taking over the primary path.

## Product Purpose

MedBuddy organizes sensitive medical documents by family member and folder, extracts and organizes information from those documents, runs opt-in local or cloud AI analysis, and renders cached, source-traceable health overviews and longitudinal timelines. Success means a user can find the right record, understand what changed, and take a useful next step without losing control of where their data goes.

## Positioning

MedBuddy is a local-first family medical vault with explicit boundaries around every cloud boundary. It combines personal document organization, structured analysis, provenance-aware AI execution, cached reports, and source traceability in one desktop workflow rather than presenting a generic chat interface or a disconnected document store.

## Operating Context

- Electron desktop application packaged for Windows, macOS, and Linux.
- React and TypeScript renderer with a main-process IPC boundary.
- Users import PDFs, images, and scans into family-member and folder structures.
- Users review extracted text, tags, biomarker metrics, trends, findings, discussion points, and source documents.
- Users can choose a local provider such as Ollama or LM Studio, or an explicitly selected BYOK cloud provider.
- Users can revisit cached analyses without re-running a model and can export reports for clinical conversations.
- Optional Google Drive backup can be enabled with visible scope, status, and encryption controls.
- Keyboard shortcuts exist for sidebar collapse, diagnostics, chat, and closing overlays.

## Capabilities and Constraints

- Family-member, folder, and document management.
- Multi-select file organization, OCR/extraction status, previews, and document-level actions.
- File, selection, and folder-scoped analysis with provider selection and pre-analysis confirmation.
- Structured analysis with metrics, statuses, findings, recommendations, discussion points, confidence, and source documents.
- Cached overview history and re-analysis versioning.
- Health timeline / chronicle with report, biomarker, flag, anomaly, and milestone events.
- Profile-scoped chat with cited source chunks and streaming responses.
- Local and cloud provider profiles with connection testing.
- Optional Google Drive synchronization and restore.
- Sensitive medical content must remain local by default; any external LLM or Drive transfer must be explicit and visible.
- Outputs are informational and not medical advice; the disclaimer must remain persistent in relevant views.
- The product must work with real-world long filenames, varied record types, missing data, OCR delays, provider failures, offline local models, and cached reports.
- Open product decisions remain recorded in the existing PRD, including conflict resolution, stronger encryption details, app lock, and some timeline expansion scope.

## Brand Commitments

- Product name: MedBuddy.
- The product is composed, trustworthy, and exact rather than playful, hype-driven, or clinical-cold.
- Privacy and data locality are visible product features, not hidden implementation details.
- Local and cloud execution are distinct states and must be named clearly wherever a choice is made.
- Medical content should be presented with restraint and respect; no invented clinical claims or outcomes.

## Evidence on Hand

- Product requirements: `docs/PRD Family Medical Vault.md`.
- Product overview and usage guidance: `README.md`.
- Existing design requirements: `docs/Designv2.md`.
- Additional chat requirements: `docs/spec-chat-with-profile-documents.md`.
- Implemented renderer entry and shell: `src/renderer/App.tsx`.
- Implemented feature surfaces: `src/renderer/components/`.
- Shared domain model: `src/shared/types.ts`.
- Existing visual implementation: `src/renderer/index.css` and `tailwind.config.js`.
- No customer testimonials, case studies, performance benchmarks, or verified medical outcome evidence are present in the repository. Future UI must not fabricate them.

## Product Principles

- Legibility outranks decoration for every record, value, date, dosage, and finding.
- Show the data boundary before asking the user to trust an AI or sync action.
- Keep the common path calm and scannable while preserving powerful archive and analysis controls.
- Prefer durable, cached work and source traceability over novelty or repeated processing.
- Make states recoverable: users should understand what is loading, missing, failed, synced, or ready to act on.

## Accessibility & Inclusion

The interface must support stressed or tired readers, older family members' records, color-blind users, keyboard navigation, visible focus states, screen-reader names, reduced-motion preferences, and readable numeric alignment. Status and provenance must never rely on color alone. Body text and controls should meet WCAG AA contrast, and interactive targets should remain usable in desktop layouts and at supported reduced window widths.
