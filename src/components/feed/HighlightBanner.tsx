// components/feed/HighlightBanner.tsx
"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { toggleLike } from "@/lib/firebase/posts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TopHighlightPost } from "@/lib/queries/highlights";
import { formatDistanceToNow } from "date-fns";

interface HighlightBannerProps {
  post: TopHighlightPost;
  currentUserId: string;
}

export function HighlightBanner({ post, currentUserId }: HighlightBannerProps) {
  const [isPending, startTransition] = useTransition();
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [liked, setLiked] = useState(post._count.likes > 0);

  const coverImage = post.media.find((m) => m.type === "IMAGE");
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

  return (
    <div className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-3">
        <div className="flex items-center gap-3">
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 gap-1 flex-shrink-0"><Trophy className="h-3 w-3" />Top of the Week</Badge>
          {coverImage && (
            <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-md border border-zinc-700">
              <Image src={coverImage.url} alt="Highlight post thumbnail" fill sizes="40px" className="object-cover" />
            </div>
          )}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Avatar className="h-7 w-7 flex-shrink-0 border border-zinc-700">
              <AvatarImage src={post.author.avatarUrl ?? undefined} alt={post.author.displayName} />
              <AvatarFallback className="bg-violet-900 text-violet-200 text-[10px] font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-xs text-zinc-400"><span className="font-semibold text-white">{post.author.displayName}</span>{" · "}<span className="text-zinc-500">{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span></p>
              <p className="text-sm text-zinc-300 truncate">{post.content}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLike} disabled={isPending} className={cn("flex-shrink-0 gap-1.5 text-xs", liked ? "text-rose-400 hover:text-rose-300 hover:bg-rose-900/20" : "text-zinc-400 hover:text-rose-400 hover:bg-rose-900/20")}>
            <Heart className={cn("h-4 w-4", liked && "fill-current")} />
            <span className="tabular-nums font-medium">{likeCount}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
