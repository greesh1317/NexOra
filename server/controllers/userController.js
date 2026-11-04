import User from "../models/User.js";

// @desc    Get all users (optionally filter by role)
// @route   GET /api/users?role=team_leader
export const getUsers = async (req, res) => {
  try {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;

    const users = await User.find(filter).select("-password").sort({ name: 1 });
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
