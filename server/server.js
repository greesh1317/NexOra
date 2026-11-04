import "dotenv/config"; // first import: loads server/.env BEFORE any other file reads process.env
import connectDB from "./config/db.js";
import app from "./app.js";
import { getJwtSecret } from "./utils/token.js";

// Refuse to start without a proper JWT secret (in every environment)
try {
  getJwtSecret();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

connectDB();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`NexOra server running on port ${PORT}`);
});
