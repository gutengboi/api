import { Request, Response } from "express";
import CryptoJS from "crypto-js";
import { StreamChat } from "stream-chat";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/user";
import nodemailer from "nodemailer";
import crypto from "crypto";


dotenv.config();

const { STREAM_API_KEY, STREAM_API_SECRET, JWT_SECRET, SECRET, EMAIL_USER, EMAIL_PASS } = process.env;
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

  forgotPassword: async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    try {
      const user = await User.findOne({ email }).exec();
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }

      // Generate a 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedOtp = CryptoJS.AES.encrypt(otp, SECRET as string).toString();

      // Save the hashed OTP and expiration to the user object
      user.passwordResetToken = hashedOtp;
      user.passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour expiry
      await user.save();

      // Send OTP email
      const transporter = nodemailer.createTransport({
        service: "gmail", // or your email service
        auth: {
          user: EMAIL_USER,
          pass: EMAIL_PASS,
        },
      });

      await transporter.sendMail({
        from: '"Your App" <noreply@yourdomain.com>',
        to: email,
        subject: "Your Password Reset OTP",
        text: `Your OTP for password reset is: ${otp}. It is valid for 1 hour.`,
        html: `<p>Your OTP for password reset is: <b>${otp}</b>.</p><p>It is valid for 1 hour.</p>`,
      });

      res.status(200).json({ message: "OTP sent to your email." });
    } catch (err) {
      res.status(500).json({ error: "Failed to send OTP email." });
    }
  },

  resetPassword: async (req: Request, res: Response) => {
    const { otp, newPassword } = req.body;

    if (!otp || !newPassword) {
        return res.status(400).json({ message: "OTP and new password are required." });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    try {
        const user = await User.findOne({
            passwordResetToken: { $exists: true },
            passwordResetExpires: { $gt: Date.now() }, // Ensure the OTP is still valid
        }).exec();

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired OTP." });
        }

        // Check if the passwordResetToken is defined before decrypting
        if (!user.passwordResetToken) {
            return res.status(400).json({ message: "Invalid or expired OTP." });
        }

        // Decrypt the stored OTP
        const decryptedOtp = CryptoJS.AES.decrypt(user.passwordResetToken, SECRET as string).toString(CryptoJS.enc.Utf8);

        if (decryptedOtp !== otp) {
            return res.status(400).json({ message: "Invalid OTP." });
        }

        // Hash the new password and save it
        const hashedPassword = CryptoJS.AES.encrypt(newPassword, SECRET as string).toString();
        user.password = hashedPassword;
        user.passwordResetToken = undefined;  // Clear the OTP
        user.passwordResetExpires = undefined; // Clear the expiration
        await user.save();

        res.status(200).json({ message: "Password reset successful." });
    } catch (err) {
        res.status(500).json({ error: "Password reset failed." });
    }
},

verifyOtp: async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required." });
  }

  try {
    const user = await User.findOne({ email }).exec();
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (!user.passwordResetToken) {
      return res.status(400).json({ message: "No OTP found or it has already been used." });
    }

    const decryptedOtp = CryptoJS.AES.decrypt(user.passwordResetToken, SECRET as string).toString(CryptoJS.enc.Utf8);

    if (decryptedOtp !== otp) {
      return res.status(400).json({ message: "Invalid OTP." });
    }

    res.status(200).json({ message: "OTP verified successfully." });
  } catch (err) {
    res.status(500).json({ error: "OTP verification failed." });
  }
},
  

};
