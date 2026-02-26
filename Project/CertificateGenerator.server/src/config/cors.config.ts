/**
 * cors.config.ts  - Cross-Origin Resource Sharing Configuration
 *
 * Since our React frontend runs on a different port (5173) than the
 * backend (5000), browsers will block requests by default. This config
 * tells the server which origins are allowed to talk to our API.
 */

import { CorsOptions } from "cors";

const corsOptions: CorsOptions = {
  // Allow requests from our frontend; defaults to '*' (all origins) in dev
  origin: process.env.CORS_ORIGIN || "*",

  // Only these HTTP methods are permitted
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],

  // Only these headers can be sent by the client
  allowedHeaders: ["Content-Type", "Authorization"],
};

export default corsOptions;
