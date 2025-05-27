import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Projects from "@/pages/Projects";
import Tasks from "@/pages/Tasks";
import Calendar from "@/pages/Calendar";
import Chat from "@/pages/Chat";
import Users from "@/pages/Users";
import Settings from "@/pages/Settings";
import Layout from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

function ProtectedRoute({ component: Component, adminOnly = false }: { component: React.ComponentType, adminOnly?: boolean }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/login");
    } else if (adminOnly && user?.role !== "admin") {
      setLocation("/dashboard");
    }
  }, [isLoading, isAuthenticated, user, adminOnly, setLocation]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  if (adminOnly && user?.role !== "admin") {
    return null;
  }

  return <Component />;
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();

  // Redirect to dashboard if logged in and trying to access login page
  useEffect(() => {
    if (!isLoading && isAuthenticated && location === "/login") {
      window.location.href = "/dashboard";
    }
  }, [isLoading, isAuthenticated, location]);

  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      <Route path="/dashboard">
        <Layout>
          <ProtectedRoute component={Dashboard} />
        </Layout>
      </Route>
      
      <Route path="/projects">
        <Layout>
          <ProtectedRoute component={Projects} />
        </Layout>
      </Route>
      
      <Route path="/tasks">
        <Layout>
          <ProtectedRoute component={Tasks} />
        </Layout>
      </Route>
      
      <Route path="/calendar">
        <Layout>
          <ProtectedRoute component={Calendar} />
        </Layout>
      </Route>
      
      <Route path="/chat">
        <Layout>
          <ProtectedRoute component={Chat} />
        </Layout>
      </Route>
      
      <Route path="/users">
        <Layout>
          <ProtectedRoute component={Users} adminOnly={true} />
        </Layout>
      </Route>
      
      <Route path="/settings">
        <Layout>
          <ProtectedRoute component={Settings} />
        </Layout>
      </Route>
      
      <Route path="/">
        {!isLoading && isAuthenticated ? (
          <Layout>
            <ProtectedRoute component={Dashboard} />
          </Layout>
        ) : (
          <Login />
        )}
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
