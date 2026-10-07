// src/lib/queries/feed.ts
import { adminDb } from "../firebase/admin";
import type { PostDocument, UserDocument, GroupDocument, MediaItem } from "../firebase/schema";

export type FeedPost = {
  id: string;
  content: string;
  likeCount: number;
  createdAt: string; // ISO string
  media: MediaItem[];
  author: Pick<UserDocument, "displayName" | "username" | "avatarUrl"> & { id: string };
  group: Pick<GroupDocument, "name" | "slug"> & { id: string } | null;
  viewerHasLiked: boolean;
};

const POSTS_PER_PAGE = 20;

export async function getScopedFeed(
  userId: string,
  cursorId?: string,
  limit = POSTS_PER_PAGE
): Promise<{ posts: FeedPost[]; nextCursor: string | null }> {
  
  // Find groups user is a member of
  const memberships = await adminDb.collection("groupMembers").where("userId", "==", userId).get();
  const groupIds = memberships.docs.map(doc => doc.data().groupId);
  
  // Firestore doesn't easily support OR across completely different fields (groupId == null OR groupId IN [...])
  // Workaround: We fetch public posts (groupId == null) and group posts, then merge and sort.
  // In a real production app with massive scale, it's often better to denormalize feed visibility.
  // For now, we'll fetch them and combine them manually since this is a private app.
  
  // Just for this rewrite, let's assume we fetch recent posts from both and sort manually.
  // Actually, to make cursor pagination work, it's easier to use a cloud function or fan-out feed architecture.
  // For simplicity here, we'll just fetch a single query if we can, but since Firestore `in` max is 10,
  // and `in` doesn't support `null` combined with values well.
  
  // We'll simplify: just fetch posts ordered by createdAt desc, and filter them.
  let query = adminDb.collection("posts").orderBy("createdAt", "desc").limit(limit * 2); // fetch extra to account for filtering
  
  if (cursorId) {
    const cursorDoc = await adminDb.collection("posts").doc(cursorId).get();
    if (cursorDoc.exists) {
      query = query.startAfter(cursorDoc);
    }
  }

  const snapshot = await query.get();
  
  const posts: FeedPost[] = [];
  
  for (const doc of snapshot.docs) {
    const data = doc.data() as PostDocument;
    
    // Filter logic: must be public (groupId == null) or user must be in the group
    if (data.groupId && !groupIds.includes(data.groupId)) {
      continue; // Skip posts the user can't see
    }
    
    // Fetch author
    const authorDoc = await adminDb.collection("users").doc(data.authorId).get();
    const authorData = authorDoc.data() as UserDocument;
    
    // Fetch group
    let groupData = null;
    if (data.groupId) {
      const gDoc = await adminDb.collection("groups").doc(data.groupId).get();
      if (gDoc.exists) {
        groupData = gDoc.data() as GroupDocument;
      }
    }
    
    // Check if liked
    const likeDoc = await adminDb.collection("likes").doc(`${userId}_${doc.id}`).get();
    
    posts.push({
      id: doc.id,
      content: data.content,
      likeCount: data.likeCount,
      createdAt: data.createdAt.toDate().toISOString(),
      media: data.media || [],
      author: {
        id: data.authorId,
        displayName: authorData?.displayName || "Unknown",
        username: authorData?.username || "unknown",
        avatarUrl: authorData?.avatarUrl || null,
      },
      group: groupData ? {
        id: data.groupId!,
        name: groupData.name,
        slug: groupData.slug,
      } : null,
      viewerHasLiked: likeDoc.exists,
    });
    
    if (posts.length === limit) break;
  }
  
  return {
    posts,
    nextCursor: posts.length === limit ? posts[posts.length - 1].id : null
  };
}

export async function getGroupFeed(
  userId: string,
  groupId: string,
  cursorId?: string,
  limit = POSTS_PER_PAGE
): Promise<{ posts: FeedPost[]; nextCursor: string | null } | null> {
  const membership = await adminDb.collection("groupMembers").doc(`${userId}_${groupId}`).get();
  if (!membership.exists) return null;

  let query = adminDb.collection("posts")
    .where("groupId", "==", groupId)
    .orderBy("createdAt", "desc")
    .limit(limit);

  if (cursorId) {
    const cursorDoc = await adminDb.collection("posts").doc(cursorId).get();
    if (cursorDoc.exists) {
      query = query.startAfter(cursorDoc);
    }
  }

  const snapshot = await query.get();
  
  const posts: FeedPost[] = [];
  const groupDoc = await adminDb.collection("groups").doc(groupId).get();
  const groupData = groupDoc.data() as GroupDocument;

  for (const doc of snapshot.docs) {
    const data = doc.data() as PostDocument;
    const authorDoc = await adminDb.collection("users").doc(data.authorId).get();
    const authorData = authorDoc.data() as UserDocument;
    const likeDoc = await adminDb.collection("likes").doc(`${userId}_${doc.id}`).get();
    
    posts.push({
      id: doc.id,
      content: data.content,
      likeCount: data.likeCount,
      createdAt: data.createdAt.toDate().toISOString(),
      media: data.media || [],
      author: {
        id: data.authorId,
        displayName: authorData?.displayName || "Unknown",
        username: authorData?.username || "unknown",
        avatarUrl: authorData?.avatarUrl || null,
      },
      group: {
        id: groupId,
        name: groupData.name,
        slug: groupData.slug,
      },
      viewerHasLiked: likeDoc.exists,
    });
  }

  return {
    posts,
    nextCursor: posts.length === limit ? posts[posts.length - 1].id : null
  };
}
