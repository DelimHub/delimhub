import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupWebSocketServer } from "./websocket";
import { setupAuth, isAuthenticated } from "./replitAuth";
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { insertUserSchema, insertProjectSchema, insertTaskSchema, insertEventSchema, insertMessageSchema } from "@shared/schema";
import { ZodError } from "zod";

// Set up file upload
const uploadDir = path.join(process.cwd(), "uploads");
// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage_config = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ 
  storage: storage_config,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Set up authentication with Replit OpenID Connect
  await setupAuth(app);
  
  // Set up WebSocket server with Socket.IO for video/voice calls
  const { wss, io } = setupWebSocketServer(httpServer);
  
  // Serve uploaded files
  app.use("/uploads", express.static(uploadDir));
  
  // Error handler for Zod validation errors
  const handleZodError = (error: unknown, res: express.Response) => {
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: "Validation error",
        errors: error.errors,
      });
    }
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  };

  // Auth routes
  app.post("/api/auth/login", login);
  
  // Current user route
  app.get("/api/auth/user", authenticate, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // User routes
  app.post("/api/users", authenticate, isAdmin, async (req: AuthRequest, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      handleZodError(error, res);
    }
  });
  
  app.get("/api/users", authenticate, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get("/api/users/:id", authenticate, async (req, res) => {
    try {
      const user = await storage.getUser(parseInt(req.params.id));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.put("/api/users/:id", authenticate, async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Only allow users to update their own profile unless they're admin
      if (req.user!.id !== userId && req.user!.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const userData = req.body;
      const user = await storage.updateUser(userId, userData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.delete("/api/users/:id", authenticate, isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const success = await storage.deleteUser(userId);
      res.json({ success });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Project routes
  app.post("/api/projects", authenticate, async (req: AuthRequest, res) => {
    try {
      const projectData = insertProjectSchema.parse({
        ...req.body,
        createdById: req.user!.id,
      });
      const project = await storage.createProject(projectData);
      res.status(201).json(project);
    } catch (error) {
      handleZodError(error, res);
    }
  });
  
  app.get("/api/projects", authenticate, async (req: AuthRequest, res) => {
    try {
      const projects = await storage.getProjectsForUser(req.user!.id);
      res.json(projects);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get("/api/projects/:id", authenticate, async (req, res) => {
    try {
      const project = await storage.getProject(parseInt(req.params.id));
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.put("/api/projects/:id", authenticate, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const projectData = req.body;
      const project = await storage.updateProject(projectId, projectData);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.delete("/api/projects/:id", authenticate, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const success = await storage.deleteProject(projectId);
      res.json({ success });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.post("/api/projects/:id/members", authenticate, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { userId, role } = req.body;
      const success = await storage.addUserToProject(projectId, userId, role);
      res.json({ success });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.delete("/api/projects/:projectId/members/:userId", authenticate, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const userId = parseInt(req.params.userId);
      const success = await storage.removeUserFromProject(projectId, userId);
      res.json({ success });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get("/api/projects/:id/members", authenticate, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const members = await storage.getProjectMembers(projectId);
      res.json(members);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Task routes
  app.post("/api/tasks", authenticate, async (req: AuthRequest, res) => {
    try {
      const taskData = insertTaskSchema.parse({
        ...req.body,
        createdById: req.user!.id,
      });
      const task = await storage.createTask(taskData);
      
      // Create activity
      await storage.createActivity({
        type: "task_created",
        description: `Task "${task.title}" created`,
        userId: req.user!.id,
        projectId: task.projectId,
        taskId: task.id
      });
      
      res.status(201).json(task);
    } catch (error) {
      handleZodError(error, res);
    }
  });
  
  app.get("/api/tasks", authenticate, async (req: AuthRequest, res) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      
      if (projectId) {
        const tasks = await storage.getTasksForProject(projectId);
        return res.json(tasks);
      } else {
        const tasks = await storage.getTasksForUser(req.user!.id);
        return res.json(tasks);
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get("/api/tasks/:id", authenticate, async (req, res) => {
    try {
      const task = await storage.getTask(parseInt(req.params.id));
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.put("/api/tasks/:id", authenticate, async (req: AuthRequest, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const taskData = req.body;
      const task = await storage.updateTask(taskId, taskData);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Create activity for status change
      if (taskData.status) {
        await storage.createActivity({
          type: "task_updated",
          description: `Task "${task.title}" status changed to ${task.status}`,
          userId: req.user!.id,
          projectId: task.projectId,
          taskId: task.id
        });
      }
      
      res.json(task);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.delete("/api/tasks/:id", authenticate, async (req: AuthRequest, res) => {
    try {
      const taskId = parseInt(req.params.id);
      
      // Get task before deleting to use in activity
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      const success = await storage.deleteTask(taskId);
      
      // Create activity
      await storage.createActivity({
        type: "task_deleted",
        description: `Task "${task.title}" deleted`,
        userId: req.user!.id,
        projectId: task.projectId
      });
      
      res.json({ success });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // File routes
  app.post("/api/files/upload", authenticate, upload.single("file"), async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const { taskId, messageId } = req.body;
      
      const file = await storage.createFile({
        name: req.file.originalname,
        path: `/uploads/${req.file.filename}`,
        type: req.file.mimetype,
        size: req.file.size,
        taskId: taskId ? parseInt(taskId) : undefined,
        messageId: messageId ? parseInt(messageId) : undefined,
        userId: req.user!.id
      });
      
      res.status(201).json(file);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get("/api/files", authenticate, async (req, res) => {
    try {
      const taskId = req.query.taskId ? parseInt(req.query.taskId as string) : undefined;
      const messageId = req.query.messageId ? parseInt(req.query.messageId as string) : undefined;
      
      if (taskId) {
        const files = await storage.getFilesForTask(taskId);
        return res.json(files);
      } else if (messageId) {
        const files = await storage.getFilesForMessage(messageId);
        return res.json(files);
      } else {
        return res.status(400).json({ message: "taskId or messageId is required" });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Channel routes
  app.post("/api/channels", authenticate, async (req: AuthRequest, res) => {
    try {
      const { name, type, projectId } = req.body;
      
      const channel = await storage.createChannel({
        name,
        type,
        projectId: projectId ? parseInt(projectId) : undefined,
      });
      
      // Add creator to channel
      await storage.addUserToChannel(channel.id, req.user!.id);
      
      res.status(201).json(channel);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get("/api/channels", authenticate, async (req, res) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      
      if (!projectId) {
        return res.status(400).json({ message: "projectId is required" });
      }
      
      const channels = await storage.getChannelsForProject(projectId);
      res.json(channels);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get("/api/channels/:id/messages", authenticate, async (req, res) => {
    try {
      const channelId = parseInt(req.params.id);
      const messages = await storage.getMessagesForChannel(channelId);
      res.json(messages);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.post("/api/channels/:id/messages", authenticate, async (req: AuthRequest, res) => {
    try {
      const channelId = parseInt(req.params.id);
      const messageData = insertMessageSchema.parse({
        content: req.body.content,
        channelId,
        userId: req.user!.id,
      });
      
      const message = await storage.createMessage(messageData);
      res.status(201).json(message);
    } catch (error) {
      handleZodError(error, res);
    }
  });
  
  // Event routes
  app.post("/api/events", authenticate, async (req: AuthRequest, res) => {
    try {
      const eventData = insertEventSchema.parse({
        ...req.body,
        createdById: req.user!.id,
      });
      
      const event = await storage.createEvent(eventData);
      res.status(201).json(event);
    } catch (error) {
      handleZodError(error, res);
    }
  });
  
  app.get("/api/events", authenticate, async (req: AuthRequest, res) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      
      if (projectId) {
        const events = await storage.getEventsForProject(projectId);
        return res.json(events);
      } else {
        const events = await storage.getEventsForUser(req.user!.id);
        return res.json(events);
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get("/api/events/:id", authenticate, async (req, res) => {
    try {
      const event = await storage.getEvent(parseInt(req.params.id));
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.put("/api/events/:id", authenticate, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const eventData = req.body;
      const event = await storage.updateEvent(eventId, eventData);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.delete("/api/events/:id", authenticate, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const success = await storage.deleteEvent(eventId);
      res.json({ success });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Activity routes
  app.get("/api/activities", authenticate, async (req: AuthRequest, res) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      
      if (projectId) {
        const activities = await storage.getActivitiesForProject(projectId, limit);
        return res.json(activities);
      } else {
        const activities = await storage.getActivitiesForUser(req.user!.id, limit);
        return res.json(activities);
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  });

  return httpServer;
}
