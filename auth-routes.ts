import { Router } from "express";
import { z } from "zod";
import { register, login, isAuthenticated, isAdmin } from "./auth";
import { registerUserSchema, loginSchema } from "@shared/schema";
import { storage } from "./storage";

const router = Router();

// Register a new user
router.post("/register", async (req, res) => {
  try {
    // Validate input
    const validatedData = registerUserSchema.parse(req.body);
    
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(validatedData.email);
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }
    
    // Register user
    const { user, token } = await register(validatedData);
    
    // Set token as cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    
    // Return user data
    return res.status(201).json({ user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: error.errors 
      });
    }
    
    console.error("Registration error:", error);
    return res.status(500).json({ message: "Failed to register user" });
  }
});

// Login user
router.post("/login", async (req, res) => {
  try {
    // Validate input
    const validatedData = loginSchema.parse(req.body);
    
    // Login user
    const { user, token } = await login(validatedData);
    
    // Set token as cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    
    // Return user data
    return res.json({ user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: error.errors 
      });
    }
    
    if (error instanceof Error) {
      return res.status(401).json({ message: error.message });
    }
    
    console.error("Login error:", error);
    return res.status(500).json({ message: "Failed to login" });
  }
});

// Logout user
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  return res.json({ message: "Logged out successfully" });
});

// Get current user
router.get("/user", isAuthenticated, async (req, res) => {
  res.json(req.user);
});

// Check if user is admin
router.get("/admin", isAuthenticated, isAdmin, (req, res) => {
  res.json({ isAdmin: true });
});

export default router;