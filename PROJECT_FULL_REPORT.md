# NexDrive Full Project Report

## 1. Project Overview
NexDrive is a cloud file management and sharing platform built with Next.js (App Router), Convex, Clerk, React, TypeScript, and Tailwind CSS. It supports both personal and organization workspaces, secure file handling, share links with expiry, activity logs, trash lifecycle management, and responsive UI flows for desktop and mobile.

Core goal: provide a lightweight Google Drive style experience for individuals and small teams with modern full-stack architecture.

## 2. Objectives
- Build secure authentication and workspace-aware authorization.
- Enable upload, organize, search, sort, preview, and share operations.
- Separate personal and organization data boundaries.
- Provide soft-delete and automatic cleanup for lifecycle safety.
- Offer an intuitive, fast dashboard UI with theme support.

## 3. Tech Stack
- Frontend framework: Next.js 16.2.3 (App Router)
- UI: React 19, Tailwind CSS 4, shadcn/ui primitives, Sonner
- Authentication and orgs: Clerk
- Backend and storage: Convex (database, file storage, queries, mutations, cron)
- Language/tooling: TypeScript, ESLint

## 4. High-Level Architecture
- Client layer (`app/`, `components/`): dashboard, landing page, share page, upload dialog, navigation/header, theme provider.
- API layer (`app/api/`): AI route and Clerk webhook route.
- Server/business layer (`convex/`): schema, file/folder/share/activity operations, user sync, scheduled cleanup.
- Auth and access control: Clerk session + Convex-side authorization checks.

## 5. Project Structure

```text
app/
  _components/
    convex-client-provider.tsx
    header.tsx
    theme-provider.tsx
  api/
    ask-ai/route.ts
    clerk/webhook/route.ts
  dashboard/
    _components/upload-button.tsx
    page.tsx
  share/[token]/page.tsx
  globals.css
  layout.tsx
  middleware.ts
  page.tsx

components/ui/
  button.tsx
  dialog.tsx
  form.tsx
  input.tsx
  label.tsx
  sonner.tsx

convex/
  _generated/
  auth.config.ts
  crons.ts
  files.ts
  schema.ts
  users.ts

lib/
  utils.ts

config:
  next.config.ts
  tailwind.config.ts
  tsconfig.json
  eslint.config.mjs
  postcss.config.mjs
```

## 6. Functional Modules

### 6.1 Authentication and Access
- Clerk-managed sign up/sign in/session state.
- Middleware protection for private routes.
- Supports personal workspace and organization workspace flows.
- Header account menu supports switching context and org management.

### 6.2 Dashboard Workspace
- Sections include recent, starred, activity, folders, media/document categories, and trash.
- Search, sort (newest/oldest/name asc/name desc), list/grid mode, selection mode, multi-select actions.
- Responsive behavior for desktop and mobile.

### 6.3 File Upload and Classification
- Upload UI supports title, optional folder destination, and file picker/drag-drop flow.
- Files categorized into image/pdf/document/spreadsheet/audio/video.
- Context-aware save target: active organization if selected, otherwise personal workspace.
- Current practical UX limit around large files (chunked upload not yet implemented).

### 6.4 File Operations
- Create/upload metadata entry.
- Rename, favorite/unfavorite, download.
- Share via tokenized links with expiry.
- Trash, restore, permanently delete.
- Preview support for image, video-style cards, PDF embeds where browser supports.

### 6.5 Folder Operations
- Create folder, rename, favorite/unfavorite.
- Trash/restore/permanent delete.
- Deleting folder detaches files rather than recursively deleting file data.

### 6.6 Sharing System
- Public route: `/share/[token]`.
- Share links include expiry and revocation behavior.
- Shared page handles valid, expired, revoked, and missing token states.

### 6.7 Activity and Storage Metrics
- Tracks actions like uploaded, renamed, trashed, restored, shared, revoked_share.
- Sidebar storage analytics include used storage, usage ratio, file count, active share count.

### 6.8 Trash Lifecycle + Auto Cleanup
- Soft delete fields (`shouldDelete`, `deletedAt`) for files/folders.
- Cron process permanently removes old trashed files after retention window.

## 7. Data Model (Convex)

### Tables
- `users`: user profile sync from auth layer.
- `files`: core file metadata and ownership/workspace attributes.
- `folders`: folder metadata and soft-delete/favorite flags.
- `shareLinks`: tokenized share records with expiry/revocation.
- `activityLogs`: workspace action history.

### Key relationships
- File -> optional Folder (`folderId`).
- ShareLink -> File (`fileId`).
- Records scoped by `orgId` (org workspace) or user ownership (personal workspace).

## 8. Backend Capability Map
- File/folder mutations: create, rename, favorite toggle, trash, restore, permanent delete.
- Sharing: create link, fetch shared file, list active links, revoke link.
- Query services: files/folders/activity/storage stats/user role checks.
- User sync services: current user sync + listing helpers.
- Scheduled ops: permanent cleanup of old trashed content.

## 9. Security and Access Control
- Route-level protection via middleware.
- Workspace-aware access checks in Convex before read/write operations.
- Personal mode restricts users to their own data.
- Organization mode enforces org-scoped permissions and role-based behavior.

## 10. UI/UX Characteristics
- Modern dashboard workflow with multi-mode layouts.
- Reusable UI primitives and toast feedback.
- Theme support with persisted user preference.
- Mobile-friendly navigation and interaction model.

## 11. Current Limitations
- Chunked/resumable upload not implemented for large files.
- Limited true visual thumbnails for non-image assets.
- Clerk webhook flow verifies events but has limited downstream write automation.
- Shared previews depend on browser/file support.
- Advanced collaboration metadata (comments, version history, mention workflows) not yet present.

## 12. Best Future Enhancements (Recommended for Report)

### Priority 1 (High Impact / Near-Term)
1. Chunked + resumable upload pipeline
- Support large files reliably with pause/resume and progress recovery.
- Add backend multipart handling and client retry strategy.

2. Granular RBAC for organizations
- Introduce role tiers (owner/admin/editor/viewer).
- Restrict delete/share/manage actions by role policy matrix.

3. Advanced search and filters
- Add type/date/owner/folder filters and full-text indexing for names/metadata.
- Persist user filter presets for faster retrieval.

4. File versioning and restore points
- Keep historical versions per file with rollback.
- Surface version timeline in file details modal.

### Priority 2 (Product Maturity)
1. Real thumbnails + media processing workers
- Generate previews for docs/videos/PDF pages server-side.
- Cache variants for fast dashboard rendering.

2. Audit trail and compliance logs
- Add immutable admin audit stream for sensitive actions.
- Export logs (CSV/JSON) for governance and support workflows.

3. Collaborative workspace features
- Add comments, @mentions, and shared folders with explicit member access.
- Add notification center for share/revoke/comment events.

4. Storage and billing readiness
- Per-plan limits, overage controls, and usage alerts.
- Stripe-backed subscription and quota upgrades.

### Priority 3 (Scale + Reliability)
1. Background queues and retries
- Offload heavy tasks (thumbnailing, virus scan, webhook fanout) to job workers.

2. Observability and SLO monitoring
- Structured logs, traces, metrics, error budget dashboards.
- Alerting for failed uploads, broken share links, cron failures.

3. Disaster recovery posture
- Backup/restore procedures for metadata and storage references.
- Recovery runbooks and periodic restore drills.

4. Performance hardening
- Cache strategy for high-frequency queries.
- Lazy-load heavy UI modules and optimize re-render hotspots.

## 13. Suggested Implementation Roadmap
- Phase 1 (0-4 weeks): chunked upload, RBAC baseline, filter/search improvements.
- Phase 2 (4-8 weeks): versioning, thumbnails, audit logs.
- Phase 3 (8-12+ weeks): collaboration suite, billing/quotas, observability hardening.

## 14. Key Outcome Statement
NexDrive already provides a strong end-to-end file workspace foundation. With the enhancements above, it can evolve into a production-grade collaborative storage platform with stronger scalability, governance, and enterprise-readiness.
