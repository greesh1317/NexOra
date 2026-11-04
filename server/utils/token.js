import jwt from "jsonwebtoken";

// One place that knows the JWT secret. There is NO fallback value any more:
// if JWT_SECRET is missing, the server refuses to start instead of using a guessable key.
export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set. Add it to server/.env (any long random string).");
  }
  if (process.env.NODE_ENV === "production" && secret.length < 32) {
    throw new Error("JWT_SECRET is too short for production. Use at least 32 random characters.");
  }
  return secret;
}

export const signToken = (id) => jwt.sign({ id }, getJwtSecret(), { expiresIn: "7d" });
export const verifyToken = (token) => jwt.verify(token, getJwtSecret());
