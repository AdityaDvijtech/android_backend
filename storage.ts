import { 
  users, 
  projects, 
  mediaItems, 
  complaints, 
  events,
  type User, 
  type InsertUser,
  type Project,
  type InsertProject,
  type MediaItem,
  type InsertMediaItem,
  type Complaint,
  type InsertComplaint,
  type UpdateComplaint,
  type Event,
  type InsertEvent
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, like, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUserById(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  setUserAsAdmin(id: number): Promise<User | undefined>;
  
  // Project operations
  getProjects(status?: string): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;
  
  // Media operations
  getMediaItems(type?: string): Promise<MediaItem[]>;
  createMediaItem(mediaItem: InsertMediaItem): Promise<MediaItem>;
  deleteMediaItem(id: number): Promise<boolean>;
  
  // Complaint operations
  getComplaints(userId?: string, status?: string): Promise<Complaint[]>;
  getComplaint(id: number): Promise<Complaint | undefined>;
  createComplaint(complaint: InsertComplaint): Promise<Complaint>;
  updateComplaint(id: number, updateData: UpdateComplaint): Promise<Complaint | undefined>;
  getComplaintStats(): Promise<{ pending: number, inProgress: number, completed: number }>;
  
  // Event operations
  getEvents(upcoming?: boolean): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  deleteEvent(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async setUserAsAdmin(id: number): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ isAdmin: true, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Project operations
  async getProjects(status?: string): Promise<Project[]> {
    if (status) {
      return db
        .select()
        .from(projects)
        .where(eq(projects.status, status))
        .orderBy(desc(projects.createdAt));
    }
    return db
      .select()
      .from(projects)
      .orderBy(desc(projects.createdAt));
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id));
    return project;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db
      .insert(projects)
      .values(project)
      .returning();
    return newProject;
  }

  async updateProject(id: number, projectData: Partial<InsertProject>): Promise<Project | undefined> {
    const [project] = await db
      .update(projects)
      .set({ ...projectData, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return project;
  }

  async deleteProject(id: number): Promise<boolean> {
    const result = await db
      .delete(projects)
      .where(eq(projects.id, id));
    return true; // If no error was thrown, deletion was successful
  }

  // Media operations
  async getMediaItems(type?: string): Promise<MediaItem[]> {
    if (type) {
      return db
        .select()
        .from(mediaItems)
        .where(eq(mediaItems.type, type))
        .orderBy(desc(mediaItems.createdAt));
    }
    return db
      .select()
      .from(mediaItems)
      .orderBy(desc(mediaItems.createdAt));
  }

  async createMediaItem(mediaItem: InsertMediaItem): Promise<MediaItem> {
    const [newMediaItem] = await db
      .insert(mediaItems)
      .values(mediaItem)
      .returning();
    return newMediaItem;
  }

  async deleteMediaItem(id: number): Promise<boolean> {
    await db
      .delete(mediaItems)
      .where(eq(mediaItems.id, id));
    return true;
  }

  // Complaint operations
  async getComplaints(userId?: string | number, status?: string): Promise<Complaint[]> {
    let query = db.select().from(complaints);
    
    if (userId && status) {
      // Convert userId to number if it's a string
      const userIdNum = typeof userId === 'string' ? parseInt(userId) : userId;
      return db
        .select()
        .from(complaints)
        .where(
          and(
            eq(complaints.userId, userIdNum),
            eq(complaints.status, status)
          )
        )
        .orderBy(desc(complaints.createdAt));
    } else if (userId) {
      // Convert userId to number if it's a string
      const userIdNum = typeof userId === 'string' ? parseInt(userId) : userId;
      return db
        .select()
        .from(complaints)
        .where(eq(complaints.userId, userIdNum))
        .orderBy(desc(complaints.createdAt));
    } else if (status) {
      return db
        .select()
        .from(complaints)
        .where(eq(complaints.status, status))
        .orderBy(desc(complaints.createdAt));
    }
    
    return query.orderBy(desc(complaints.createdAt));
  }

  async getComplaint(id: number): Promise<Complaint | undefined> {
    const [complaint] = await db
      .select()
      .from(complaints)
      .where(eq(complaints.id, id));
    return complaint;
  }

  async createComplaint(complaint: InsertComplaint): Promise<Complaint> {
    const [newComplaint] = await db
      .insert(complaints)
      .values(complaint)
      .returning();
    return newComplaint;
  }

  async updateComplaint(id: number, updateData: UpdateComplaint): Promise<Complaint | undefined> {
    const [complaint] = await db
      .update(complaints)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(complaints.id, id))
      .returning();
    return complaint;
  }

  async getComplaintStats(): Promise<{ pending: number, inProgress: number, completed: number }> {
    const pendingCount = await db
      .select()
      .from(complaints)
      .where(eq(complaints.status, 'pending'))
      .then(result => result.length);
    
    const inProgressCount = await db
      .select()
      .from(complaints)
      .where(eq(complaints.status, 'in-progress'))
      .then(result => result.length);
    
    const completedCount = await db
      .select()
      .from(complaints)
      .where(eq(complaints.status, 'completed'))
      .then(result => result.length);
    
    return {
      pending: pendingCount,
      inProgress: inProgressCount,
      completed: completedCount
    };
  }

  // Event operations
  async getEvents(upcoming?: boolean): Promise<Event[]> {
    if (upcoming) {
      const now = new Date().toISOString();
      // Use SQL for date comparison
      return db
        .select()
        .from(events)
        .where(sql`${events.date} > ${now}`)
        .orderBy(events.date);
    }
    
    return db
      .select()
      .from(events)
      .orderBy(events.date);
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const [newEvent] = await db
      .insert(events)
      .values(event)
      .returning();
    return newEvent;
  }

  async deleteEvent(id: number): Promise<boolean> {
    await db
      .delete(events)
      .where(eq(events.id, id));
    return true;
  }
}

export const storage = new DatabaseStorage();
