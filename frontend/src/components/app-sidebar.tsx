"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavUserClerk } from "@/components/nav-user-clerk";
import { ModeToggle } from "@/components/app/mode-toggle";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  BookOpenIcon,
  ClipboardListIcon,
  CompassIcon,
  Gamepad2Icon,
  HistoryIcon,
  LayoutDashboardIcon,
  ScrollTextIcon,
  SparklesIcon,
  UserCircleIcon,
  ZapIcon,
} from "lucide-react";

const main = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboardIcon },
  { title: "Tests", url: "/tests", icon: ClipboardListIcon },
  { title: "Reports", url: "/reports", icon: ScrollTextIcon },
  { title: "Play game", url: "/play", icon: Gamepad2Icon },
  { title: "Learn a topic", url: "/roadmap", icon: BookOpenIcon },
  { title: "Explore", url: "/explore", icon: CompassIcon },
  // { title: "Starter", url: "/starter", icon: ZapIcon },
];

const secondary = [
  { title: "History", url: "/history", icon: HistoryIcon },
  { title: "Profile", url: "/profile", icon: UserCircleIcon },
];

function pathActive(pathname: string, url: string) {
  if (url === "/dashboard") {
    return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  }
  if (url === "/tests") {
    return (
      pathname === "/tests" ||
      pathname.startsWith("/tests/") ||
      pathname.startsWith("/tests?")
    );
  }
  if (url === "/reports") {
    return pathname === "/reports" || pathname.startsWith("/reports/");
  }
  if (url === "/play") {
    return pathname === "/play" || pathname.startsWith("/play/");
  }
  return pathname === url || pathname.startsWith(`${url}/`);
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname() ?? "";

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="min-h-[3.25rem]">
              <Link href="/dashboard">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border-2 border-sidebar-border bg-sidebar-primary text-sidebar-primary-foreground md:size-11">
                  <SparklesIcon className="size-5 md:size-6" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate text-base font-bold tracking-tight">BloomEd</span>
                  <span className="truncate text-xs text-muted-foreground">
                    Adaptive learning
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigate</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {main.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathActive(pathname, item.url)}
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondary.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathActive(pathname, item.url)}
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="gap-2 border-t border-sidebar-border p-2">
        <div className="flex items-center justify-center px-2 group-data-[collapsible=icon]:hidden">
          <ModeToggle />
        </div>
        <NavUserClerk />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
