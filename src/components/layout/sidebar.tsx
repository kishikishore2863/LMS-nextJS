"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { GraduationCap, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/server/auth/roles";
import { NAV, ROLE_LABEL } from "./nav";

/** Sidebar with the active item derived from the URL (render inside <Suspense>). */
export function ActiveSidebar(props: { role: Role; footer?: ReactNode }) {
  return <Sidebar {...props} pathname={usePathname()} />;
}

export function Sidebar({ role, footer, pathname = "" }: { role: Role; footer?: ReactNode; pathname?: string }) {
  const [open, setOpen] = useState(false);
  const items = NAV[role];
  const home = items[0]!.href;

  const nav = (
    <nav aria-label={`${ROLE_LABEL[role]} navigation`} className="flex flex-1 flex-col gap-0.5 p-3">
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === home ? pathname === href : pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition",
              active ? "bg-primary-soft font-medium text-primary" : "text-muted hover:bg-primary-soft/60 hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  const brand = (
    <Link href={home} className="flex items-center gap-2 px-5 py-4 font-semibold">
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-white"><GraduationCap className="size-4" aria-hidden /></span>
      Learnly
      <span className="ml-auto rounded-md bg-primary-soft px-1.5 py-0.5 text-[11px] font-medium text-primary">{ROLE_LABEL[role]}</span>
    </Link>
  );

  return (
    <>
      <button
        className="fixed left-3 top-3 z-40 rounded-lg border border-border bg-card p-2 lg:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
      >
        <Menu className="size-4" />
      </button>
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-card lg:flex">
        {brand}
        {nav}
        {footer}
      </aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-64 flex-col bg-card">
            <button className="absolute right-3 top-4 p-1" onClick={() => setOpen(false)} aria-label="Close navigation">
              <X className="size-4" />
            </button>
            {brand}
            {nav}
            {footer}
          </aside>
        </div>
      )}
    </>
  );
}
