import { Link, useRoute } from "wouter";
import { LayoutGrid, Receipt, TrendingUp, BarChart2, Settings } from "lucide-react";

const tabs = [
  { href: "/", label: "Home", icon: LayoutGrid },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/income", label: "Income", icon: TrendingUp },
  { href: "/reports", label: "Reports", icon: BarChart2 },
  { href: "/more", label: "More", icon: Settings },
];

function NavTab({ href, label, Icon }: { href: string; label: string; Icon: any }) {
  const [active] = useRoute(href === "/" ? "/" : `${href}*`);
  return (
    <Link href={href} className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 relative">
      {active && (
        <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />
      )}
      <Icon size={22} className={active ? "text-primary" : "text-muted-foreground"} strokeWidth={active ? 2.5 : 1.8} />
      <span className={`text-[10px] font-medium ${active ? "text-primary font-semibold" : "text-muted-foreground"}`}>
        {label}
      </span>
    </Link>
  );
}

export default function BottomNav() {
  return (
    <div
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 flex border-t border-border bg-card"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)", height: "calc(64px + env(safe-area-inset-bottom, 0px))" }}
    >
      {tabs.map(({ href, label, icon: Icon }) => (
        <NavTab key={href} href={href} label={label} Icon={Icon} />
      ))}
    </div>
  );
}
