import React, { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { Menu, X, Home, FolderOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navItems = [
  { label: "דשבורד", path: "/", icon: Home },
  { label: "הפרויקטים שלי", path: "/projects", icon: FolderOpen },
  { label: "בריף חדש", path: "/new-project", icon: Plus },
];

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen w-full bg-background font-heebo overflow-x-hidden" dir="rtl">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 h-14 w-full max-w-[430px] mx-auto">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 font-heebo" dir="rtl">
              <div className="flex flex-col gap-2 mt-8">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-medium
                      ${location.pathname === item.path 
                        ? "bg-primary/10 text-primary" 
                        : "text-foreground hover:bg-muted"
                      }`}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                ))}
              </div>
            </SheetContent>
          </Sheet>

          <Link to="/" className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-foreground">Briefi</span>
          </Link>

          <div className="w-10" />
        </div>
      </header>

      <main className="w-full max-w-[430px] mx-auto px-4 pb-24 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}