# NexDrive Project Report

NexDrive is a cloud file manager built with Next.js, Clerk, Convex, React, TypeScript, and Tailwind CSS. It provides personal workspaces, organization workspaces, file management, sharing, activity tracking, trash recovery, and role-based team access.

## Objective

The goal of NexDrive is to provide a simple Google Drive style experience where users can upload, organize, preview, share, and manage files in either a personal workspace or an organization workspace.

## Tech Stack

- Next.js 16 App Router for the frontend and API routes.
- React 19 and TypeScript for the UI.
- Tailwind CSS and shadcn-style primitives for styling.
- Clerk for authentication, users, organizations, invitations, and roles.
- Convex for database, file storage, queries, mutations, and scheduled cleanup.
- Sonner for toast feedback.

## Main Features

- User authentication with Clerk.
- Personal workspace for every user.
- Organization workspace with admin/member roles.
- Team modal for organization members.
- Admins can invite users, revoke invites, remove members, and change roles.
- Members can view team members only, without admin powers.
- File upload, preview, rename, favourite, download, and delete.
- Folder creation, rename, favourite, trash, restore, and delete.
- Search, sort, grid/list view, and bulk selection.
- Share links with expiry and revoke support.
- Trash view with restore, permanent delete, and Delete all.
- Activity tracking and storage usage.
- Workspace-aware access control in Convex.

## Project Structure

```text
app/
  _components/
    convex-client-provider.tsx
    header.tsx
    theme-provider.tsx
  api/
    ask-ai/
    clerk/webhook/
    organization/
  dashboard/
    _components/
      upload-button.tsx
    _features/
      organization-workspace/
      delete.tsx
      feature-types.tsx
      file-feature-filters.tsx
      folder-actions.tsx
      rename.tsx
      selection.tsx
      share.tsx
      sidebar.tsx
      sorting.tsx
      trash.tsx
      upload.tsx
      view-mode.tsx
    page.tsx
  share/[token]/
  tasks/
  globals.css
  layout.tsx
  page.tsx

components/ui/
convex/
lib/
public/
```

## Important Files

- `app/dashboard/page.tsx`: main dashboard coordinator.
- `app/dashboard/_components/upload-button.tsx`: upload logic and Convex file creation.
- `app/dashboard/_features/organization-workspace/`: complete organization workspace feature.
- `app/api/organization/`: server routes for team data, invites, and invite revoke.
- `app/_components/header.tsx`: header, account menu, workspace switcher, organization profile.
- `app/_components/convex-client-provider.tsx`: Clerk and Convex provider setup.
- `convex/files.ts`: file, folder, share, activity, trash, and permission logic.
- `convex/schema.ts`: database schema.
- `convex/users.ts`: user sync logic.
- `convex/crons.ts`: scheduled cleanup tasks.

## Organization Workspace

The organization workspace code is grouped here:

```text
app/dashboard/_features/organization-workspace/
```

- `team-dialog.tsx`: Team button, Team modal, admin controls, and member read-only view.
- `api.ts`: client helpers for organization team and invitation API calls.
- `use-organization-invite-handoff.ts`: accepts pending invites and redirects users into the organization workspace.
- `types.ts`: organization team types.
- `utils.ts`: member name, role, and join-date helpers.
- `index.ts`: exports the org workspace feature.

Server routes:

- `app/api/organization/team/route.ts`: returns team members and pending invites.
- `app/api/organization/invitations/route.ts`: creates organization invites.
- `app/api/organization/invitations/[invitationId]/route.ts`: revokes pending invites.

## Role Behavior

- Personal workspace: only the owner can manage their files.
- Organization admin: can upload, manage files, invite members, remove members, and change roles.
- Organization member: can use the organization workspace and view the Team modal, but cannot invite, remove, or change roles.

## Data Model

Convex tables:

- `users`: synced user profiles.
- `files`: file metadata, storage references, workspace ownership, favourites, and trash state.
- `folders`: folder metadata, workspace ownership, favourites, and trash state.
- `shareLinks`: public share tokens with expiry and revoke state.
- `activityLogs`: user and workspace activity history.

## Run Locally

```powershell
npm run dev
```

Open:

```text
http://localhost:3000
```

## Verification Commands

```powershell
npx tsc --noEmit
npm run lint
npm run build
```

## Current Notes

- Lint currently passes with existing warnings for unused Ask AI helper functions and generated Convex eslint comments.
- Organization workspace is separated into its own feature folder for easy explanation during review.
- The root README is the only project documentation file.
