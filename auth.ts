import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import { RegisterUser, LoginCredentials, User } from "@shared/schema";

// Secret key for JWT
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Password hashing
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

// Password comparison
export const comparePasswords = async (password: string, hashedPassword: string): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

// Generate JWT token
export const generateToken = (userId: number): string => {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: "7d" });
};

// Verify JWT token
export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Authentication middleware
export const isAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from cookie
    const token = req.cookies.token;
    
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Get user from database
    const user = await storage.getUserById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(401).json({ message: "Unauthorized" });
  }
};

// Admin middleware
export const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ message: "Forbidden: Admin access required" });
  }
  
  next();
};

// Register a new user
export const register = async (userData: RegisterUser): Promise<{ user: User; token: string }> => {
  try {
    // Hash password
    const hashedPassword = await hashPassword(userData.password);
    
    // Create user
    const user = await storage.createUser({
      fullName: userData.fullName,
      email: userData.email,
      phone: userData.phone,
      password: hashedPassword,
      isAdmin: false
    });
    
    // Generate token
    const token = generateToken(user.id);
    
    return { user, token };
  } catch (error) {
    console.error("Registration error:", error);
    throw new Error("Failed to register user");
  }
};

// Login user
export const login = async (credentials: LoginCredentials): Promise<{ user: User; token: string }> => {
  try {
    // Find user by email
    const user = await storage.getUserByEmail(credentials.email);
    
    if (!user) {
      throw new Error("Invalid email or password");
    }
    
    // Compare passwords
    const passwordMatch = await comparePasswords(credentials.password, user.password);
    
    if (!passwordMatch) {
      throw new Error("Invalid email or password");
    }
    
    // Generate token
    const token = generateToken(user.id);
    
    return { user, token };
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
};

// Extend the Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}