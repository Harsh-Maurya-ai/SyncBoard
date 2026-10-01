import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const JWT_EXPIRES_IN = "7d";

// Signs a token
export function generateJWT(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Creates a user, hashes password
export async function registerUser(req, res) {
  try {
    const { name, email, password } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({ error: "name, email and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: "An account with that email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email: email.toLowerCase(), passwordHash });

    const token = generateJWT(user._id.toString());
    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("[auth] registerUser failed:", err);
    res.status(500).json({ error: "Could not create account" });
  }
}

// Validates credentials, returns JWT
export async function loginUser(req, res) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = generateJWT(user._id.toString());
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("[auth] loginUser failed:", err);
    res.status(500).json({ error: "Could not log in" });
  }
}

// Returns the logged-in user's profile
export async function getCurrentUser(req, res) {
  try {
    const user = await User.findById(req.userId).select("name email");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    console.error("[auth] getCurrentUser failed:", err);
    res.status(500).json({ error: "Could not load profile" });
  }
}