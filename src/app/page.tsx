// app/page.tsx — Root redirect to /feed or /login
import { redirect } from "next/navigation";
import { getOptionalUser } from "@/lib/auth";

export default async function RootPage() {
  const user = await getOptionalUser();
  redirect(user ? "/feed" : "/login");
}

