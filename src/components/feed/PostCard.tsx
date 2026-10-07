// components/feed/PostCard.tsx
"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { toggleLike, deletePost } from "@/lib/firebase/posts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Heart, MoreHorizontal, Trash2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { FeedPost } from "@/lib/queries/feed";

interface PostCardProps {
  post: FeedPost;
  currentUserId: string;
  onDelete?: (postId: string) => void;
}

export function PostCard({ post, currentUserId, onDelete }: PostCardProps) {
  const [isPending, startTransition] = useTransition();
  const [liked, setLiked] = useState(post.viewerHasLiked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [isDeleted, setIsDeleted] = useState(false);

  const isAuthor = post.author.id === currentUserId;
  const images = post.media.filter((m) => m.type === "IMAGE");
  const videos = post.media.filter((m) => m.type === "VIDEO");

  const initials = post.author.displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  function handleLike() {
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => (wasLiked ? c - 1 : c + 1));
    startTransition(async () => {
      const result = await toggleLike(post.id);
      if (!result.success) {
        setLiked(wasLiked);
        setLikeCount((c) => (wasLiked ? c + 1 : c - 1));
      } else {
        setLikeCount(result.data!.likeCount);
        setLiked(result.data!.liked);
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deletePost(post.id);
      if (result.success) {
        setIsDeleted(true);
        onDelete?.(post.id);
      }
    });
  }

  if (isDeleted) return null;

  return (
    <article className="group rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-zinc-700">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border border-zinc-700">
            <AvatarImage src={post.author.avatarUrl ?? undefined} alt={post.author.displayName} />
            <AvatarFallback className="bg-violet-900 text-violet-200 text-xs font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-white leading-none">{post.author.displayName}</p>
              <span className="text-xs text-zinc-600">@{post.author.username}</span>
              {post.group && <Badge variant="outline" className="ml-1 h-5 gap-1 border-zinc-700 text-zinc-400 text-[10px]"><Users className="h-2.5 w-2.5" />{post.group.name}</Badge>}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</p>
          </div>
        </div>
        {isAuthor && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-zinc-300 hover:bg-zinc-800"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36 bg-zinc-900 border-zinc-700">
              <DropdownMenuItem onClick={handleDelete} disabled={isPending} className="text-red-400 focus:text-red-300 focus:bg-red-900/30 cursor-pointer gap-2"><Trash2 className="h-3.5 w-3.5" />Delete post</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <p className="mt-3 text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap break-words">{post.content}</p>
      {images.length > 0 && (
        <div className={cn("mt-3 grid gap-1 overflow-hidden rounded-lg", images.length === 1 && "grid-cols-1", images.length === 2 && "grid-cols-2", images.length >= 3 && "grid-cols-2")}>
          {images.slice(0, 4).map((img, i) => (
            <div key={i} className={cn("relative overflow-hidden bg-zinc-800", images.length === 1 && "aspect-video", images.length >= 2 && "aspect-square", images.length === 3 && i === 0 && "col-span-2 aspect-video")}>
              <Image src={img.url} alt={`Post image ${i + 1}`} fill sizes="(max-width: 768px) 100vw, 600px" className="object-cover transition-transform duration-300 hover:scale-105" fetchPriority={i === 0 ? "high" : "auto"} />
              {images.length > 4 && i === 3 && <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-xl font-bold">+{images.length - 4}</div>}
            </div>
          ))}
        </div>
      )}
      {videos.length > 0 && (
        <div className="mt-3 overflow-hidden rounded-lg border border-zinc-700">
          <video src={videos[0].url} controls playsInline preload="metadata" className="w-full max-h-[420px] bg-black" poster={images[0]?.url} />
        </div>
      )}
      <div className="mt-3 flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={handleLike} disabled={isPending} className={cn("h-8 gap-2 px-2 text-xs transition-colors", liked ? "text-rose-400 hover:text-rose-300 hover:bg-rose-900/20" : "text-zinc-500 hover:text-rose-400 hover:bg-rose-900/20")}>
          <Heart className={cn("h-4 w-4 transition-transform", liked && "fill-current scale-110")} />
          <span className="tabular-nums font-medium">{likeCount}</span>
        </Button>
      </div>
    </article>
  );
}
