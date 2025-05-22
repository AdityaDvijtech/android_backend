import { db } from "./db"; // Adjust the import path as needed for your project setup
import {
  users,
  projects,
  mediaItems,
  complaints,
  events,
} from "./shared/schema"; // Adjust the import path as needed for your project setup

// Example seed data
const userSeeds = [
  {
    fullName: "Admin User",
    email: "admin@example.com",
    phone: "1234567890",
    password: "adminpassword",
    isAdmin: true,
  },
  {
    fullName: "John Doe",
    email: "john@example.com",
    phone: "9876543210",
    password: "password123",
    isAdmin: false,
  },
];

const projectSeeds = [
  {
    title: "Community Park Renovation",
    description: "Renovating the central community park.",
    status: "in-progress",
    category: "Infrastructure",
    imageUrl: null,
    startDate: new Date(),
    endDate: null,
  },
];

const mediaSeeds = [
  {
    title: "Renovation Plan",
    type: "document",
    url: "https://example.com/plan.pdf",
    description: "Project plan document",
  },
  {
    title: "Park Image",
    type: "image",
    url: "https://example.com/park.jpg",
    description: "Image of the park",
  },
];

const eventSeeds = [
  {
    title: "Town Hall Meeting",
    description: "Discussing the park renovation project.",
    location: "Community Center",
    date: new Date(),
    imageUrl: null,
  },
];

const complaintSeeds = [
  {
    userId: 2,
    title: "Broken Swing",
    description: "The swing in the park is broken.",
    category: "Maintenance",
    location: "Central Park",
    status: "pending",
    attachments: [],
  },
];

async function seed() {
  // Insert users
  await db.insert(users).values(userSeeds);

  // Insert projects
  await db.insert(projects).values(projectSeeds);

  // Insert media items
  await db.insert(mediaItems).values(mediaSeeds);

  // Insert events
  await db.insert(events).values(eventSeeds);

  // Insert complaints
  await db.insert(complaints).values(complaintSeeds);

  console.log("Seeding completed.");
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});