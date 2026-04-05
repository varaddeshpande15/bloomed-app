import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import Link from "next/link";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/tests", label: "Tests" },
  { href: "/reports", label: "Reports" },
  { href: "/play", label: "Play game" },
  { href: "/roadmap", label: "Learn a topic" },
  { href: "/explore", label: "Explore" },
  { href: "/starter", label: "Starter" },
  { href: "/history", label: "History" },
  { href: "/profile", label: "Profile" },
];

const MobileDrawer = () => {
  return (
    <Sheet>
      <SheetTrigger>
        <Menu className="mr-2 h-6 w-6" />
      </SheetTrigger>
      <SheetContent
        side="left"
        className="flex h-full flex-col items-stretch justify-start gap-1 pt-10"
      >
        {links.map((l) => (
          <SheetClose asChild key={l.href}>
            <Link
              href={l.href}
              className="rounded-lg border-2 border-transparent px-3 py-2 font-semibold hover:bg-muted"
            >
              {l.label}
            </Link>
          </SheetClose>
        ))}
      </SheetContent>
    </Sheet>
  );
};

export default MobileDrawer;
