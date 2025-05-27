import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { Task, Project } from "@shared/schema";
import { Plus, List, Clock, CheckCircle } from "lucide-react";
import CreateTaskModal from "@/components/CreateTaskModal";
import TaskCard from "@/components/TaskCard";

export default function Tasks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  
  // Fetch tasks
  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to load tasks. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Fetch projects for task creation
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
  
  // Update task status mutation
  const updateTaskStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest("PUT", `/api/tasks/${id}`, { status });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Success",
        description: "Task status updated",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update task status. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Filter tasks by status
  const todoTasks = tasks.filter(task => task.status === "todo");
  const inProgressTasks = tasks.filter(task => task.status === "in_progress");
  const completedTasks = tasks.filter(task => task.status === "completed");
  
  // Handle drag and drop
  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  
  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    if (draggedTask && draggedTask.status !== status) {
      updateTaskStatus.mutate({ id: draggedTask.id, status });
    }
    setDraggedTask(null);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold">Tasks</h2>
        
        <Button 
          onClick={() => setIsTaskModalOpen(true)} 
          className="bg-primary hover:bg-secondary text-white rounded-lg flex items-center"
        >
          <Plus className="mr-1 h-5 w-5" /> New Task
        </Button>
      </div>
      
      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* To Do Column */}
        <div 
          className="bg-gray-100 rounded-lg p-4 min-h-[400px]"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, "todo")}
        >
          <h3 className="font-semibold text-lg mb-4 flex items-center">
            <List className="mr-2 text-gray-500 h-5 w-5" /> To Do
            <span className="ml-2 bg-gray-200 text-gray-700 rounded-full px-2 py-0.5 text-xs">
              {todoTasks.length}
            </span>
          </h3>
          
          <div className="space-y-3">
            {tasksLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="bg-white h-24 rounded-lg"></div>
                <div className="bg-white h-24 rounded-lg"></div>
              </div>
            ) : todoTasks.length > 0 ? (
              todoTasks.map(task => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onDragStart={() => handleDragStart(task)} 
                />
              ))
            ) : (
              <div className="text-center py-10 text-gray-500">
                No tasks in this column
              </div>
            )}
          </div>
        </div>
        
        {/* In Progress Column */}
        <div 
          className="bg-gray-100 rounded-lg p-4 min-h-[400px]"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, "in_progress")}
        >
          <h3 className="font-semibold text-lg mb-4 flex items-center">
            <Clock className="mr-2 text-yellow-500 h-5 w-5" /> In Progress
            <span className="ml-2 bg-gray-200 text-gray-700 rounded-full px-2 py-0.5 text-xs">
              {inProgressTasks.length}
            </span>
          </h3>
          
          <div className="space-y-3">
            {tasksLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="bg-white h-24 rounded-lg"></div>
                <div className="bg-white h-24 rounded-lg"></div>
              </div>
            ) : inProgressTasks.length > 0 ? (
              inProgressTasks.map(task => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onDragStart={() => handleDragStart(task)} 
                />
              ))
            ) : (
              <div className="text-center py-10 text-gray-500">
                No tasks in this column
              </div>
            )}
          </div>
        </div>
        
        {/* Completed Column */}
        <div 
          className="bg-gray-100 rounded-lg p-4 min-h-[400px]"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, "completed")}
        >
          <h3 className="font-semibold text-lg mb-4 flex items-center">
            <CheckCircle className="mr-2 text-green-500 h-5 w-5" /> Completed
            <span className="ml-2 bg-gray-200 text-gray-700 rounded-full px-2 py-0.5 text-xs">
              {completedTasks.length}
            </span>
          </h3>
          
          <div className="space-y-3">
            {tasksLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="bg-white h-24 rounded-lg"></div>
                <div className="bg-white h-24 rounded-lg"></div>
              </div>
            ) : completedTasks.length > 0 ? (
              completedTasks.map(task => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onDragStart={() => handleDragStart(task)} 
                />
              ))
            ) : (
              <div className="text-center py-10 text-gray-500">
                No tasks in this column
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Create Task Modal */}
      <CreateTaskModal 
        isOpen={isTaskModalOpen} 
        onClose={() => setIsTaskModalOpen(false)} 
        projects={projects}
      />
    </div>
  );
}
