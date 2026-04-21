"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Cake } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import BirthdayDrawer from "./BirthdayDrawer";

const HIDDEN_PATH_PREFIXES = ["/admin", "/deals/"];

export default function BirthdayFab() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (!pathname) return null;
  if (HIDDEN_PATH_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  const handleOpen = () => {
    setOpen(true);
    trackEvent("birthday_fab_open", { from: pathname ?? "" });
  };

  return (
    <>
      <button
        onClick={handleOpen}
        aria-label="내 생일 혜택"
        className="fixed right-4 bottom-20 z-40 w-12 h-12 rounded-full bg-[#FF6B35] text-white shadow-lg hover:bg-[#E55A2B] active:scale-95 transition-transform flex items-center justify-center"
      >
        <Cake size={22} />
      </button>
      <BirthdayDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
