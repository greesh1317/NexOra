import User from "../models/User.js";
import { verifyToken } from "../utils/token.js";

export const protect = async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  try {
    const decoded = verifyToken(header.split(" ")[1]);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      // The token is valid but the account was deleted
      return res.status(401).json({ message: "Not authorized, account no longer exists" });
    }
    if (user.isActive === false) {
      // 401 so the website logs the person out straight away
      return res.status(401).json({ message: "Not authorized, this account has been deactivated" });
    }
    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Not authorized, token invalid" });
  }
};


export const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: "Forbidden: insufficient role" });
  }
  next();
};
