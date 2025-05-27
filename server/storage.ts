import { 
  users, projects, tasks, channels, messages, files, events,
  projectMembers, channelMembers, eventAttendees, activities,
  type User, type InsertUser, type Project, type InsertProject, 
  type Task, type InsertTask, type Event, type InsertEvent,
  type Channel, type InsertChannel, type Message, type InsertMessage,
  type File, type InsertFile, type Activity, type InsertActivity
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, like, or, inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string | number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: any): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  
  // Project operations
  createProject(project: InsertProject): Promise<Project>;
  getProject(id: number): Promise<Project | undefined>;
  getProjectsForUser(userId: number): Promise<Project[]>;
  updateProject(id: number, data: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;
  addUserToProject(projectId: number, userId: number, role?: string): Promise<boolean>;
  removeUserFromProject(projectId: number, userId: number): Promise<boolean>;
  getProjectMembers(projectId: number): Promise<User[]>;
  
  // Task operations
  createTask(task: InsertTask): Promise<Task>;
  getTask(id: number): Promise<Task | undefined>;
  getTasksForProject(projectId: number): Promise<Task[]>;
  getTasksForUser(userId: number): Promise<Task[]>;
  updateTask(id: number, data: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<boolean>;
  
  // Channel & Message operations
  createChannel(channel: InsertChannel): Promise<Channel>;
  getChannel(id: number): Promise<Channel | undefined>;
  getChannelsForProject(projectId: number): Promise<Channel[]>;
  addUserToChannel(channelId: number, userId: number): Promise<boolean>;
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesForChannel(channelId: number): Promise<Message[]>;
  
  // Event operations
  createEvent(event: InsertEvent): Promise<Event>;
  getEvent(id: number): Promise<Event | undefined>;
  getEventsForUser(userId: number): Promise<Event[]>;
  getEventsForProject(projectId: number): Promise<Event[]>;
  updateEvent(id: number, data: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(id: number): Promise<boolean>;
  
  // File operations
  createFile(file: InsertFile): Promise<File>;
  getFile(id: number): Promise<File | undefined>;
  getFilesForTask(taskId: number): Promise<File[]>;
  getFilesForMessage(messageId: number): Promise<File[]>;
  
  // Activity operations
  createActivity(activity: InsertActivity): Promise<Activity>;
  getActivitiesForProject(projectId: number, limit?: number): Promise<Activity[]>;
  getActivitiesForUser(userId: number, limit?: number): Promise<Activity[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string | number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  
  async upsertUser(userData: any): Promise<User> {
    // Convert string id to number if needed
    const userId = typeof userData.id === 'string' ? userData.id : userData.id.toString();
    
    // Check if user exists
    const existingUser = await this.getUser(userId);
    
    if (existingUser) {
      // Update existing user
      const [user] = await db
        .update(users)
        .set({
          email: userData.email || existingUser.email,
          firstName: userData.firstName || existingUser.firstName,
          lastName: userData.lastName || existingUser.lastName,
          profileImageUrl: userData.profileImageUrl || existingUser.profileImageUrl,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning();
      return user;
    } else {
      // Create new user
      const [user] = await db
        .insert(users)
        .values({
          id: userId,
          username: userData.username || `user_${userId}`,
          email: userData.email || '',
          password: await bcrypt.hash('password', 10), // Default password
          firstName: userData.firstName || null,
          lastName: userData.lastName || null,
          profileImageUrl: userData.profileImageUrl || null,
          role: userData.role || 'user'
        })
        .returning();
      return user;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        password: hashedPassword
      })
      .returning();
    
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    // If password is being updated, hash it
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    
    const [user] = await db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    
    return user;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return true;
  }

  // Project operations
  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    
    // Add creator as a project member with 'owner' role
    await db.insert(projectMembers).values({
      projectId: newProject.id,
      userId: project.createdById,
      role: 'owner'
    });
    
    return newProject;
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async getProjectsForUser(userId: number): Promise<Project[]> {
    const result = await db
      .select({
        project: projects
      })
      .from(projectMembers)
      .innerJoin(projects, eq(projectMembers.projectId, projects.id))
      .where(eq(projectMembers.userId, userId));
    
    return result.map(r => r.project);
  }

  async updateProject(id: number, data: Partial<InsertProject>): Promise<Project | undefined> {
    const [project] = await db
      .update(projects)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, id))
      .returning();
    
    return project;
  }

  async deleteProject(id: number): Promise<boolean> {
    await db.delete(projects).where(eq(projects.id, id));
    return true;
  }

  async addUserToProject(projectId: number, userId: number, role: string = 'member'): Promise<boolean> {
    await db.insert(projectMembers).values({
      projectId,
      userId,
      role
    });
    return true;
  }

  async removeUserFromProject(projectId: number, userId: number): Promise<boolean> {
    await db
      .delete(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, userId)
        )
      );
    return true;
  }

  async getProjectMembers(projectId: number): Promise<User[]> {
    const result = await db
      .select({
        user: users
      })
      .from(projectMembers)
      .innerJoin(users, eq(projectMembers.userId, users.id))
      .where(eq(projectMembers.projectId, projectId));
    
    return result.map(r => r.user);
  }

  // Task operations
  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db.insert(tasks).values(task).returning();
    return newTask;
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async getTasksForProject(projectId: number): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, projectId));
  }

  async getTasksForUser(userId: number): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.assigneeId, userId));
  }

  async updateTask(id: number, data: Partial<InsertTask>): Promise<Task | undefined> {
    const [task] = await db
      .update(tasks)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id))
      .returning();
    
    return task;
  }

  async deleteTask(id: number): Promise<boolean> {
    await db.delete(tasks).where(eq(tasks.id, id));
    return true;
  }

  // Channel & Message operations
  async createChannel(channel: InsertChannel): Promise<Channel> {
    const [newChannel] = await db.insert(channels).values(channel).returning();
    return newChannel;
  }

  async getChannel(id: number): Promise<Channel | undefined> {
    const [channel] = await db.select().from(channels).where(eq(channels.id, id));
    return channel;
  }

  async getChannelsForProject(projectId: number): Promise<Channel[]> {
    return await db
      .select()
      .from(channels)
      .where(eq(channels.projectId, projectId));
  }

  async addUserToChannel(channelId: number, userId: number): Promise<boolean> {
    await db.insert(channelMembers).values({
      channelId,
      userId
    });
    return true;
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }

  async getMessagesForChannel(channelId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.channelId, channelId))
      .orderBy(messages.createdAt);
  }

  // Event operations
  async createEvent(event: InsertEvent): Promise<Event> {
    const [newEvent] = await db.insert(events).values(event).returning();
    
    // Add creator as an attendee with 'accepted' status
    await db.insert(eventAttendees).values({
      eventId: newEvent.id,
      userId: event.createdById,
      status: 'accepted'
    });
    
    return newEvent;
  }

  async getEvent(id: number): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event;
  }

  async getEventsForUser(userId: number): Promise<Event[]> {
    const result = await db
      .select({
        event: events
      })
      .from(eventAttendees)
      .innerJoin(events, eq(eventAttendees.eventId, events.id))
      .where(eq(eventAttendees.userId, userId));
    
    return result.map(r => r.event);
  }

  async getEventsForProject(projectId: number): Promise<Event[]> {
    return await db
      .select()
      .from(events)
      .where(eq(events.projectId, projectId));
  }

  async updateEvent(id: number, data: Partial<InsertEvent>): Promise<Event | undefined> {
    const [event] = await db
      .update(events)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(events.id, id))
      .returning();
    
    return event;
  }

  async deleteEvent(id: number): Promise<boolean> {
    await db.delete(events).where(eq(events.id, id));
    return true;
  }

  // File operations
  async createFile(file: InsertFile): Promise<File> {
    const [newFile] = await db.insert(files).values(file).returning();
    return newFile;
  }

  async getFile(id: number): Promise<File | undefined> {
    const [file] = await db.select().from(files).where(eq(files.id, id));
    return file;
  }

  async getFilesForTask(taskId: number): Promise<File[]> {
    return await db
      .select()
      .from(files)
      .where(eq(files.taskId, taskId));
  }

  async getFilesForMessage(messageId: number): Promise<File[]> {
    return await db
      .select()
      .from(files)
      .where(eq(files.messageId, messageId));
  }

  // Activity operations
  async createActivity(activity: InsertActivity): Promise<Activity> {
    const [newActivity] = await db.insert(activities).values(activity).returning();
    return newActivity;
  }

  async getActivitiesForProject(projectId: number, limit: number = 10): Promise<Activity[]> {
    return await db
      .select()
      .from(activities)
      .where(eq(activities.projectId, projectId))
      .orderBy(desc(activities.createdAt))
      .limit(limit);
  }

  async getActivitiesForUser(userId: number, limit: number = 10): Promise<Activity[]> {
    return await db
      .select()
      .from(activities)
      .where(eq(activities.userId, userId))
      .orderBy(desc(activities.createdAt))
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();
