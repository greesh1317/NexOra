import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Team from "../models/Team.js";
import Notification from "../models/Notification.js";
import { visibleTeamFilter } from "../utils/teamRules.js";
import { getPaging, listResult } from "../utils/paging.js";

// @desc    Get all users — optionally filter by role, and/or search by name/email
// @route   GET /api/users?role=team_leader&search=mee
export const getUsers = async (req, res) => {
  try {
    const filter = {};
    const isLeader = req.user.role === "team_leader";
    // A Team Leader can only look up the Team Members of their own team(s); a Manager can look up anyone
    if (isLeader) {
      filter.role = "team_member";
      filter.isActive = { $ne: false };
      const teams = await Team.find(await visibleTeamFilter(req.user)).select("members");
      filter._id = { $in: teams.flatMap((t) => t.members) };
    }
    else {
      if (req.query.role) filter.role = req.query.role;
      // Optional ?status=active|inactive (Manager)
      if (req.query.status === "active") filter.isActive = { $ne: false };
      if (req.query.status === "inactive") filter.isActive = false;
    }

    if (req.query.search) {
      const term = String(req.query.search).trim();
      if (term) {
        // Escape regex special characters so user input is matched literally
        const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        filter.$or = [{ name: regex }, { email: regex }];
      }
    }

    const users = await listResult(
      User,
      filter,
      (q) => q.select(isLeader ? "name email role" : "-password").sort({ name: 1, _id: 1 }), // _id breaks ties (two people can share a name)
      getPaging(req.query)
    );
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

// @desc    Deactivate or reactivate an account (Manager only). Nothing is deleted: the person simply
//          cannot log in or receive new tasks, and their tasks, reports and reviews stay as history.
// @route   PUT /api/users/:id/status   body: { isActive: true | false }
export const setUserStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== "boolean") {
      return res.status(400).json({ message: "isActive must be true or false" });
    }

    const target = await User.findById(req.params.id).select("role");
    if (!target) return res.status(404).json({ message: "User not found" });
    if (target.role === "manager") {
      return res.status(400).json({ message: "Manager accounts cannot be deactivated" });
    }

    const user = await User.findByIdAndUpdate(req.params.id, { isActive }, { new: true }).select("-password");
    res.status(200).json(user);
  } catch (error) {
    if (error.name === "CastError") return res.status(400).json({ message: "Invalid id" });
    res.status(500).json({ message: "Failed to update account status", error: error.message });
  }
};

// @desc    Manager sets a new password for someone who forgot theirs. The person's existing
//          sessions end, and they get a notification asking them to change it after logging in.
// @route   PUT /api/users/:id/password   body: { newPassword }
export const resetUserPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || String(newPassword).length < 8) {
      return res.status(400).json({ message: "The new password must be at least 8 characters" });
    }

    const target = await User.findById(req.params.id).select("role");
    if (!target) return res.status(404).json({ message: "User not found" });
    if (target.role === "manager") {
      return res.status(400).json({ message: "Managers change their own password from the account menu" });
    }

    const salt = await bcrypt.genSalt(10);
    await User.updateOne(
      { _id: target._id },
      { password: await bcrypt.hash(newPassword, salt), passwordChangedAt: new Date() }
    );

    try {
      await Notification.create({
        recipient: target._id,
        type: "general",
        message: "Your manager reset your password. Please change it from the account menu after you log in.",
      });
    } catch (notifyError) {
      console.error("Failed to create password-reset notification:", notifyError.message);
    }

    res.status(200).json({ message: "Password reset" });
  } catch (error) {
    if (error.name === "CastError") return res.status(400).json({ message: "Invalid id" });
    res.status(500).json({ message: "Failed to reset password", error: error.message });
  }
};
