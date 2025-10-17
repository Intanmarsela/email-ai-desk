import { Outlet, Link, useLocation } from "react-router-dom";
import { Bot, Ticket, Users, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const Layout = () => {
  const location = useLocation();

  const navigation = [
    { name: "Tickets", href: "/tickets", icon: Ticket },
    { name: "People", href: "/people", icon: Users },
  ];

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    window.location.href = "/";
  };

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-64 border-r bg-card flex flex-col">
        <div className="p-6 border-b">
          <Link to="/tickets" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <div className="font-bold text-lg">SwiftResolve</div>
              <div className="text-xs text-muted-foreground">AI Support Routing</div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navigation.map((item) => {
            const isActive = location.pathname.startsWith(item.href);
            return (
              <Link key={item.name} to={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
};
