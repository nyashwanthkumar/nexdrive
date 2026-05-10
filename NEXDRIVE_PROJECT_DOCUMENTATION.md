# NexDrive Project Documentation

## Overview

NexDrive is a file storage and sharing app built with Next.js, Clerk, Convex, and Tailwind CSS. It supports personal workspaces and Clerk organizations, file uploads, folder organization, previews, share links, activity tracking, trash management, storage usage, dark mode, and responsive dashboard layouts.

The app is designed as a lightweight file hub for small teams and personal use.

## Tech Stack

- Next.js 16.2.3 with App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Clerk for authentication and organization support
- Convex for database, file storage, queries, mutations, and cron jobs
- shadcn/ui primitives
- Sonner for toast notifications
- Lucide icons

## Main Product Modules

### 1. Authentication and Access Control

Clerk handles sign-up, sign-in, session state, user profile, organizations, and organization switching.

Implemented behavior:

- Public routes:
  - `/`
  - `/share/[token]`
  - `/api/clerk/webhook`
- Protected route:
  - `/dashboard`
- Personal workspace support
- Organization workspace support
- Organization switching from the account menu
- Organization profile management from the account menu

Relevant files:

- `app/middleware.ts`
- `app/_components/header.tsx`
- `app/_components/convex-client-provider.tsx`
- `convex/auth.config.ts`

## 2. Dashboard

The dashboard is the main workspace UI.

Implemented sections:

- Recent
- Starred
- Activity
- Folders
- Images
- Videos
- Music
- Documents
- PDFs
- Trash

Implemented dashboard capabilities:

- Search
- Sort:
  - newest
  - oldest
  - name ascending
  - name descending
- List view
- Grid view
- Selection mode
- Multi-select actions
- File preview opening by clicking the file surface
- Responsive desktop and mobile layouts
- Dark mode and light mode

Relevant file:

- `app/dashboard/page.tsx`

## 3. File Uploads

Uploads are handled through Convex file storage.

Current behavior:

- Upload dialog with title, folder destination, and file picker
- Drag and drop support
- Supported file categories:
  - image
  - pdf
  - document
  - spreadsheet
  - audio
  - video
- Upload destination can be root or a selected folder
- Uploads go to:
  - active organization workspace when an organization is active
  - personal workspace otherwise

Current upload limit:

- 50 MB per file in the current UI flow

Important note:

- Chunked uploads are not implemented yet
- If a file is over 50 MB, the app shows a message saying chunked upload support is needed first

Relevant file:

- `app/dashboard/_components/upload-button.tsx`

## 4. Files

File data is stored in the Convex `files` table and the actual binary content is stored in Convex storage.

Implemented file features:

- Upload file
- Rename file
- Download file
- Share file with expiry
- Favorite/unfavorite file
- Move file to trash
- Restore file from trash
- Permanently delete file
- Preview supported file types

File preview behavior:

- Image: inline preview
- Video: thumbnail-style card, preview modal support
- PDF: preview modal and shared-page object embed
- Other file types: icon-based card/list representation

Relevant backend file:

- `convex/files.ts`

## 5. Folders

Folders are stored separately in the Convex `folders` table.

Implemented folder features:

- Create folder
- Rename folder
- Favorite/unfavorite folder
- Open folder
- Move folder to trash
- Restore folder from trash
- Permanently delete folder

Important behavior:

- When a folder is deleted, files inside it are detached from that folder instead of being deleted automatically

Relevant backend file:

- `convex/files.ts`

## 6. Sharing

NexDrive supports time-limited share links for files.

Implemented sharing features:

- Create share link
- Set expiration time
- Copy share URL
- View active shares
- Revoke share link
- Public shared file page

Shared route:

- `/share/[token]`

Shared page behavior:

- Shows file name
- Shows expiry time
- Allows download
- Provides inline preview for images and PDFs when possible
- Shows unavailable state when link is expired, revoked, or missing

Relevant files:

- `app/share/[token]/page.tsx`
- `convex/files.ts`

## 7. Activity Log

NexDrive tracks recent activity in the current workspace.

Tracked actions:

- uploaded
- renamed
- trashed
- restored
- shared
- revoked_share

Activity is displayed in the dashboard Activity section.

Relevant backend file:

- `convex/files.ts`

## 8. Trash System

NexDrive uses a soft-delete model before permanent deletion.

Implemented behavior:

- Files moved to trash are marked with:
  - `shouldDelete`
  - `deletedAt`
- Folders moved to trash are marked similarly
- Trash view shows deleted files and folders
- Users can:
  - restore
  - permanently delete

Automatic cleanup:

- A Convex cron permanently deletes trashed files after 30 days

Relevant files:

- `convex/files.ts`
- `convex/crons.ts`

## 9. Storage Usage

The sidebar includes storage usage details for the active workspace.

Displayed values:

- used storage
- total available storage
- percent used
- file count
- active share count

Current configured total:

- `1 GB`

This matches the storage cap currently being shown in the product.

Relevant backend file:

- `convex/files.ts`

## 10. Workspace Handling

NexDrive supports two workspace types:

- Personal workspace
- Organization workspace

Workspace behavior:

- Active workspace affects visible files, folders, storage stats, activity, and share links
- Uploads are saved into the active workspace
- Sidebar shows the active workspace card
- Header account menu allows switching between personal and organization workspaces

Relevant files:

- `app/dashboard/page.tsx`
- `app/_components/header.tsx`
- `app/dashboard/_components/upload-button.tsx`

## 11. User Tracking in Convex

Signed-in users are synced into a Convex `users` table.

Stored user fields:

- `clerkId`
- `email`
- `name`
- `imageUrl`
- `joinedAt`
- `lastSeenAt`

Important note:

- Users are synced when they sign in and load the dashboard
- The dashboard UI does not show a Users tab anymore
- The data still exists in Convex for admin inspection

Relevant file:

- `convex/users.ts`

## 12. Theme System

The app uses a local theme provider instead of relying on `next-themes` rendering behavior.

Implemented behavior:

- light mode
- dark mode
- persisted theme in `localStorage`
- theme toggle in header
- theme toggle in mobile navigation

Relevant file:

- `app/_components/theme-provider.tsx`

## 13. Landing Page

The home page is a clean product landing screen with:

- short product message
- sign-up CTA
- feature highlights
- dashboard preview card

Relevant file:

- `app/page.tsx`

## 14. Header and Account Menu

The global header includes:

- NexDrive logo
- theme toggle
- Ask AI placeholder button
- Clerk account menu for signed-in users

The account menu currently supports:

- Manage account
- switch to Personal workspace
- switch to organization workspace
- create organization
- manage organization
- sign out

Relevant file:

- `app/_components/header.tsx`

## 15. Current Database Schema

### `users`

- clerkId
- email
- name
- imageUrl
- joinedAt
- lastSeenAt

### `files`

- name
- orgId
- userId
- fileId
- folderId
- size
- type
- isFavorite
- shouldDelete
- deletedAt

### `folders`

- name
- orgId
- userId
- isFavorite
- shouldDelete
- deletedAt

### `shareLinks`

- fileId
- token
- orgId
- createdBy
- createdAt
- expiresAt
- revokedAt

### `activityLogs`

- orgId
- userId
- action
- fileId
- fileName
- createdAt

Schema file:

- `convex/schema.ts`

## 16. Current Backend Functions

### File and folder mutations

- `generateUploadUrl`
- `createFile`
- `deleteFile`
- `restoreFile`
- `permanentlyDeleteFile`
- `toggleFavorite`
- `createFolder`
- `toggleFavoriteFolder`
- `deleteFolder`
- `restoreFolder`
- `permanentlyDeleteFolder`
- `renameFile`
- `renameFolder`

### Sharing

- `createShareLink`
- `getSharedFile`
- `getShareLinks`
- `revokeShareLink`

### Workspace and stats

- `getStorageStats`
- `getActivityLogs`
- `getFiles`
- `getFolders`
- `getUserRole`

### User sync

- `syncCurrentUser`
- `listUsers`

### Internal cron target

- `permanentlyDeleteOldFiles`

Relevant files:

- `convex/files.ts`
- `convex/users.ts`
- `convex/crons.ts`

## 17. Permissions Model

Personal workspace:

- users can only manage their own files and folders

Organization workspace:

- organization admins can manage organization files and folders
- uploaders/owners can manage their own uploaded content

Access checks are performed in Convex before returning or mutating data.

## 18. Responsive Behavior

Implemented responsive behavior includes:

- mobile nav drawer with hamburger icon
- compact header controls
- responsive list and grid layouts
- mobile-friendly dashboard actions
- mobile theme toggle inside nav

Main file:

- `app/dashboard/page.tsx`

## 19. Known Limitations

- Chunked upload is not implemented
- Non-image file cards do not generate true visual thumbnails
- Clerk webhook route currently verifies events but does not write them into Convex
- Shared inline preview is limited by browser support and file type
- Some advanced file metadata like uploader name, modified date history, and comments are not implemented

## 20. Project Structure

```text
app/
  _components/
    convex-client-provider.tsx
    header.tsx
    theme-provider.tsx
  api/clerk/webhook/route.ts
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
```

## 21. Run Commands

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

Build production:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

Type check:

```bash
npx tsc --noEmit
```

Generate Convex types:

```bash
npx convex codegen
```

## 22. Summary

NexDrive currently delivers a complete small-team file workspace with:

- authentication
- personal and organization workspaces
- uploads
- folders
- previews
- sharing
- activity logs
- storage tracking
- trash
- multi-select
- responsive dashboard
- light and dark mode

The biggest future upgrades would be:

- chunked upload support
- richer non-image thumbnails
- stronger org/user admin visibility
- stronger webhook-driven sync or audit features
