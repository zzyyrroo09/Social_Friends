// src/lib/auth.ts
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth, adminDb } from "./firebase/admin";
import type { UserDocument } from "./firebase/schema";

export async function requireAuth(): Promise<UserDocument & { id: string }> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;

  if (!sessionCookie) {
    redirect("/login");
  }

  try {
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    const userDoc = await adminDb.collection("users").doc(decodedClaims.uid).get();
    
    if (!userDoc.exists) {
      redirect("/onboarding");
    }

    return { id: decodedClaims.uid, ...(userDoc.data() as UserDocument) };
  } catch (error) {
    redirect("/login");
  }
}

export async function getOptionalUser(): Promise<(UserDocument & { id: string }) | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session")?.value;

    if (!sessionCookie) return null;

    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    const userDoc = await adminDb.collection("users").doc(decodedClaims.uid).get();

    if (!userDoc.exists) return null;

    return { id: decodedClaims.uid, ...(userDoc.data() as UserDocument) };
  } catch {
    return null;
  }
}
