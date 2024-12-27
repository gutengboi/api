"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const router = (0, express_1.Router)();
// Register a new user
router.post("/register", authController_1.authController.registerUser);
// Login an existing user
router.post("/login", authController_1.authController.loginUser);
// Request a password reset
router.post("/forgot-password", authController_1.authController.forgotPassword);
// Reset password with OTP
router.post("/reset-password", authController_1.authController.resetPassword);
// Verify OTP
router.post("/verify-otp", authController_1.authController.verifyOtp);
exports.default = router;
//# sourceMappingURL=authRoutes.js.map