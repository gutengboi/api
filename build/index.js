"use strict";
// import express from "express";
// import dotenv from "dotenv";
// import { genSaltSync, hashSync } from "bcrypt";
// import { StreamChat } from "stream-chat";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// dotenv.config();
// const { PORT, STREAM_API_KEY, STREAM_API_SECRET } = process.env;
// const serverClient = StreamChat.getInstance(STREAM_API_KEY!, STREAM_API_SECRET);
// const app = express();
// app.use(express.json());
// const salt = genSaltSync(10);
// interface User {
//   id: string;
//   email: string;
//   hashed_password: string;
// }
// const USERS: User[] = [];
// app.post("/register", async (req, res) => {
//   const { email, password } = req.body;
//   if (!email || !password) {
//     return res.status(400).json({
//       message: "Email and password are required.",
//     });
//   }
//   if (password.length < 6) {
//     return res.status(400).json({
//       message: "Password must be at least 6 characters.",
//     });
//   }
//   const existingUser = USERS.find((user) => user.email === email);
//   if (existingUser) {
//     return res.status(400).json({
//       message: "User already exists.",
//     });
//   }
//   try {
//     const hashed_password = hashSync(password, salt);
//     const id = Math.random().toString(36).slice(2);
//     const newUser = {
//       id,
//       email,
//       hashed_password,
//     };
//     USERS.push(newUser);
//     await serverClient.upsertUser({
//       id,
//       email,
//       name: email,
//     });
//     const token = serverClient.createToken(id);
//     return res.status(200).json({
//       token,
//       user: {
//         id,
//         email,
//       },
//     });
//   } catch (err) {
//     res.status(500).json({ error: "User already exists" });
//   }
// });
// app.post("/login", (req, res) => {
//   const { email, password } = req.body;
//   const user = USERS.find((user) => user.email === email);
//   const hashed_password = hashSync(password, salt);
//   if (!user || user.hashed_password !== hashed_password) {
//     return res.status(400).json({
//       message: "Invalid credentials.",
//     });
//   }
//   const token = serverClient.createToken(user.id);
//   return res.status(200).json({
//     token,
//     user: {
//       id: user.id,
//       email: user.email,
//     },
//   });
// });
// app.listen(PORT, () => {
//   console.log(`Server is listening on port ${PORT}`);
// });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const userRoutes_1 = __importDefault(require("./routers/userRoutes"));
const authController_1 = require("./controllers/authController");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
mongoose_1.default
    .connect(process.env.MONGO_URL)
    .then(() => console.log("DB connected"))
    .catch((err) => console.error("DB connection error:", err));
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ limit: "10mb", extended: true }));
// app.use("/api/auth", authRoutes);
app.post("/register", authController_1.authController.registerUser);
app.post("/verify-registration-Otp", authController_1.authController.verifyRegistrationOtp);
app.post("/login", authController_1.authController.loginUser);
app.post("/forgot-password", authController_1.authController.forgotPassword);
app.post("/verify-otp", authController_1.authController.verifyOtp);
app.post("/reset-password", authController_1.authController.resetPassword);
app.use("/api/users", userRoutes_1.default);
app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});
//# sourceMappingURL=index.js.map