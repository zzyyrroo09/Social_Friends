"use server";

import { requireAuth } from "@/lib/auth";
import crypto from "crypto";

export async function getCloudinarySignature() {
  await requireAuth(); // ensure only logged in users can upload

  const timestamp = Math.round(new Date().getTime() / 1000);
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!apiSecret) {
    throw new Error("Cloudinary API secret not configured");
  }

  // The signature string must contain the parameters in alphabetical order
  // For basic upload, we usually just need timestamp
  // We can also add folder or other options here if we want
  const folder = "social_friends_uploads";
  const str = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  
  const signature = crypto.createHash("sha256").update(str).digest("hex");

  return {
    timestamp,
    signature,
    folder,
    apiKey: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  };
}
