// app/(auth)/register/page.tsx
import { RegisterForm } from "@/components/auth/RegisterForm";
import { redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account — Social Friends",
};

export default async function RegisterPage({ searchParams }: { searchParams: { token?: string } }) {
  const { token } = searchParams;

  if (!token) redirect("/login");

  const inviteDoc = await adminDb.collection("inviteTokens").doc(token).get();
  
  if (!inviteDoc.exists) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-white">Invalid Invite</h1>
          <p className="text-zinc-400">This invite link is invalid or does not exist.</p>
        </div>
      </main>
    );
  }

  const invite = inviteDoc.data()!;

  if (invite.usedAt) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-white">Invite Already Used</h1>
          <p className="text-zinc-400">This invite link has already been redeemed.</p>
        </div>
      </main>
    );
  }

  if (invite.expiresAt.toDate() < new Date()) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-white">Invite Expired</h1>
          <p className="text-zinc-400">This invite link has expired. Ask a friend for a new one.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">Join the crew 🎉</h1>
          <p className="text-sm text-zinc-400">You have been invited. Create your account below.</p>
        </div>
        <RegisterForm token={token} prefillEmail={invite.email ?? undefined} />
      </div>
    </main>
  );
}
