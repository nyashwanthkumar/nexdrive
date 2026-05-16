# NexDrive Dashboard Feature Map

Use this file during demos/viva to quickly show where each feature is implemented.

- Upload: `app/dashboard/_features/upload.tsx`
- Share links + share dialog: `app/dashboard/_features/share.tsx`
- Trash filtering logic: `app/dashboard/_features/trash.tsx`
- Rename file/folder dialogs: `app/dashboard/_features/rename.tsx`
- Delete folder confirmation dialog: `app/dashboard/_features/delete.tsx`
- Folder item actions menu: `app/dashboard/_features/folder-actions.tsx`
- Sorting control: `app/dashboard/_features/sorting.tsx`
- Grid/List view switch: `app/dashboard/_features/view-mode.tsx`
- Selection + bulk actions toolbar: `app/dashboard/_features/selection.tsx`
- Sidebar navigation item: `app/dashboard/_features/sidebar.tsx`
- View type labels + types: `app/dashboard/_features/feature-types.tsx`
- File/folder view filters: `app/dashboard/_features/file-feature-filters.tsx`
- Programmatic feature index: `app/dashboard/_features/all-features.tsx`

## Still centralized in `page.tsx`

- Data fetching (`useQuery`/`useMutation`) and wiring between features.
- Ask AI workflow and handlers.
- Main file/folder rendering blocks and preview modal.

This is intentional: `page.tsx` now acts as the coordinator while individual feature UI blocks are in `_features`.
