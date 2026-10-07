// app/(app)/profile/page.tsx
import { requireAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase/admin";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PostCard } from "@/components/feed/PostCard";
import { CalendarDays } from "lucide-react";
import { format } from "date-fns";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile — Social Friends",
};

export default async function ProfilePage() {
  const currentUser = await requireAuth();

  const postsSnapshot = await adminDb.collection("posts")
    .where("authorId", "==", currentUser.id)
    .where("groupId", "==", null)
    .orderBy("createdAt", "desc")
    .limit(20)
    .get();

  const postsCountSnapshot = await adminDb.collection("posts").where("authorId", "==", currentUser.id).get();
  const postsCount = postsCountSnapshot.size;

  const initials = currentUser.displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const feedPosts = await Promise.all(
    postsSnapshot.docs.map(async (doc) => {
      const data = doc.data();
      const likeDoc = await adminDb.collection("likes").doc(`${currentUser.id}_${doc.id}`).get();
      return {
        id: doc.id,
        content: data.content,
        likeCount: data.likeCount,
        createdAt: data.createdAt.toDate().toISOString(),
        media: data.media || [],
        author: {
          id: currentUser.id,
          displayName: currentUser.displayName,
          username: currentUser.username,
          avatarUrl: currentUser.avatarUrl,
        },
        group: null,
        viewerHasLiked: likeDoc.exists,
      };
    })
  );

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16 border-2 border-violet-700">
            <AvatarImage src={currentUser.avatarUrl ?? undefined} alt={currentUser.displayName} />
            <AvatarFallback className="bg-violet-900 text-violet-200 text-xl font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white">{currentUser.displayName}</h1>
            <p className="text-zinc-500 text-sm">@{currentUser.username}</p>
            {currentUser.bio && <p className="mt-2 text-sm text-zinc-300 leading-relaxed">{currentUser.bio}</p>}
            <div className="mt-3 flex items-center gap-4 text-sm">
              <div><span className="font-bold text-white">{postsCount}</span><span className="text-zinc-500 ml-1">posts</span></div>
              <div className="flex items-center gap-1 text-zinc-600 text-xs">
                <CalendarDays className="h-3 w-3" />
                Joined {format(currentUser.createdAt.toDate(), "MMMM yyyy")}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Public Posts</h2>
        {feedPosts.length === 0 ? (
          <div className="text-center py-10"><p className="text-zinc-500 text-sm">No public posts yet.</p></div>
        ) : (
          feedPosts.map((post) => <PostCard key={post.id} post={post as any} currentUserId={currentUser.id} />)
        )}
      </div>
    </div>
  );
}
