// @ts-nocheck
// src/actions/invites.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { adminDb, adminAuth } from "@/lib/firebase/admin";
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

const CreateInviteSchema = z.object({
  email: z.string().email("Invalid email address").optional(),
  expiresInDays: z.number().int().min(1).max(30).default(7),
});

export async function createInviteToken(rawInput: {
  email?: string;
  expiresInDays?: number;
}): Promise<ActionResult<{ token: string; inviteUrl: string }>> {
  const currentUser = await requireAuth();

  const parsed = CreateInviteSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }

  const { email, expiresInDays } = parsed.data;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const newInviteRef = adminDb.collection("inviteTokens").doc();
  await newInviteRef.set({
    email: email ?? null,
    expiresAt: Timestamp.fromDate(expiresAt),
    createdAt: FieldValue.serverTimestamp(),
    usedAt: null,
    senderId: currentUser.id,
    recipientId: null
  });

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/register?token=${newInviteRef.id}`;
  revalidatePath("/settings/invites");

  return { success: true, data: { token: newInviteRef.id, inviteUrl } };
}

const RedeemInviteSchema = z.object({
  token: z.string().min(5, "Invalid invite token"),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  username: z.string().min(3).max(30),
  displayName: z.string().min(1).max(50),
});

export async function redeemInvite(rawInput: {
  token: string;
  email: string;
  password: string;
  username: string;
  displayName: string;
}): Promise<ActionResult<{ userId: string }>> {
  const parsed = RedeemInviteSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }

  const { token, email, password, username, displayName } = parsed.data;

  const inviteRef = adminDb.collection("inviteTokens").doc(token);
  const inviteDoc = await inviteRef.get();

  if (!inviteDoc.exists) return { success: false, error: "Invalid invite token." };
  
  const invite = inviteDoc.data()!;
  
  if (invite.usedAt) return { success: false, error: "This invite has already been used." };
  if (invite.expiresAt.toDate() < new Date()) return { success: false, error: "This invite has expired." };
  if (invite.email && invite.email.toLowerCase() !== email.toLowerCase()) {
    return { success: false, error: "This invite is intended for a different email address." };
  }

  const existingUsername = await adminDb.collection("users").where("username", "==", username).limit(1).get();
  if (!existingUsername.empty) return { success: false, error: "Username is already taken." };

  try {
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName,
    });

    const batch = adminDb.batch();
    
    batch.set(adminDb.collection("users").doc(userRecord.uid), {
      email,
      username,
      displayName,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      avatarUrl: null,
      bio: null
    });

    batch.update(inviteRef, {
      usedAt: FieldValue.serverTimestamp(),
      recipientId: userRecord.uid
    });

    await batch.commit();

    return { success: true, data: { userId: userRecord.uid } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
