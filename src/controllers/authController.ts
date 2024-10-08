import { Request, Response } from "express";
import CryptoJS from "crypto-js";
import { StreamChat } from "stream-chat";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/user";

dotenv.config();

const { STREAM_API_KEY, STREAM_API_SECRET, JWT_SECRET, SECRET } = process.env;
const serverClient = StreamChat.getInstance(STREAM_API_KEY!, STREAM_API_SECRET);

export const authController = {
  registerUser: async (req: Request, res: Response) => {
    const { email, password, username } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({ message: "All fields are required." });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const existingUser = await User.findOne({ email }).exec();
    if (existingUser) {
      return res.status(400).json({ message: "User already exists." });
    }

    try {
      // Encrypt the password using process.env.SECRET
      const hashedPassword = CryptoJS.AES.encrypt(password, SECRET as string).toString();

      const newUser = new User({
        email,
        password: hashedPassword,
        username,
      });

      await newUser.save();

      const userId = newUser.id.toString();

      await serverClient.upsertUser({
        id: userId,
        email,
        name: username,
      });

      const appToken = jwt.sign(
        { id: userId, email },
        JWT_SECRET as string,
        { expiresIn: "7d" }
      );

      const streamToken = serverClient.createToken(userId);

      return res.status(201).json({
        appToken,
        streamToken,
        user: { id: userId, email },
      });
    } catch (err) {
      res.status(500).json({ error: "User registration failed." });
    }
  },

  loginUser: async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
      const user = await User.findOne({ email }).exec();
      if (!user) {
        return res.status(401).json({ message: "Wrong credentials: Invalid email." });
      }

      // Decrypt the stored password using process.env.SECRET
      const decryptedPassword = CryptoJS.AES.decrypt(user.password, SECRET as string).toString(CryptoJS.enc.Utf8);

      if (decryptedPassword !== password) {
        return res.status(401).json({ message: "Wrong password." });
      }

      const userId = user.id.toString();

      const appToken = jwt.sign(
        { id: userId, email: user.email },
        JWT_SECRET as string,
        { expiresIn: "7d" }
      );

      const streamToken = serverClient.createToken(userId);

      const { password: userPass, __v, createdAt, updatedAt, ...userData } = user.toObject();

      return res.status(200).json({
        appToken,
        streamToken,
        user: { ...userData },
      });
    } catch (err) {
      res.status(500).json({ error: "Login failed." });
    }
  },
};
