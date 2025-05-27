import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  user?: User | null;
  userId?: number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function UserAvatar({ user, userId, size = "md", className }: UserAvatarProps) {
  // If user ID is provided but not user data, fetch the user
  const { data: fetchedUser } = useQuery<User>({
    queryKey: ["/api/users", userId],
    enabled: !!userId && !user,
  });
  
  // Use provided user or fetched user
  const userToDisplay = user || fetchedUser;
  
  // Get initials from user
  const getInitials = (user?: User | null): string => {
    if (!user) return "U";
    
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`;
    }
    
    return user.username?.substring(0, 2).toUpperCase() || "U";
  };
  
  // Determine avatar size
  const sizeClasses = {
    sm: "h-6 w-6 text-xs",
    md: "h-8 w-8 text-sm",
    lg: "h-10 w-10 text-base",
  };
  
  // Generate a color based on user ID or name
  const getColor = (user?: User | null): string => {
    if (!user) return "bg-primary";
    
    const colors = [
      "bg-primary", "bg-secondary", "bg-accent", 
      "bg-blue-500", "bg-green-500", "bg-purple-500",
      "bg-red-500", "bg-yellow-500", "bg-indigo-500"
    ];
    
    // Use user ID or username to pick a color
    const index = user.id ? user.id % colors.length : (user.username?.length || 0) % colors.length;
    return colors[index];
  };

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {userToDisplay?.profileImageUrl && (
        <AvatarImage 
          src={userToDisplay.profileImageUrl} 
          alt={`${userToDisplay.firstName || ''} ${userToDisplay.lastName || ''}`} 
        />
      )}
      <AvatarFallback className={cn("text-white", getColor(userToDisplay))}>
        {getInitials(userToDisplay)}
      </AvatarFallback>
    </Avatar>
  );
}
