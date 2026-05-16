import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function RenameFileFeature({
  open,
  value,
  isRenaming,
  onOpenChange,
  onValueChange,
  onSubmit,
  onCancel,
}: {
  open: boolean;
  value: string;
  isRenaming: boolean;
  onOpenChange: (open: boolean) => void;
  onValueChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onCancel: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 p-5 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Rename file</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="rename-file-name" className="text-sm font-medium text-zinc-700">Name</label>
            <Input
              id="rename-file-name"
              value={value}
              onChange={(event) => onValueChange(event.target.value)}
              autoFocus
              placeholder="Enter a file name"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            <Button type="submit" disabled={isRenaming}>{isRenaming ? "Renaming..." : "Rename"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RenameFolderFeature({
  open,
  value,
  isRenaming,
  onOpenChange,
  onValueChange,
  onSubmit,
  onCancel,
}: {
  open: boolean;
  value: string;
  isRenaming: boolean;
  onOpenChange: (open: boolean) => void;
  onValueChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onCancel: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 p-5 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Rename folder</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="rename-folder-name" className="text-sm font-medium text-zinc-700">Name</label>
            <Input
              id="rename-folder-name"
              value={value}
              onChange={(event) => onValueChange(event.target.value)}
              autoFocus
              placeholder="Enter a folder name"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            <Button type="submit" disabled={isRenaming}>{isRenaming ? "Renaming..." : "Rename"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
