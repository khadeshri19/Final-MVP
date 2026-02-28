/**
 * server.ts  - Application Entry Point
 *
 * This is where everything kicks off! We load environment variables,
 * initialize the database, and spin up the Express server.
 * If the database fails to connect, we exit immediately so nothing
 * runs in a broken state.
 */

import dotenv from "dotenv";
import app from "./app";
import { initDb } from "./script/init.script";


// Load environment variables from .env file before anything else
dotenv.config();

// Use the port from environment or default to 5000
const PORT = process.env.PORT || 5000;

// First set up our database tables, then start listening for requests
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    // If the database isn't reachable, there's no point in running the server
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });