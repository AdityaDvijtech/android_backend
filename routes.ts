import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import cookieParser from "cookie-parser";
import { storage } from "./storage";
import { isAuthenticated, isAdmin } from "./auth";
import authRoutes from "./auth-routes";
import { z } from "zod";
import { 
  insertProjectSchema, 
  insertMediaItemSchema, 
  insertComplaintSchema,
  updateComplaintSchema,
  insertEventSchema
} from "@shared/schema";

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadDir = path.join(process.cwd(), "uploads");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, `${uniqueSuffix}-${file.originalname}`);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB file size limit
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup middleware
  app.use(cookieParser());
  
  // Register auth routes
  app.use('/api/auth', authRoutes);

  // Projects routes
  app.get('/api/projects', async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const projects = await storage.getProjects(status);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get('/api/projects/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.getProject(id);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post('/api/projects', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const validatedData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(validatedData);
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.put('/api/projects/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(id, validatedData);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete('/api/projects/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteProject(id);
      res.json({ success });
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Media routes
  app.get('/api/media', async (req, res) => {
    try {
      const type = req.query.type as string | undefined;
      const mediaItems = await storage.getMediaItems(type);
      res.json(mediaItems);
    } catch (error) {
      console.error("Error fetching media items:", error);
      res.status(500).json({ message: "Failed to fetch media items" });
    }
  });

  app.post('/api/media', isAuthenticated, isAdmin, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fileUrl = `/uploads/${req.file.filename}`;
      
      const mediaItemData = {
        title: req.body.title,
        type: req.body.type,
        url: fileUrl,
        description: req.body.description || null,
      };
      
      const validatedData = insertMediaItemSchema.parse(mediaItemData);
      const mediaItem = await storage.createMediaItem(validatedData);
      
      res.status(201).json(mediaItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid media item data", errors: error.errors });
      }
      console.error("Error creating media item:", error);
      res.status(500).json({ message: "Failed to create media item" });
    }
  });

  app.delete('/api/media/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteMediaItem(id);
      res.json({ success });
    } catch (error) {
      console.error("Error deleting media item:", error);
      res.status(500).json({ message: "Failed to delete media item" });
    }
  });

  // Complaints routes
  app.get('/api/complaints', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // If admin, return all complaints; otherwise, return only user's complaints
      const status = req.query.status as string | undefined;
      const complaints = user.isAdmin 
        ? await storage.getComplaints(undefined, status)
        : await storage.getComplaints(user.id, status);
      
      res.json(complaints);
    } catch (error) {
      console.error("Error fetching complaints:", error);
      res.status(500).json({ message: "Failed to fetch complaints" });
    }
  });

  app.get('/api/complaints/stats', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const stats = await storage.getComplaintStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching complaint stats:", error);
      res.status(500).json({ message: "Failed to fetch complaint statistics" });
    }
  });

  app.get('/api/complaints/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const complaint = await storage.getComplaint(id);
      
      if (!complaint) {
        return res.status(404).json({ message: "Complaint not found" });
      }
      
      const user = req.user;
      
      // Check if user is authorized to view this complaint
      if (!user?.isAdmin && complaint.userId !== user?.id) {
        return res.status(403).json({ message: "Not authorized to view this complaint" });
      }
      
      res.json(complaint);
    } catch (error) {
      console.error("Error fetching complaint:", error);
      res.status(500).json({ message: "Failed to fetch complaint" });
    }
  });

  app.post('/api/complaints', isAuthenticated, upload.array('attachments', 3), async (req, res) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Process file uploads
      const attachmentUrls = req.files 
        ? (req.files as Express.Multer.File[]).map(file => `/uploads/${file.filename}`)
        : [];
      
      const complaintData = {
        ...req.body,
        userId,
        attachments: attachmentUrls
      };
      
      const validatedData = insertComplaintSchema.parse(complaintData);
      const complaint = await storage.createComplaint(validatedData);
      
      res.status(201).json(complaint);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid complaint data", errors: error.errors });
      }
      console.error("Error creating complaint:", error);
      res.status(500).json({ message: "Failed to create complaint" });
    }
  });

  app.patch('/api/complaints/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = updateComplaintSchema.parse(req.body);
      const complaint = await storage.updateComplaint(id, validatedData);
      
      if (!complaint) {
        return res.status(404).json({ message: "Complaint not found" });
      }
      
      res.json(complaint);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid update data", errors: error.errors });
      }
      console.error("Error updating complaint:", error);
      res.status(500).json({ message: "Failed to update complaint" });
    }
  });

  // Events routes
  app.get('/api/events', async (req, res) => {
    try {
      const upcoming = req.query.upcoming === 'true';
      const events = await storage.getEvents(upcoming);
      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.post('/api/events', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const validatedData = insertEventSchema.parse(req.body);
      const event = await storage.createEvent(validatedData);
      res.status(201).json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid event data", errors: error.errors });
      }
      console.error("Error creating event:", error);
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  app.delete('/api/events/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteEvent(id);
      res.json({ success });
    } catch (error) {
      console.error("Error deleting event:", error);
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  // Admin routes
  app.post('/api/admin/promote/:userId', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const user = await storage.setUserAsAdmin(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error promoting user to admin:", error);
      res.status(500).json({ message: "Failed to promote user to admin" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
