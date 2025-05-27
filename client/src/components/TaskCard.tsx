import { Task } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Project, User } from "@shared/schema";
import UserAvatar from "@/components/UserAvatar";

interface TaskCardProps {
  task: Task;
  onDragStart?: () => void;
}

export default function TaskCard({ task, onDragStart }: TaskCardProps) {
  // Fetch project for this task
  const { data: project } = useQuery<Project>({
    queryKey: ["/api/projects", task.projectId],
  });
  
  // Fetch assignee if assigned
  const { data: assignee } = useQuery<User>({
    queryKey: ["/api/users", task.assigneeId],
    enabled: !!task.assigneeId,
  });
  
  // Helper to get priority badge
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded-full text-xs">High</span>;
      case "medium":
        return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs">Medium</span>;
      case "low":
        return <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">Low</span>;
      default:
        return <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded-full text-xs">{priority}</span>;
    }
  };
  
  // Helper to get due date text
  const getDueText = (dueDate: string | null) => {
    if (!dueDate) return "No due date";
    
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return "Overdue";
    if (diffDays === 0) return "Due today";
    if (diffDays === 1) return "Due tomorrow";
    return `Due in ${diffDays} days`;
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-grab task-card"
    >
      <div className="flex justify-between items-start">
        <h4 className="font-medium">{task.title}</h4>
        {getPriorityBadge(task.priority)}
      </div>
      
      <p className="text-sm text-gray-600 mt-1">
        {task.description?.length > 60
          ? `${task.description.substring(0, 60)}...`
          : task.description || "No description"}
      </p>
      
      {project && (
        <p className="text-xs text-gray-500 mt-2">
          {project.name}
        </p>
      )}
      
      <div className="flex justify-between items-center mt-3">
        <span className="text-xs text-gray-500">
          {task.dueDate ? getDueText(task.dueDate) : "No due date"}
        </span>
        
        {task.assigneeId && (
          <UserAvatar userId={task.assigneeId} size="sm" />
        )}
      </div>
    </div>
  );
}
