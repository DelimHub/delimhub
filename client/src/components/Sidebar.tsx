import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Folder,
  CheckSquare,
  Calendar,
  MessageSquare,
  Users,
  Settings,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  
  const isAdmin = user?.role === "admin";

  // Navigation items
  const mainNavItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      title: "Projects",
      href: "/projects",
      icon: <Folder className="h-5 w-5" />,
    },
    {
      title: "Tasks",
      href: "/tasks",
      icon: <CheckSquare className="h-5 w-5" />,
    },
    {
      title: "Calendar",
      href: "/calendar",
      icon: <Calendar className="h-5 w-5" />,
    },
    {
      title: "Team Chat",
      href: "/chat",
      icon: <MessageSquare className="h-5 w-5" />,
    },
  ];
  
  const adminNavItems = [
    {
      title: "Manage Users",
      href: "/users",
      icon: <Users className="h-5 w-5" />,
    },
  ];
  
  const accountNavItems = [
    {
      title: "Settings",
      href: "/settings",
      icon: <Settings className="h-5 w-5" />,
    },
  ];

  // Helper to check if a nav item is active
  const isActive = (href: string) => {
    return location === href;
  };

  return (
    <aside className="w-64 bg-white shadow-lg h-full flex flex-col">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-primary">DelimHub</h1>
      </div>
      
      <nav className="flex-1 mt-6 px-3">
        <div className="space-y-6">
          <div>
            <div className="px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Main
            </div>
            <div className="space-y-1">
              {mainNavItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <a className={cn(
                    "flex items-center px-4 py-3 rounded-md text-sm font-medium transition-colors",
                    isActive(item.href)
                      ? "bg-primary text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  )}>
                    {item.icon}
                    <span className="ml-3">{item.title}</span>
                  </a>
                </Link>
              ))}
            </div>
          </div>
          
          {isAdmin && (
            <div>
              <div className="px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Admin
              </div>
              <div className="space-y-1">
                {adminNavItems.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <a className={cn(
                      "flex items-center px-4 py-3 rounded-md text-sm font-medium transition-colors",
                      isActive(item.href)
                        ? "bg-primary text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    )}>
                      {item.icon}
                      <span className="ml-3">{item.title}</span>
                    </a>
                  </Link>
                ))}
              </div>
            </div>
          )}
          
          <div>
            <div className="px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Account
            </div>
            <div className="space-y-1">
              {accountNavItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <a className={cn(
                    "flex items-center px-4 py-3 rounded-md text-sm font-medium transition-colors",
                    isActive(item.href)
                      ? "bg-primary text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  )}>
                    {item.icon}
                    <span className="ml-3">{item.title}</span>
                  </a>
                </Link>
              ))}
              <Button
                variant="ghost"
                className="w-full justify-start px-4 py-3 text-gray-700 hover:bg-gray-100"
                onClick={logout}
              >
                <LogOut className="h-5 w-5" />
                <span className="ml-3">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </nav>
    </aside>
  );
}
