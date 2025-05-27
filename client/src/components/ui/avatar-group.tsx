import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  avatars: {
    src?: string;
    initials: string;
    color?: string;
  }[];
  max?: number;
  size?: "sm" | "md" | "lg";
}

export function AvatarGroup({
  avatars,
  max = 3,
  size = "md",
  className,
  ...props
}: AvatarGroupProps) {
  const sizeClasses = {
    sm: "h-6 w-6 text-xs",
    md: "h-8 w-8 text-sm",
    lg: "h-10 w-10 text-base",
  };

  const visibleAvatars = avatars.slice(0, max);
  const remainingCount = avatars.length - max;

  return (
    <div
      className={cn("flex -space-x-2", className)}
      {...props}
    >
      {visibleAvatars.map((avatar, index) => (
        <Avatar
          key={index}
          className={cn(
            sizeClasses[size],
            "border-2 border-white",
            avatar.color || "bg-primary"
          )}
        >
          {avatar.src && <AvatarImage src={avatar.src} alt={avatar.initials} />}
          <AvatarFallback
            className={cn(
              "text-white",
              avatar.color || "bg-primary"
            )}
          >
            {avatar.initials}
          </AvatarFallback>
        </Avatar>
      ))}

      {remainingCount > 0 && (
        <Avatar
          className={cn(
            sizeClasses[size],
            "border-2 border-white bg-accent text-white"
          )}
        >
          <AvatarFallback className="bg-accent text-white">
            +{remainingCount}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
