"use client";

import { useRef, useState } from "react";
import { useOrganization, useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { FileUp, FolderOpen, Plus, UploadCloud } from "lucide-react";

const formSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  file: z.custom<File>((val) => val instanceof File, "File is required"),
  folderId: z.string(),
});

type FileType = "image" | "pdf" | "document" | "spreadsheet" | "audio" | "video";
type FolderOption = {
  _id: Id<"folders">;
  name: string;
};

function getFileType(file: File): FileType {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type.startsWith("video/")) return "video";
  if (file.type === "application/pdf") return "pdf";
  if (["csv", "xls", "xlsx"].includes(extension ?? "")) return "spreadsheet";
  if (["doc", "docx", "txt", "rtf"].includes(extension ?? "")) return "document";
  return "document";
}

export function UploadButton({ folders = [] }: { folders?: FolderOption[] }) {
  const { organization } = useOrganization();
  const { user } = useUser();
  const createFile = useMutation(api.files.createFile);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const orgId = organization?.id ?? user?.id;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      file: undefined,
      folderId: "root",
    },
  });

  const selectedFile = form.watch("file");

  function setSelectedFile(file: File) {
    form.setValue("file", file, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });

    if (!form.getValues("title")) {
      form.setValue("title", file.name.replace(/\.[^/.]+$/, ""), {
        shouldDirty: true,
      });
    }
  }

  function handleDrop(event: React.DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    const file = event.dataTransfer.files[0];
    if (file) setSelectedFile(file);
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setUploadStatus("Preparing upload...");
      if (!orgId) {
        toast.error("Organization or user not found");
        return;
      }

      const postUrl = await generateUploadUrl();
      const selectedFile = values.file;
      const fileType = getFileType(selectedFile);

      setUploadStatus("Uploading file...");
      const result = await fetch(postUrl, {
        method: "POST",
        headers: {
          "Content-Type": selectedFile.type || "application/octet-stream",
        },
        body: selectedFile,
      });

      if (!result.ok) {
        throw new Error("Failed to upload file");
      }

      const { storageId } = await result.json();

      setUploadStatus("Saving file...");
      await createFile({
        name: values.title,
        orgId,
        fileId: storageId,
        folderId:
          values.folderId === "root"
            ? undefined
            : (values.folderId as Id<"folders">),
        type: fileType,
      });

      form.reset();
      setIsFileDialogOpen(false);
      toast.success("File uploaded successfully!");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong";
      toast.error(message);
    } finally {
      setUploadStatus("");
    }
  }

  return (
    <Dialog
      open={isFileDialogOpen}
      onOpenChange={(isOpen) => {
        setIsFileDialogOpen(isOpen);
        setIsDragging(false);
        setUploadStatus("");
        form.reset();
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="h-14 w-auto rounded-2xl border-zinc-200 bg-white px-6 text-base font-medium text-zinc-950 shadow-md shadow-zinc-200/80 hover:bg-zinc-50 hover:text-zinc-950"
        >
          <Plus className="mr-2 h-5 w-5" />
          Upload
        </Button>
      </DialogTrigger>

      <DialogContent className="gap-5 p-5 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">Upload to NexDrive</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Name this file" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="folderId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Save in</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3">
                      <FolderOpen className="h-4 w-4 shrink-0 text-zinc-500" />
                      <select
                        {...field}
                        className="h-10 w-full bg-transparent text-sm text-zinc-800 outline-none"
                      >
                        <option value="root">Files</option>
                        {folders.map((folder) => (
                          <option key={folder._id} value={folder._id}>
                            {folder.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="file"
              render={() => (
                <FormItem>
                  <FormLabel>File</FormLabel>
                  <FormControl>
                    <input
                      type="file"
                      accept="image/*,audio/*,video/*,.pdf,.csv,.xls,.xlsx,.doc,.docx,.txt,.rtf"
                      className="sr-only"
                      ref={inputRef}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) setSelectedFile(file);
                      }}
                    />
                  </FormControl>
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    onDragEnter={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setIsDragging(true);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      event.dataTransfer.dropEffect = "copy";
                      setIsDragging(true);
                    }}
                    onDragLeave={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setIsDragging(false);
                    }}
                    onDrop={handleDrop}
                    className={`flex min-h-44 w-full flex-col items-center justify-center rounded-xl border border-dashed px-6 py-8 text-center transition ${
                      isDragging
                        ? "border-zinc-900 bg-zinc-100"
                        : "border-zinc-300 bg-zinc-50 hover:border-zinc-400 hover:bg-white"
                    }`}
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 shadow-sm">
                      {selectedFile ? (
                        <FileUp className="h-5 w-5" />
                      ) : (
                        <UploadCloud className="h-5 w-5" />
                      )}
                    </span>
                    <span className="mt-4 text-sm font-medium text-zinc-900">
                      {selectedFile ? selectedFile.name : "Drop a file here"}
                    </span>
                    <span className="mt-1 text-xs text-zinc-500">
                      {selectedFile
                        ? "Click to choose a different file"
                        : "or click to browse files, media, and documents"}
                    </span>
                  </button>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFileDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {uploadStatus || (form.formState.isSubmitting ? "Uploading..." : "Upload")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
