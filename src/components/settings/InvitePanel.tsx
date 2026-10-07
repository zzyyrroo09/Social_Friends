// components/settings/InvitePanel.tsx
"use client";

import { useState, useTransition } from "react";
import { createInviteToken } from "@/actions/invites";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, Check, Loader2, Mail, Clock, CheckCircle2, XCircle } from "lucide-react";
import { formatDistanceToNow, isPast } from "date-fns";
import { cn } from "@/lib/utils";

type SentInvite = {
  id: string;
  email: string | null;
  expiresAt: string;
  usedAt: string | null;
  recipient: { displayName: string; username: string } | null;
};

interface InvitePanelProps {
  sentInvites: SentInvite[];
}

export function InvitePanel({ sentInvites: initialInvites }: InvitePanelProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [invites, setInvites] = useState(initialInvites);
  const [isPending, startTransition] = useTransition();

  function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGeneratedUrl(null);

    startTransition(async () => {
      const result = await createInviteToken({ email: email.trim() || undefined });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setGeneratedUrl(result.data.inviteUrl);
      setEmail("");
    });
  }

  async function handleCopy() {
    if (!generatedUrl) return;
    await navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-300">Generate New Invite</h2>
        <form onSubmit={handleGenerate} className="space-y-3">
          {error && (
            <Alert variant="destructive" className="py-2">
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="invite-email" className="text-xs text-zinc-400">Email (optional)</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="friend@example.com"
              disabled={isPending}
              className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-violet-500"
            />
          </div>
          <Button type="submit" disabled={isPending} size="sm" className="bg-violet-600 hover:bg-violet-500 text-white font-semibold gap-2">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Mail className="h-3.5 w-3.5" />Generate invite link</>}
          </Button>
        </form>
        {generatedUrl && (
          <div className="mt-3 rounded-lg border border-violet-800/50 bg-violet-950/20 p-3 space-y-2">
            <p className="text-xs text-violet-300 font-medium">✅ Invite link ready — share this link:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs text-zinc-300 bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 overflow-hidden text-ellipsis whitespace-nowrap">{generatedUrl}</code>
              <Button type="button" variant="outline" size="icon" onClick={handleCopy} className="h-8 w-8 border-zinc-700 text-zinc-400 hover:text-white hover:border-violet-500 flex-shrink-0">
                {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        )}
      </div>
      {invites.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Sent Invites</h2>
          {invites.map((invite) => {
            const expired = isPast(new Date(invite.expiresAt)) && !invite.usedAt;
            return (
              <div key={invite.id} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/30 p-3">
                <div className="flex-1 min-w-0 space-y-0.5">
                  {invite.email ? <p className="text-sm text-zinc-300 truncate">{invite.email}</p> : <p className="text-sm text-zinc-600 italic">No email specified</p>}
                  <p className="text-xs text-zinc-600 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {expired ? "Expired" : invite.usedAt ? `Used ${formatDistanceToNow(new Date(invite.usedAt), { addSuffix: true })}` : `Expires ${formatDistanceToNow(new Date(invite.expiresAt), { addSuffix: true })}`}
                  </p>
                </div>
                {invite.recipient ? (
                  <div className="text-right">
                    <Badge className="bg-green-900/30 text-green-400 border-green-800/50 gap-1 text-[10px]"><CheckCircle2 className="h-2.5 w-2.5" />Joined</Badge>
                    <p className="text-xs text-zinc-600 mt-0.5">@{invite.recipient.username}</p>
                  </div>
                ) : expired ? (
                  <Badge variant="outline" className="border-zinc-700 text-zinc-500 gap-1 text-[10px]"><XCircle className="h-2.5 w-2.5" />Expired</Badge>
                ) : (
                  <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-[10px]">Pending</Badge>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
