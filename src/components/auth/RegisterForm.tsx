// components/auth/RegisterForm.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { redeemInvite } from "@/actions/invites";
import { auth } from "@/lib/firebase/config";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";

interface RegisterFormProps {
  token: string;
  prefillEmail?: string;
}

export function RegisterForm({ token, prefillEmail }: RegisterFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [fields, setFields] = useState({
    email: prefillEmail ?? "",
    password: "",
    username: "",
    displayName: "",
  });

  function updateField(key: keyof typeof fields) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setFields((prev) => ({ ...prev, [key]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await redeemInvite({ token, ...fields });

      if (!result.success) {
        setError(result.error);
        return;
      }

      try {
        const userCredential = await signInWithEmailAndPassword(auth, fields.email, fields.password);
        const idToken = await userCredential.user.getIdToken();
        
        const response = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken })
        });

        if (!response.ok) throw new Error();

        router.push("/feed");
        router.refresh();
      } catch (signInError) {
        router.push("/login?registered=true");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="displayName" className="text-zinc-200">Display Name</Label>
        <Input
          id="displayName"
          type="text"
          value={fields.displayName}
          onChange={updateField("displayName")}
          placeholder="Your Name"
          required
          disabled={isPending}
          className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-violet-500"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="username" className="text-zinc-200">Username</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">@</span>
          <Input
            id="username"
            type="text"
            value={fields.username}
            onChange={updateField("username")}
            placeholder="yourhandle"
            required
            disabled={isPending}
            className="pl-7 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-violet-500"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reg-email" className="text-zinc-200">Email</Label>
        <Input
          id="reg-email"
          type="email"
          value={fields.email}
          onChange={updateField("email")}
          placeholder="you@example.com"
          required
          disabled={isPending || !!prefillEmail}
          className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-violet-500 disabled:opacity-60"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="reg-password" className="text-zinc-200">Password</Label>
        <Input
          id="reg-password"
          type="password"
          value={fields.password}
          onChange={updateField("password")}
          placeholder="At least 8 characters"
          required
          minLength={8}
          disabled={isPending}
          className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-violet-500"
        />
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold"
      >
        {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account…</> : "Create Account"}
      </Button>
    </form>
  );
}
