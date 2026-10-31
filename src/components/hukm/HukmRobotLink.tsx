"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import HukmRobot from "./HukmRobot";

// Inside the firm's admin area the robot opens the full «حُكم» workspace.
export default function HukmRobotLink() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin/hukm")) return null;
  return (
    <Link href="/admin/hukm" aria-label="افتح حُكم" className="lux-float fixed bottom-4 right-4 z-40 transition hover:scale-105 sm:bottom-6 sm:right-6">
      <HukmRobot size={68} className="drop-shadow-[0_12px_18px_rgba(5,10,25,0.45)]" />
    </Link>
  );
}
