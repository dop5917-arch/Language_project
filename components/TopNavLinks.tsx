"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TopNavLinks() {
  const pathname = usePathname();

  if (pathname === "/decks") {
    return null;
  }

  return (
    <Link href="/review/all" className="text-sm">
      Global Review
    </Link>
  );
}
