import { Project } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AvatarGroup } from "@/components/ui/avatar-group";
import { MoreVertical } from "lucide-react";
import { formatDate } from "@/lib/utils/formatDate";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { Button } from "@/components/ui/button";

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  // Fetch project members
  const { data: members = [] } = useQuery<User[]>({
    queryKey: ["/api/projects", project.id, "members"],
  });
  
  // Create avatar data for the avatar group
  const avatarData = members.map(member => ({
    initials: getInitials(member),
    src: member.profileImageUrl,
  }));
  
  // Helper to get initials from user
  function getInitials(user: User): string {
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`;
    }
    return user.username.substring(0, 2).toUpperCase();
  }
  
  // Project status badge
  function getStatusBadge(status: string) {
    switch (status) {
      case "active":
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Active</span>;
      case "completed":
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">Completed</span>;
      case "planning":
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Planning</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">{status}</span>;
    }
  }
  
  // Generate a background color based on project name (for projects without images)
  const getBackgroundColor = (name: string) => {
    const colors = [
      "bg-blue-100", "bg-purple-100", "bg-green-100", 
      "bg-yellow-100", "bg-red-100", "bg-indigo-100"
    ];
    const index = name.length % colors.length;
    return colors[index];
  };

  return (
    <Card className="overflow-hidden transition-transform transform hover:translate-y-[-2px] hover:shadow-lg">
      {/* Project image or colored background */}
      <div className={`w-full h-40 ${getBackgroundColor(project.name)} flex items-center justify-center`}>
        <span className="text-4xl font-bold text-gray-500 opacity-30">
          {project.name.substring(0, 2).toUpperCase()}
        </span>
      </div>
      
      <CardContent className="p-5">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-lg">{project.name}</h3>
            <p className="text-sm text-gray-600 mt-1">
              {project.dueDate ? `Due ${formatDate(project.dueDate)}` : "No due date"}
            </p>
          </div>
          {getStatusBadge(project.status)}
        </div>
        
        <p className="text-gray-600 text-sm mt-3 min-h-[40px]">
          {project.description || "No description provided"}
        </p>
        
        <div className="mt-4">
          <div className="flex justify-between mb-1">
            <span className="text-xs text-gray-500">Progress</span>
            <span className="text-xs text-gray-500">{project.progress}%</span>
          </div>
          <Progress value={project.progress || 0} className="h-1.5" />
        </div>
        
        <div className="mt-4 flex justify-between items-center">
          <AvatarGroup avatars={avatarData} max={3} />
          
          <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
