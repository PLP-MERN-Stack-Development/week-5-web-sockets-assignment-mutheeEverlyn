import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const protectRoute = async (req, res, next) => {
  try {
    let token;

    // Check Authorization header first
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }
    // Then check cookies
    else if (req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      console.log("No token provided in request");
      return res.status(401).json({ message: "Unauthorized - No Token Provided" });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Token decoded successfully:", decoded);

      if (!decoded) {
        console.log("Token verification returned null");
        return res.status(401).json({ message: "Unauthorized - Invalid Token" });
      }

      const user = await User.findById(decoded.userId).select("-password");
      console.log("User found:", user ? "Yes" : "No");

      if (!user) {
        console.log("No user found for ID:", decoded.userId);
        return res.status(404).json({ message: "User not found" });
      }

      req.user = user;
      next();
    } catch (jwtError) {
      console.log("JWT verification error:", jwtError.message);
      return res.status(401).json({ message: "Unauthorized - Invalid Token" });
    }
  } catch (error) {
    console.log("Error in protectRoute middleware:", error);
    console.log("Error stack:", error.stack);
    res.status(500).json({ message: "Internal server error" });
  }
};
