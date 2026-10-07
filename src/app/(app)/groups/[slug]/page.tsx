// app/(app)/groups/[slug]/page.tsx
import { requireAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase/admin";
import { getGroupFeed } from "@/lib/queries/feed";
import { PostComposer } from "@/components/feed/PostComposer";
import { FeedList } from "@/components/feed/FeedList";
import { notFound, redirect } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Lock, Users } from "lucide-react";
import type { Metadata } from "next";

interface GroupPageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: GroupPageProps): Promise<Metadata> {
  const groupsSnapshot = await adminDb.collection("groups").where("slug", "==", params.slug).limit(1).get();
  if (groupsSnapshot.empty) return { title: "Group" };
  const group = groupsSnapshot.docs[0].data();
  return { title: `${group.name} — Social Friends` };
}

async function fetchMoreGroupPosts(userId: string, groupId: string, cursor: string) {
  "use server";
  const result = await getGroupFeed(userId, groupId, cursor);
  if (!result) return { posts: [], nextCursor: null };
  return result;
}

export default async function GroupPage({ params }: GroupPageProps) {
  const currentUser = await requireAuth();

  const groupsSnapshot = await adminDb.collection("groups").where("slug", "==", params.slug).limit(1).get();
  if (groupsSnapshot.empty) notFound();

  const groupDoc = groupsSnapshot.docs[0];
  const group = groupDoc.data() as any;

  const feedData = await getGroupFeed(currentUser.id, groupDoc.id);
  if (!feedData) {
    redirect("/groups");
  }

  const { posts, nextCursor } = feedData;
  const boundFetchMore = fetchMoreGroupPosts.bind(null, currentUser.id, groupDoc.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar className="h-14 w-14 border border-zinc-700">
          <AvatarFallback className="bg-violet-900/50 text-violet-300 text-lg font-bold">{group.name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">{group.name}</h1>
            {group.isPrivate && <Badge variant="outline" className="border-zinc-700 text-zinc-400 gap-1"><Lock className="h-2.5 w-2.5" />Private</Badge>}
          </div>
          {group.description && <p className="text-sm text-zinc-400 mt-0.5">{group.description}</p>}
          <p className="text-xs text-zinc-600 mt-1 flex items-center gap-1"><Users className="h-3 w-3" />{group.memberCount || 0} members · {group.postCount || 0} posts</p>
        </div>
      </div>
      <PostComposer currentUser={currentUser} groupId={groupDoc.id} />
      <FeedList initialPosts={posts as any} initialNextCursor={nextCursor} currentUserId={currentUser.id} fetchMore={boundFetchMore as any} />
    </div>
  );
}
