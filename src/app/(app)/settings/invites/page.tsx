// app/(app)/settings/invites/page.tsx
import { requireAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase/admin";
import { InvitePanel } from "@/components/settings/InvitePanel";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Invites — Social Friends",
};

export default async function InvitesPage() {
  const currentUser = await requireAuth();

  const invitesSnapshot = await adminDb.collection("inviteTokens")
    .where("senderId", "==", currentUser.id)
    .orderBy("createdAt", "desc")
    .get();

  const sentInvites = await Promise.all(
    invitesSnapshot.docs.map(async (doc) => {
      const data = doc.data();
      let recipient = null;
      if (data.recipientId) {
        const userDoc = await adminDb.collection("users").doc(data.recipientId).get();
        if (userDoc.exists) {
          const ud = userDoc.data()!;
          recipient = { displayName: ud.displayName, username: ud.username };
        }
      }
      return {
        id: doc.id,
        email: data.email,
        expiresAt: data.expiresAt.toDate().toISOString(),
        usedAt: data.usedAt ? data.usedAt.toDate().toISOString() : null,
        recipient,
      };
    })
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Invite Friends</h1>
        <p className="text-sm text-zinc-400 mt-1">Share invite links to let your friends join.</p>
      </div>
      <InvitePanel sentInvites={sentInvites as any} />
    </div>
  );
}
