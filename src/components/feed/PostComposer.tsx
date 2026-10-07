// components/feed/PostComposer.tsx
"use client";

import { useState, useRef, useTransition } from "react";
import Image from "next/image";
import { createPost } from "@/lib/firebase/posts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ImageIcon, Video, X, Loader2, AlertCircle, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserDocument } from "@/lib/firebase/schema";

interface MediaPreview {
  file: File;
  previewUrl: string;
  type: "IMAGE" | "VIDEO";
}

interface PostComposerProps {
  currentUser: UserDocument;
  groupId?: string;
  onPosted?: () => void;
}

const MAX_MEDIA = 4;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

export function PostComposer({ currentUser, groupId, onPosted }: PostComposerProps) {
  const [content, setContent] = useState("");
  const [mediaPreviews, setMediaPreviews] = useState<MediaPreview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const initials = currentUser.displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  function handleFileSelect(files: FileList | null, type: "IMAGE" | "VIDEO") {
    if (!files) return;
    const remaining = MAX_MEDIA - mediaPreviews.length;
    const newFiles = Array.from(files).slice(0, remaining);

    const newPreviews: MediaPreview[] = newFiles.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      type,
    }));
    setMediaPreviews((prev) => [...prev, ...newPreviews]);
  }

  function removeMedia(index: number) {
    setMediaPreviews((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].previewUrl);
      updated.splice(index, 1);
      return updated;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!content.trim() && mediaPreviews.length === 0) {
      setError("Write something or attach media before posting.");
      return;
    }

    startTransition(async () => {
      setIsUploading(true);
      const result = await createPost(content.trim(), groupId || null, mediaPreviews.map(m => m.file), setUploadProgress);
      setIsUploading(false);

      if (!result.success) {
        setError(result.error || "Failed to create post");
        return;
      }

      setContent("");
      mediaPreviews.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setMediaPreviews([]);
      setUploadProgress(0);
      onPosted?.();
    });
  }

  const isSubmitting = isPending || isUploading;

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
      {error && (
        <Alert variant="destructive" className="py-2"><AlertCircle className="h-4 w-4" /><AlertDescription className="text-sm">{error}</AlertDescription></Alert>
      )}
      <div className="flex gap-3">
        <Avatar className="h-9 w-9 flex-shrink-0 border border-zinc-700 mt-0.5">
          <AvatarImage src={currentUser.avatarUrl ?? undefined} alt={currentUser.displayName} />
          <AvatarFallback className="bg-violet-900 text-violet-200 text-xs font-bold">{initials}</AvatarFallback>
        </Avatar>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={groupId ? "Share something with the group…" : "What's on your mind?"}
          disabled={isSubmitting}
          maxLength={2000}
          rows={3}
          className="flex-1 resize-none bg-transparent border-none text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-sm leading-relaxed"
        />
      </div>
      {mediaPreviews.length > 0 && (
        <div className={cn("grid gap-1 rounded-lg overflow-hidden", mediaPreviews.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
          {mediaPreviews.map((preview, i) => (
            <div key={i} className="relative group/thumb aspect-square bg-zinc-800 overflow-hidden rounded-md">
              {preview.type === "IMAGE" ? (
                <Image src={preview.previewUrl} alt={`Preview ${i + 1}`} fill sizes="300px" className="object-cover" />
              ) : (
                <video src={preview.previewUrl} className="w-full h-full object-cover" muted playsInline />
              )}
              <button type="button" onClick={() => removeMedia(i)} className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/70 flex items-center justify-center text-white opacity-0 group-hover/thumb:opacity-100 transition-opacity hover:bg-black"><X className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      )}
      {isUploading && (
        <div className="space-y-1.5">
          <p className="text-xs text-zinc-400">Uploading media… {Math.round(uploadProgress)}%</p>
          <Progress value={uploadProgress} className="h-1.5 bg-zinc-800" />
        </div>
      )}
      <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
        <div className="flex items-center gap-1">
          <input ref={imageInputRef} type="file" accept={ACCEPTED_IMAGE_TYPES.join(",")} multiple className="hidden" onChange={(e) => handleFileSelect(e.target.files, "IMAGE")} disabled={mediaPreviews.length >= MAX_MEDIA || isSubmitting} />
          <Button type="button" variant="ghost" size="icon" onClick={() => imageInputRef.current?.click()} disabled={mediaPreviews.length >= MAX_MEDIA || isSubmitting} className="h-8 w-8 text-zinc-500 hover:text-violet-400 hover:bg-violet-900/20"><ImageIcon className="h-4 w-4" /></Button>
          <input ref={videoInputRef} type="file" accept={ACCEPTED_VIDEO_TYPES.join(",")} className="hidden" onChange={(e) => handleFileSelect(e.target.files, "VIDEO")} disabled={mediaPreviews.length >= MAX_MEDIA || isSubmitting} />
          <Button type="button" variant="ghost" size="icon" onClick={() => videoInputRef.current?.click()} disabled={mediaPreviews.length >= MAX_MEDIA || isSubmitting} className="h-8 w-8 text-zinc-500 hover:text-violet-400 hover:bg-violet-900/20"><Video className="h-4 w-4" /></Button>
          {mediaPreviews.length > 0 && <span className="text-xs text-zinc-600 ml-1">{mediaPreviews.length}/{MAX_MEDIA}</span>}
        </div>
        <div className="flex items-center gap-2">
          {content.length > 1800 && <span className={cn("text-xs tabular-nums", content.length > 1950 ? "text-red-400" : "text-zinc-500")}>{2000 - content.length}</span>}
          <Button type="submit" disabled={isSubmitting || (!content.trim() && mediaPreviews.length === 0)} size="sm" className="bg-violet-600 hover:bg-violet-500 text-white font-semibold gap-2">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-3.5 w-3.5" />Post</>}
          </Button>
        </div>
      </div>
    </form>
  );
}
