// src/lib/queries/highlights.ts
import { adminDb } from "../firebase/admin";
import type { FeedPost } from "./feed";
import type { PostDocument, UserDocument } from "../firebase/schema";

export type TopHighlightPost = Omit<FeedPost, "group" | "viewerHasLiked"> & { _count: { likes: number } };

export async function getTopHighlightForUser(
  userId: string,
  windowDays = 7
): Promise<TopHighlightPost | null> {
  const since = new Date();
  since.setDate(since.getDate() - windowDays);

  const memberships = await adminDb.collection("groupMembers").where("userId", "==", userId).get();
  const groupIds = memberships.docs.map(doc => doc.data().groupId);

  // Firestore doesn't support ordering by multiple fields easily if we need to filter by a range (createdAt)
  // Workaround for MVP: fetch posts created after `since`, sort manually in memory.
  
  const snapshot = await adminDb.collection("posts")
    .where("createdAt", ">=", since)
    .get();

  let topPost: { id: string; data: PostDocument } | null = null;
  let maxLikes = 0;

  snapshot.forEach(doc => {
    const data = doc.data() as PostDocument;
    if (data.likeCount > 0 && (data.groupId === null || groupIds.includes(data.groupId))) {
      if (data.likeCount > maxLikes) {
        maxLikes = data.likeCount;
        topPost = { id: doc.id, data };
      }
    }
  });

  if (!topPost) return null;

  const authorDoc = await adminDb.collection("users").doc(topPost.data.authorId).get();
  const authorData = authorDoc.data() as UserDocument;

  return {
    id: topPost.id,
    content: topPost.data.content,
    likeCount: topPost.data.likeCount,
    createdAt: topPost.data.createdAt.toDate().toISOString(),
    media: topPost.data.media || [],
    author: {
      id: topPost.data.authorId,
      displayName: authorData?.displayName || "Unknown",
      username: authorData?.username || "unknown",
      avatarUrl: authorData?.avatarUrl || null,
    },
    _count: { likes: topPost.data.likeCount }
  };
}
