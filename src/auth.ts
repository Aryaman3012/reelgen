import { betterAuth } from "better-auth";
import { sessionMiddleware } from "better-auth/api";

// Minimal in-memory adapter for demo purposes
const memoryAdapter = {
  // Implement required adapter methods as no-ops or in-memory storage for demo
  async createUser() { throw new Error("Not implemented"); },
  async findUserByEmail() { throw new Error("Not implemented"); },
  async findSession() { throw new Error("Not implemented"); },
  async createSession() { throw new Error("Not implemented"); },
  async updateSession() { throw new Error("Not implemented"); },
  async deleteSession() { throw new Error("Not implemented"); },
  // ...implement other required methods for your use case
};

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET || "your-secret",
  adapter: memoryAdapter,
  // Add other config as needed
});

// Export the session middleware for Express
export const requireAuth = sessionMiddleware; 