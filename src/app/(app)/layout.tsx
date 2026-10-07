// app/(app)/layout.tsx — Authenticated app shell with sidebar
import { requireAuth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { getTopHighlightForUser } from "@/lib/queries/highlights";
import { HighlightBanner } from "@/components/feed/HighlightBanner";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await requireAuth();
  const highlight = await getTopHighlightForUser(currentUser.id, 7);

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      {/* Sidebar navigation */}
      <Sidebar currentUser={currentUser} />

      {/* Main content area */}
      <div className="flex flex-1 flex-col md:ml-64">
        {/* Top Highlight banner — only shown when there's a top post */}
        {highlight && (
          <HighlightBanner post={highlight} currentUserId={currentUser.id} />
        )}

        <main className="flex-1 px-4 py-6 md:px-8 max-w-2xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

