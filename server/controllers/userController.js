import bcrypt from "bcryptjs";
import User from "../models/User.js";

// @desc    Get all users — optionally filter by role, and/or search by name/email
// @route   GET /api/users?role=team_leader&search=mee
export const getUsers = async (req, res) => {
  try {
    const filter = {};
    const isLeader = req.user.role === "team_leader";
    // A Team Leader can only look up Team Members; a Manager can look up anyone
    if (isLeader) filter.role = "team_member";
    else if (req.query.role) filter.role = req.query.role;

    if (req.query.search) {
      const term = String(req.query.search).trim();
      if (term) {
        // Escape regex special characters so user input is matched literally
        const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        filter.$or = [{ name: regex }, { email: regex }];
      }
    }

    const users = await User.find(filter)
      .select(isLeader ? "name email role" : "-password")
      .sort({ name: 1 });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users", error: error.message });
  }
};

// @desc    Get the currently logged-in user's profile
// @route   GET /api/users/me
export const getMe = async (req, res) => {
  res.status(200).json(req.user);
};

// @desc    Change the logged-in user's own password
// @route   PUT /api/users/me/password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password are required" });
    }
    if (String(newPassword).length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters" });
    }

    // req.user was loaded without the password hash, so fetch the full record
    const user = await User.findById(req.user._id);
    const matches = user && (await bcrypt.compare(currentPassword, user.password));
    if (!matches) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({ message: "Password updated" });
  } catch (error) {
    res.status(500).json({ message: "Failed to change password", error: error.message });
  }
};

// @desc    Create a Team Leader or Team Member account (Manager only).
//          There is no public signup page — the Manager onboards people.
// @route   POST /api/users
export const createUser = async (req, res) => {
  try {
    const { name, password, role } = req.body;
    const email = String(req.body.email || "").trim().toLowerCase();

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "Name, email, password and role are required" });
    }

    if (!["team_leader", "team_member"].includes(role)) {
      return res.status(400).json({ message: "Managers can only create Team Leader or Team Member accounts" });
    }

    if (String(password).length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "A user with that email already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({ name, email, password: hashedPassword, role });

    res.status(201).json({ _id: user._id, name: user.name, email: user.email, role: user.role });
  } catch (error) {
    res.status(500).json({ message: "Failed to create user", error: error.message });
  }
};
