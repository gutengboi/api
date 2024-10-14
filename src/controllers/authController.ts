import { Request, Response } from "express";
import CryptoJS from "crypto-js";
import { StreamChat } from "stream-chat";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/user";
import ResetToken from "../models/resetToken";
import { generateOTP, mailTransport } from "../utils/mail";

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
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters." });
    }

    const existingUser = await User.findOne({ email }).exec();
    if (existingUser) {
      return res.status(400).json({ message: "User already exists." });
    }

    try {
      const hashedPassword = CryptoJS.AES.encrypt(
        password,
        SECRET as string
      ).toString();

      const newUser = new User({
        email,
        password: hashedPassword,
        username,
        isVerified: false, // Add a field to track account verification
      });

      await newUser.save();

      const otp = generateOTP();

      // Store OTP in a ResetToken collection, like how it's done in password reset
      const resetToken = new ResetToken({
        owner: newUser._id,
        token: otp,
      });
      await resetToken.save();

      const transporter = mailTransport();
      await transporter.sendMail({
        from: '"Your App" <noreply@careNavigator.com>',
        to: email,
        subject: "Verify Your Email - OTP",
        text: `Your OTP for email verification is: ${otp}.`,
        html: `<p>Your OTP for email verification is: <b>${otp}</b>.</p>`,
      });

      res.status(201).json({
        message: "User registered. OTP sent to your email for verification.",
      });
    } catch (err) {
      res.status(500).json({ error: "User registration failed." });
    }
  },

  verifyRegistrationOtp: async (req: Request, res: Response) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required." });
    }

    try {
      const user = await User.findOne({ email }).exec();
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }

      const resetToken = await ResetToken.findOne({ owner: user._id }).exec();
      if (!resetToken) {
        return res
          .status(400)
          .json({ message: "No OTP found or it has already been used." });
      }

      const isValidOtp = await resetToken.compareToken(otp);
      if (!isValidOtp) {
        return res.status(400).json({ message: "Invalid OTP." });
      }

      // Mark user as verified
      user.isVerified = true;
      await user.save();

      await ResetToken.findByIdAndDelete(resetToken._id);

      res
        .status(200)
        .json({ message: "OTP verified, user registration complete." });
    } catch (err) {
      res.status(500).json({ error: "OTP verification failed." });
    }
  },

  loginUser: async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
      const user = await User.findOne({ email }).exec();
      if (!user) {
        return res
          .status(401)
          .json({ message: "Wrong credentials: Invalid email." });
      }

      if (!user.isVerified) {
        return res.status(403).json({ message: "Account is not verified." });
      }

      const decryptedPassword = CryptoJS.AES.decrypt(
        user.password,
        SECRET as string
      ).toString(CryptoJS.enc.Utf8);

      console.log("Decrypted Password:", decryptedPassword);
      console.log("User entered password:", password);

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

      const {
        password: userPass,
        __v,
        createdAt,
        updatedAt,
        ...userData
      } = user.toObject();

      return res
        .status(200)
        .json({ appToken, streamToken, user: { ...userData } });
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

      // Generate a 4-digit OTP
      const otp = generateOTP();

      // Remove any existing reset token for the user
      await ResetToken.findOneAndDelete({ owner: user._id }).exec();

      // Create a new reset token
      const resetToken = new ResetToken({
        owner: user._id,
        token: otp,
      });
      await resetToken.save();

      // Send OTP email using the mailTransport function
      const transporter = mailTransport();
      await transporter.sendMail({
        from: '"Your App" <noreply@careNavigator.com>',
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
    const { email, otp, newPassword } = req.body;

    if (!otp || !newPassword || !email) {
      return res
        .status(400)
        .json({ message: "Email, OTP, and new password are required." });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters." });
    }

    try {
      const user = await User.findOne({ email }).exec();
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }

      const resetToken = await ResetToken.findOne({ owner: user._id }).exec();
      if (!resetToken) {
        return res.status(400).json({ message: "Invalid or expired OTP." });
      }

      // Compare the provided OTP with the stored hashed token
      const isValidOtp = await resetToken.compareToken(otp);
      if (!isValidOtp) {
        return res.status(400).json({ message: "Invalid OTP." });
      }

      // Hash the new password and save it
      const hashedPassword = CryptoJS.AES.encrypt(
        newPassword,
        SECRET as string
      ).toString();
      user.password = hashedPassword;
      await user.save();

      // Remove the reset token after successful password reset
      await ResetToken.findByIdAndDelete(resetToken._id);

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
      // Find the user by email
      const user = await User.findOne({ email }).exec();
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }

      // Find the OTP reset token associated with this user
      const resetToken = await ResetToken.findOne({ owner: user._id }).exec();
      if (!resetToken) {
        return res
          .status(400)
          .json({ message: "No OTP found or it has already been used." });
      }

      // Compare the provided OTP with the stored token in ResetToken collection
      const isValidOtp = await resetToken.compareToken(otp);
      if (!isValidOtp) {
        return res.status(400).json({ message: "Invalid OTP." });
      }

      res.status(200).json({ message: "OTP verified successfully." });
    } catch (err) {
      res.status(500).json({ error: "OTP verification failed." });
    }
  },
};
