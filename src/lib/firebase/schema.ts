// src/lib/firebase/schema.ts
import { Timestamp } from "firebase/firestore";

/**
 * Collection: `users`
 * Document ID: Firebase Auth UID
 */
export interface UserDocument {
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Collection: `inviteTokens`
 * Document ID: auto-generated (the token itself)
 */
export interface InviteTokenDocument {
  email: string | null; // Pre-targeted invite
  expiresAt: Timestamp;
  usedAt: Timestamp | null;
  createdAt: Timestamp;
  senderId: string;
  recipientId: string | null;
}

/**
 * Collection: `groups`
 * Document ID: auto-generated
 */
export interface GroupDocument {
  name: string;
  slug: string;
  description: string | null;
  avatarUrl: string | null;
  isPrivate: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  memberCount: number;
  postCount: number;
}

/**
 * Subcollection: `groups/{groupId}/members`
 * OR Collection: `groupMembers` (docId = `${userId}_${groupId}`)
 * Document ID: Firebase Auth UID (if subcollection)
 */
export interface GroupMemberDocument {
  userId: string;
  groupId: string;
  role: "ADMIN" | "MEMBER";
  joinedAt: Timestamp;
}

export type MediaType = "IMAGE" | "VIDEO";

export interface MediaItem {
  url: string; // Storage public URL
  storagePath: string; // Internal storage path (for deletion)
  type: MediaType;
  mimeType: string;
  width?: number;
  height?: number;
  durationMs?: number;
  sizeBytes: number;
}

/**
 * Collection: `posts`
 * Document ID: auto-generated
 */
export interface PostDocument {
  content: string;
  authorId: string;
  groupId: string | null; // null means public friend feed
  media: MediaItem[];
  likeCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Collection: `likes`
 * Document ID: `${userId}_${postId}`
 */
export interface LikeDocument {
  userId: string;
  postId: string;
  createdAt: Timestamp;
}

