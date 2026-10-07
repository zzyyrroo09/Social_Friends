// src/lib/firebase/posts.ts
import { db, storage, auth } from "./config";
import {
  collection,
  doc,
  setDoc,
  runTransaction,
  serverTimestamp,
  increment,
  Timestamp,
  deleteDoc,
  getDoc
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { PostDocument, MediaItem, LikeDocument } from "./schema";

export async function uploadMedia(file: File, onProgress?: (progress: number) => void): Promise<MediaItem> {
  const user = auth.currentUser;
  if (!user) throw new Error("Must be logged in to upload media");

  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `uploads/${user.uid}/${Date.now()}-${sanitizedName}`;
  const storageRef = ref(storage, storagePath);
  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snapshot) => { if (onProgress) onProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100); },
      (error) => reject(error),
      async () => resolve({
        url: await getDownloadURL(uploadTask.snapshot.ref),
        storagePath,
        type: file.type.startsWith("video/") ? "VIDEO" : "IMAGE",
        mimeType: file.type,
        sizeBytes: file.size,
      })
    );
  });
}

export async function createPost(content: string, groupId: string | null, mediaFiles: File[], onUploadProgress?: (progress: number) => void): Promise<{ success: boolean; data?: { postId: string }; error?: string }> {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Must be logged in");

    const mediaItems: MediaItem[] = [];
    if (mediaFiles.length > 0) {
      let completed = 0;
      for (const file of mediaFiles) {
        mediaItems.push(await uploadMedia(file, (p) => { if (onUploadProgress) onUploadProgress(((completed * 100) + p) / mediaFiles.length); }));
        completed++;
      }
    }

    const newPostRef = doc(collection(db, "posts"));
    await setDoc(newPostRef, {
      content,
      authorId: user.uid,
      groupId,
      media: mediaItems,
      likeCount: 0,
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
    });

    return { success: true, data: { postId: newPostRef.id } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function toggleLike(postId: string): Promise<{ success: boolean; data?: { liked: boolean; likeCount: number }; error?: string }> {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Must be logged in");

    const postRef = doc(db, "posts", postId);
    const likeRef = doc(db, "likes", `${user.uid}_${postId}`);

    const result = await runTransaction(db, async (transaction) => {
      const postDoc = await transaction.get(postRef);
      if (!postDoc.exists()) throw new Error("Post not found");

      const likeDoc = await transaction.get(likeRef);
      const isLiked = likeDoc.exists();
      const currentLikeCount = postDoc.data()?.likeCount || 0;

      if (isLiked) {
        transaction.delete(likeRef);
        transaction.update(postRef, { likeCount: increment(-1) });
        return { liked: false, likeCount: Math.max(0, currentLikeCount - 1) };
      } else {
        transaction.set(likeRef, { userId: user.uid, postId, createdAt: serverTimestamp() });
        transaction.update(postRef, { likeCount: increment(1) });
        return { liked: true, likeCount: currentLikeCount + 1 };
      }
    });

    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deletePost(postId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Must be logged in");
    
    const postRef = doc(db, "posts", postId);
    const postDoc = await getDoc(postRef);
    if (!postDoc.exists()) throw new Error("Post not found");
    
    const data = postDoc.data() as PostDocument;
    if (data.authorId !== user.uid) throw new Error("Not authorized");
    
    if (data.media && data.media.length > 0) {
      await Promise.all(data.media.map(m => deleteObject(ref(storage, m.storagePath)).catch(() => {})));
    }
    
    await deleteDoc(postRef);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
