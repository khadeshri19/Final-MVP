/**
 * app.ts  - Express Application Setup
 *
 * This file wires together all the middleware, routes, and static file
 * serving for our Certificate Generator API. Think of it as the
 * "central nervous system" that connects every part of the backend.
 */

import express from "express";
import cors from "cors";
import path from "path";
import corsOptions from "./config/cors.config";
import authRoutes from "./routes/auth.routes";
import templateRoutes from "./routes/template.routes";
import certificateRoutes from "./routes/certificate.routes";
import verifyRoutes from "./routes/verify.routes";
import adminRoutes from "./routes/admin.routes";
import { requestLogger } from "./middlewares/logger.middlewares";
import { errorHandler } from "./middlewares/error.middlewares";

const app = express();

//   Global Middleware
// These run on every single request that comes into our server.

app.use(cors(corsOptions)); // Handle cross-origin requests from the React frontend
app.use(express.json()); // Parse incoming JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded form data
app.use(requestLogger); // Log every request for debugging

//   Static File Serving
// Uploaded template images and generated certificate PDFs are served directly
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));
app.use("/generated", express.static(path.join(__dirname, "..", "generated")));

//   API Routes
// Each route module handles a specific feature area of the app
app.use("/api/auth", authRoutes); // Login, register, token management
app.use("/api/templates", templateRoutes); // Upload & manage certificate templates
app.use("/api/certificates", certificateRoutes); // Generate & download certificates
app.use("/api/verify", verifyRoutes); // Public endpoint for certificate verification
app.use("/api/admin", adminRoutes); // Admin panel operations

//   Health Check
// Quick endpoint to confirm the server is alive (useful for monitoring)
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

//   Error Handling
// This must be the LAST middleware  - catches anything that slipped through
app.use(errorHandler);

export default app;
