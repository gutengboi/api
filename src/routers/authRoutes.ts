import { Router } from "express";
import { authController } from "../controllers/authController";

const router = Router();

// Register a new user
router.post("/register", authController.registerUser);

// Login an existing user
router.post("/login", authController.loginUser);

// Request a password reset
router.post("/forgot-password", authController.forgotPassword);

// Reset password with OTP
router.post("/reset-password", authController.resetPassword);

// Verify OTP
router.post("/verify-otp", authController.verifyOtp);

export default router;
