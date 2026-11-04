import rateLimit from "express-rate-limit";

const isTest = () => process.env.NODE_ENV === "test";

// Slows down password guessing: 10 login attempts per 15 minutes per IP address
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: isTest,
  message: { message: "Too many login attempts. Please try again in 15 minutes." },
});

// Protects your Anthropic credit: 20 AI summaries per hour per logged-in user
export const summaryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: isTest,
  keyGenerator: (req) => String(req.user?._id || "anonymous"),
  message: { message: "Summary limit reached (20 per hour). Please try again later." },
});
