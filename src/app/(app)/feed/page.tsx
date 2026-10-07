// app/(app)/feed/page.tsx — Main global feed page
import { requireAuth } from "@/lib/auth";
import { getScopedFeed } from "@/lib/queries/feed";
import { PostComposer } from "@/components/feed/PostComposer";
import { FeedList } from "@/components/feed/FeedList";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Feed — Social Friends",
};

// Server Action used by the FeedList client component to load more posts
async function fetchMoreFeedPosts(userId: string, cursor: string) {
  "use server";
  return getScopedFeed(userId, cursor);
}

export default async function FeedPage() {
  const currentUser = await requireAuth();
  const { posts, nextCursor } = await getScopedFeed(currentUser.id);

  // Bind the userId into the server action so the client can call it
  const boundFetchMore = fetchMoreFeedPosts.bind(null, currentUser.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white mb-4">Friend Feed</h1>
        <PostComposer currentUser={currentUser} />
      </div>

      <FeedList
        initialPosts={posts}
        initialNextCursor={nextCursor}
        currentUserId={currentUser.id}
        fetchMore={boundFetchMore}
      />
    </div>
  );
}

