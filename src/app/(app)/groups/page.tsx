// app/(app)/groups/page.tsx
import { requireAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase/admin";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, ChevronRight, Lock } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Groups — Social Friends",
};

export default async function GroupsPage() {
  const currentUser = await requireAuth();

  const membershipsSnapshot = await adminDb.collection("groupMembers")
    .where("userId", "==", currentUser.id)
    .orderBy("joinedAt", "desc")
    .get();

  const memberships = await Promise.all(
    membershipsSnapshot.docs.map(async (doc) => {
      const data = doc.data();
      const groupDoc = await adminDb.collection("groups").doc(data.groupId).get();
      return {
        role: data.role,
        group: { id: groupDoc.id, ...groupDoc.data() } as any,
      };
    })
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Your Groups</h1>
      </div>

      {memberships.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
          <Users className="h-10 w-10 text-zinc-700" />
          <p className="text-zinc-400 font-medium">No groups yet</p>
          <p className="text-sm text-zinc-600">Ask an admin to add you to a group.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {memberships.map(({ group, role }) => (
            <Link
              key={group.id}
              href={`/groups/${group.slug}`}
              className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-zinc-700 hover:bg-zinc-800/50"
            >
              <Avatar className="h-12 w-12 border border-zinc-700 flex-shrink-0">
                <AvatarFallback className="bg-violet-900/50 text-violet-300 font-bold">
                  {group.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-white text-sm">{group.name}</p>
                  {group.isPrivate && <Lock className="h-3 w-3 text-zinc-500 flex-shrink-0" />}
                  {role === "ADMIN" && <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px] h-4">Admin</Badge>}
                </div>
                {group.description && <p className="text-xs text-zinc-500 mt-0.5 truncate">{group.description}</p>}
                <p className="text-xs text-zinc-600 mt-1">
                  {group.memberCount} members · {group.postCount} posts
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-zinc-600 flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
