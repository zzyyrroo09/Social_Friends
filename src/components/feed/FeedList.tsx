// components/feed/FeedList.tsx — Client-side infinite-scroll feed
"use client";

import { useState, useTransition, useCallback } from "react";
import { PostCard } from "./PostCard";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { FeedPost } from "@/lib/queries/feed";

interface FeedListProps {
  initialPosts: FeedPost[];
  initialNextCursor: string | null;
  currentUserId: string;
  fetchMore: (cursor: string) => Promise<{ posts: FeedPost[]; nextCursor: string | null }>;
}

export function FeedList({
  initialPosts,
  initialNextCursor,
  currentUserId,
  fetchMore,
}: FeedListProps) {
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [isPending, startTransition] = useTransition();

  const handleLoadMore = useCallback(() => {
    if (!nextCursor) return;
    startTransition(async () => {
      const result = await fetchMore(nextCursor);
      setPosts((prev) => [...prev, ...result.posts]);
      setNextCursor(result.nextCursor);
    });
  }, [nextCursor, fetchMore]);

  function handleDelete(deletedId: string) {
    setPosts((prev) => prev.filter((p) => p.id !== deletedId));
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
        <p className="text-2xl">🌟</p>
        <p className="text-zinc-400 font-medium">Nothing here yet</p>
        <p className="text-sm text-zinc-600">
          Be the first to share something with your friends!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          currentUserId={currentUserId}
          onDelete={handleDelete}
        />
      ))}

      {nextCursor && (
        <div className="flex justify-center pt-4 pb-8">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={isPending}
            className="border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 hover:border-zinc-600"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading more…
              </>
            ) : (
              "Load more posts"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

