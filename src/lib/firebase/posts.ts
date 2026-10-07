// src/lib/firebase/posts.ts
import { db, auth } from "./config";
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
import { getCloudinarySignature } from "@/actions/cloudinary";
import { PostDocument, MediaItem, LikeDocument } from "./schema";

export async function uploadMedia(file: File, onProgress?: (progress: number) => void): Promise<MediaItem> {
  const user = auth.currentUser;
  if (!user) throw new Error("Must be logged in to upload media");

  const { timestamp, signature, folder, apiKey, cloudName } = await getCloudinarySignature();

  if (!cloudName || !apiKey) {
    throw new Error("Cloudinary configuration missing");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", apiKey);
  formData.append("timestamp", timestamp.toString());
  formData.append("signature", signature);
  formData.append("folder", folder);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, true);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress((e.loaded / e.total) * 100);
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        resolve({
          url: response.secure_url,
          storagePath: response.public_id, // We store public_id as storagePath to allow deletion if needed
          type: response.resource_type === "video" ? "VIDEO" : "IMAGE",
          mimeType: file.type,
          sizeBytes: response.bytes,
        });
      } else {
        reject(new Error("Upload failed: " + xhr.responseText));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(formData);
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
      // TODO: Implement Cloudinary server action deletion using public_id if desired
      // For now, media remains in Cloudinary when post is deleted
    }
    
    await deleteDoc(postRef);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
