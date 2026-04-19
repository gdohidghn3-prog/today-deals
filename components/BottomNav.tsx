"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Fuel, Store, Sparkles, Ticket, Info } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "통신사", icon: Home },
  { href: "/convenience", label: "편의점", icon: Store },
  { href: "/oliveyoung", label: "올리브영", icon: Sparkles },
  { href: "/culture", label: "문화", icon: Ticket },
  { href: "/gas", label: "주유", icon: Fuel },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E2E8F0] z-30">
      <div className="max-w-3xl mx-auto flex">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors ${
                isActive ? "text-[#FF6B35]" : "text-[#94A3B8]"
              }`}
            >
              <Icon size={20} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
