import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

interface User {
  id: number;
  username: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: string;
  profileImageUrl?: string;
  token?: string;
}

interface LoginCredentials {
  username: string;
  password: string;
}

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  
  // Check if user is authenticated (token in localStorage)
  useEffect(() => {
    const token = localStorage.getItem("delimhub_token");
    setIsAuthenticated(!!token);
  }, []);
  
  // Get user data from localStorage
  const getUserFromLocalStorage = (): User | null => {
    const userJson = localStorage.getItem("delimhub_user");
    if (userJson) {
      return JSON.parse(userJson);
    }
    return null;
  };
  
  // Query to get current user data
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const token = localStorage.getItem("delimhub_token");
      if (!token) return null;
      
      // Just return user data from localStorage since we don't have a dedicated endpoint
      return getUserFromLocalStorage();
    },
    enabled: isAuthenticated,
  });
  
  // Login mutation
  const login = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const response = await apiRequest("POST", "/api/auth/login", credentials);
      return await response.json();
    },
    onSuccess: (data: User) => {
      // Store token and user data in localStorage
      localStorage.setItem("delimhub_token", data.token!);
      localStorage.setItem("delimhub_user", JSON.stringify(data));
      setIsAuthenticated(true);
      
      // Invalidate user query to refetch user data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      // Navigate to dashboard
      window.location.href = "/dashboard";
    }
  });
  
  // Logout function
  const logout = () => {
    localStorage.removeItem("delimhub_token");
    localStorage.removeItem("delimhub_user");
    setIsAuthenticated(false);
    
    // Clear query cache
    queryClient.clear();
    
    // Navigate to login
    window.location.href = "/login";
  };
  
  return {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
  };
}
