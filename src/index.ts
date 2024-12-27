// import express from "express";
// import dotenv from "dotenv";
// import { genSaltSync, hashSync } from "bcrypt";
// import { StreamChat } from "stream-chat";

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

import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import userRoutes from "./routers/userRoutes";
import { authController } from "./controllers/authController";
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

mongoose
  .connect(process.env.MONGO_URL as string)
  .then(() => console.log("DB connected"))
  .catch((err) => console.error("DB connection error:", err));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// app.use("/api/auth", authRoutes);
app.post("/register", authController.registerUser);
app.post("/verify-registration-Otp", authController.verifyRegistrationOtp);
app.post("/login", authController.loginUser);
app.post("/forgot-password", authController.forgotPassword);
app.post("/verify-otp", authController.verifyOtp);
app.post("/reset-password", authController.resetPassword);
app.post("/create-pin", authController.createPin); 
app.post("/verify-pin", authController.verifyPin);
app.post("/forgot-pin", authController.forgotPin);
app.post("/reset-pin", authController.resetPin);

app.use("/api/users", userRoutes);

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
