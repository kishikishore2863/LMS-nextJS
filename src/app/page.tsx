import { redirect } from "next/navigation";

/** proxy.ts redirects "/" to the role home; this is the fallback. */
export default function Home() {
  redirect("/login");
}
