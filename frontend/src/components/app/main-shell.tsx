"use client";

import { AppSidebar } from "@/components/app-sidebar";
import AppBar from "@/components/app/appbar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";

/**
 * Marketing + auth + immersive onboarding render without the dashboard chrome.
 * App routes keep the same sidebar + header as before.
 */
export function MainShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const bare = [
    "/",
    "/sign-in",
    "/sign-up",
    "/onboarding",
  ].some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (bare) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard">BloomEd</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="max-w-[12rem] truncate md:max-w-md">
                    {pathname.startsWith("/roadmap")
                      ? "Roadmap"
                      : pathname.startsWith("/history")
                        ? "History"
                        : pathname.startsWith("/dashboard")
                          ? "Dashboard"
                          : pathname.startsWith("/profile")
                            ? "Profile"
                            : pathname.startsWith("/reports")
                              ? "Reports"
                              : pathname.startsWith("/play")
                                ? "Play game"
                                : pathname.startsWith("/tests/") && pathname !== "/tests/new"
                                  ? "Test report"
                                  : pathname.startsWith("/tests")
                                    ? "Tests"
                                    : "App"}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <AppBar />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
