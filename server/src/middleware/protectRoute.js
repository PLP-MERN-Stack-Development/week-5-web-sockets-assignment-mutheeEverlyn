import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const protectRoute = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Not authorized, no token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({ error: "Not authorized, user not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.log("Error in protectRoute middleware:", error.message);
    res.status(401).json({ error: "Not authorized, token failed" });
  }
}; 