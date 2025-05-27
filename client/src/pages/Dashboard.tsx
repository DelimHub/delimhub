import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils/formatDate";
import CreateTaskModal from "@/components/CreateTaskModal";
import { useState } from "react";
import { Activity, Project, Task } from "@shared/schema";
import { Calendar, Clock, CheckCircle, User, AlertTriangle, Filter, Search } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  // Fetch user's projects
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to load projects. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Fetch user's tasks
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to load tasks. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Fetch recent activities
  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ["/api/activities", { limit: 4 }],
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to load activities. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Calculate stats
  const stats = {
    activeProjects: projects.filter(p => p.status === "active").length,
    completedTasks: tasks.filter(t => t.status === "completed").length,
    inProgressTasks: tasks.filter(t => t.status === "in_progress").length,
    overdueTasks: tasks.filter(t => {
      if (!t.dueDate) return false;
      return new Date(t.dueDate) < new Date() && t.status !== "completed";
    }).length,
  };

  // Get upcoming tasks (sorted by due date)
  const upcomingTasks = [...tasks]
    .filter(t => t.status !== "completed")
    .sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    })
    .slice(0, 3);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Input placeholder="Search..." className="pl-10" />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          </div>
          
          <UserAvatar user={user} />
        </div>
      </div>
      
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={<div className="p-3 rounded-full bg-blue-100"><Calendar className="h-5 w-5 text-primary" /></div>}
          label="Active Projects"
          value={stats.activeProjects.toString()}
        />
        <StatCard
          icon={<div className="p-3 rounded-full bg-green-100"><CheckCircle className="h-5 w-5 text-success" /></div>}
          label="Tasks Completed"
          value={stats.completedTasks.toString()}
        />
        <StatCard
          icon={<div className="p-3 rounded-full bg-yellow-100"><Clock className="h-5 w-5 text-warning" /></div>}
          label="Tasks In Progress"
          value={stats.inProgressTasks.toString()}
        />
        <StatCard
          icon={<div className="p-3 rounded-full bg-red-100"><AlertTriangle className="h-5 w-5 text-error" /></div>}
          label="Overdue Tasks"
          value={stats.overdueTasks.toString()}
        />
      </div>
      
      {/* Recent Activity and Upcoming Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Recent Activity */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-lg mb-4">Recent Activity</h3>
            
            <div className="space-y-4">
              {activities.length > 0 ? (
                activities.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))
              ) : (
                <p className="text-gray-500 text-sm">No recent activities</p>
              )}
            </div>
            
            <Button variant="link" className="text-primary text-sm mt-4 p-0">
              View all activity
            </Button>
          </CardContent>
        </Card>
        
        {/* Upcoming Tasks */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-lg mb-4">Your Upcoming Tasks</h3>
            
            <div className="space-y-3">
              {upcomingTasks.length > 0 ? (
                upcomingTasks.map((task) => (
                  <UpcomingTaskItem key={task.id} task={task} />
                ))
              ) : (
                <p className="text-gray-500 text-sm">No upcoming tasks</p>
              )}
            </div>
            
            <Button 
              onClick={() => setIsTaskModalOpen(true)}
              className="bg-primary hover:bg-secondary text-white rounded-lg mt-4 flex items-center"
            >
              <Plus className="h-4 w-4 mr-1" /> Add New Task
            </Button>
          </CardContent>
        </Card>
      </div>
      
      {/* Project Progress */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <h3 className="font-semibold text-lg mb-4">Project Progress</h3>
          
          <div className="space-y-6">
            {projects.length > 0 ? (
              projects.slice(0, 4).map((project) => (
                <ProjectProgressItem key={project.id} project={project} />
              ))
            ) : (
              <p className="text-gray-500 text-sm">No projects found</p>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Create Task Modal */}
      <CreateTaskModal 
        isOpen={isTaskModalOpen} 
        onClose={() => setIsTaskModalOpen(false)} 
        projects={projects}
      />
    </div>
  );
}

// Helper Components
function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }) {
  return (
    <input
      className={`px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${className}`}
      {...props}
    />
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center">
          {icon}
          <div className="ml-4">
            <p className="text-gray-500 text-sm">{label}</p>
            <p className="text-2xl font-semibold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityItem({ activity }: { activity: Activity }) {
  // Map activity types to appropriate icons and colors
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'task_created':
        return <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center"><User className="h-5 w-5 text-primary" /></div>;
      case 'task_updated':
        return <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center"><CheckCircle className="h-5 w-5 text-success" /></div>;
      case 'task_deleted':
        return <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center"><AlertTriangle className="h-5 w-5 text-error" /></div>;
      default:
        return <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center"><Calendar className="h-5 w-5 text-secondary" /></div>;
    }
  };

  return (
    <div className="flex items-start">
      {getActivityIcon(activity.type)}
      <div className="ml-3">
        <p className="text-sm font-medium">{activity.description}</p>
        <p className="text-xs text-gray-500 mt-1">{formatDate(activity.createdAt)}</p>
      </div>
    </div>
  );
}

function UpcomingTaskItem({ task }: { task: Task }) {
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-800">High</span>;
      case 'medium':
        return <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">Medium</span>;
      case 'low':
        return <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">Low</span>;
      default:
        return <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-800">{priority}</span>;
    }
  };

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
    <div className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition duration-150 task-card">
      <div className="flex justify-between">
        <h4 className="font-medium">{task.title}</h4>
        {getPriorityBadge(task.priority)}
      </div>
      <p className="text-sm text-gray-600 mt-1">{task.description || "No description"}</p>
      <div className="flex justify-between items-center mt-2">
        <span className="text-xs text-gray-500">{getDueText(task.dueDate)}</span>
        <UserAvatar userId={task.assigneeId} size="sm" />
      </div>
    </div>
  );
}

function ProjectProgressItem({ project }: { project: Project }) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium">{project.name}</span>
        <span className="text-sm text-gray-500">{project.progress}%</span>
      </div>
      <Progress value={project.progress} className="h-2" />
    </div>
  );
}

function Plus(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      {...props}
    >
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  );
}
