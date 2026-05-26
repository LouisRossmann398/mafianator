import { Outlet, Link } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { Settings, LogOut } from "lucide-react";
import { useAuth } from "@/api/auth";
import { Button } from "@/components/ui/button";

export function AppShell() {
  const { user, logout } = useAuth();
  const canAdmin = user?.role === "admin" || user?.role === "treasurer";

  return (
    <div className="flex min-h-full flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur safe-top">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-black">
              M
            </div>
            <div className="leading-tight">
              <div className="text-sm font-bold">Mafianator</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                SV Petershausen
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-1">
            {canAdmin && (
              <Link to="/admin">
                <Button size="icon" variant="ghost" aria-label="Admin">
                  <Settings size={18} />
                </Button>
              </Link>
            )}
            <Button size="icon" variant="ghost" onClick={logout} aria-label="Abmelden">
              <LogOut size={18} />
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-4">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
