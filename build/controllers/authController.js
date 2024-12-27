"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = void 0;
const crypto_js_1 = __importDefault(require("crypto-js"));
const stream_chat_1 = require("stream-chat");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const user_1 = __importDefault(require("../models/user"));
const resetToken_1 = __importDefault(require("../models/resetToken"));
const mail_1 = require("../utils/mail");
dotenv_1.default.config();
const { STREAM_API_KEY, STREAM_API_SECRET, JWT_SECRET, SECRET } = process.env;
const serverClient = stream_chat_1.StreamChat.getInstance(STREAM_API_KEY, STREAM_API_SECRET);
exports.authController = {
    registerUser: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const { email, password, username } = req.body;
        if (!email || !password || !username) {
            return res.status(400).json({ message: "All fields are required." });
        }
        if (password.length < 6) {
            return res
                .status(400)
                .json({ message: "Password must be at least 6 characters." });
        }
        const existingUser = yield user_1.default.findOne({ email }).exec();
        if (existingUser) {
            return res.status(400).json({ message: "User already exists." });
        }
        try {
            const hashedPassword = crypto_js_1.default.AES.encrypt(password, SECRET).toString();
            const newUser = new user_1.default({
                email,
                password: hashedPassword,
                username,
                isVerified: false, // Add a field to track account verification
            });
            yield newUser.save();
            const otp = (0, mail_1.generateOTP)();
            // Store OTP in a ResetToken collection, like how it's done in password reset
            const resetToken = new resetToken_1.default({
                owner: newUser._id,
                token: otp,
            });
            yield resetToken.save();
            const transporter = (0, mail_1.mailTransport)();
            yield transporter.sendMail({
                from: '"Your App" <noreply@careNavigator.com>',
                to: email,
                subject: "Verify Your Email - OTP",
                text: `Your OTP for email verification is: ${otp}.`,
                html: `<p>Your OTP for email verification is: <b>${otp}</b>.</p>`,
            });
            res.status(201).json({
                message: "User registered. OTP sent to your email for verification.",
            });
        }
        catch (err) {
            res.status(500).json({ error: "User registration failed." });
        }
    }),
    verifyRegistrationOtp: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ message: "Email and OTP are required." });
        }
        try {
            const user = yield user_1.default.findOne({ email }).exec();
            if (!user) {
                return res.status(404).json({ message: "User not found." });
            }
            const resetToken = yield resetToken_1.default.findOne({ owner: user._id }).exec();
            if (!resetToken) {
                return res
                    .status(400)
                    .json({ message: "No OTP found or it has already been used." });
            }
            const isValidOtp = yield resetToken.compareToken(otp);
            if (!isValidOtp) {
                return res.status(400).json({ message: "Invalid OTP." });
            }
            // Mark user as verified
            user.isVerified = true;
            yield user.save();
            yield resetToken_1.default.findByIdAndDelete(resetToken._id);
            res
                .status(200)
                .json({ message: "OTP verified, user registration complete." });
        }
        catch (err) {
            res.status(500).json({ error: "OTP verification failed." });
        }
    }),
    loginUser: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const { email, password } = req.body;
        try {
            const user = yield user_1.default.findOne({ email }).exec();
            if (!user) {
                return res
                    .status(401)
                    .json({ message: "Wrong credentials: Invalid email." });
            }
            if (!user.isVerified) {
                return res.status(403).json({ message: "Account is not verified." });
            }
            const decryptedPassword = crypto_js_1.default.AES.decrypt(user.password, SECRET).toString(crypto_js_1.default.enc.Utf8);
            console.log("Decrypted Password:", decryptedPassword);
            console.log("User entered password:", password);
            if (decryptedPassword !== password) {
                return res.status(401).json({ message: "Wrong password." });
            }
            const userId = user.id.toString();
            const appToken = jsonwebtoken_1.default.sign({ id: userId, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
            const streamToken = serverClient.createToken(userId);
            const _a = user.toObject(), { password: userPass, __v, createdAt, updatedAt } = _a, userData = __rest(_a, ["password", "__v", "createdAt", "updatedAt"]);
            return res
                .status(200)
                .json({ appToken, streamToken, user: Object.assign({}, userData) });
        }
        catch (err) {
            res.status(500).json({ error: "Login failed." });
        }
    }),
    forgotPassword: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: "Email is required." });
        }
        try {
            // Find user by email
            const user = yield user_1.default.findOne({ email }).exec();
            if (!user) {
                return res.status(404).json({ message: "User not found." });
            }
            // Generate a 4-digit OTP
            const otp = (0, mail_1.generateOTP)();
            // Remove any existing reset token for the user
            yield resetToken_1.default.findOneAndDelete({ owner: user._id }).exec();
            // Create a new reset token
            const resetToken = new resetToken_1.default({
                owner: user._id,
                token: otp,
            });
            yield resetToken.save();
            try {
                // Send OTP email using the mailTransport function
                const transporter = (0, mail_1.mailTransport)(); // Ensure this function is properly configured
                yield transporter.sendMail({
                    from: '"Your App" <noreply@careNavigator.com>',
                    to: email,
                    subject: "Your Password Reset OTP",
                    text: `Your OTP for password reset is: ${otp}. It is valid for 1 hour.`,
                    html: `<p>Your OTP for password reset is: <b>${otp}</b>.</p><p>It is valid for 1 hour.</p>`,
                });
                res.status(200).json({ message: "OTP sent to your email." });
            }
            catch (emailError) {
                // Log email sending error
                console.error("Error sending OTP email:", emailError);
                res.status(500).json({ error: "Failed to send OTP email." });
            }
        }
        catch (err) {
            // Log error related to the database or OTP generation
            console.error("Error in forgotPassword flow:", err);
            res.status(500).json({ error: "An error occurred during the password reset process." });
        }
    }),
    resetPassword: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
            const user = yield user_1.default.findOne({ email }).exec();
            if (!user) {
                return res.status(404).json({ message: "User not found." });
            }
            const resetToken = yield resetToken_1.default.findOne({ owner: user._id }).exec();
            if (!resetToken) {
                return res.status(400).json({ message: "Invalid or expired OTP." });
            }
            // Compare the provided OTP with the stored hashed token
            const isValidOtp = yield resetToken.compareToken(otp);
            if (!isValidOtp) {
                return res.status(400).json({ message: "Invalid OTP." });
            }
            // Hash the new password and save it
            const hashedPassword = crypto_js_1.default.AES.encrypt(newPassword, SECRET).toString();
            user.password = hashedPassword;
            yield user.save();
            // Remove the reset token after successful password reset
            yield resetToken_1.default.findByIdAndDelete(resetToken._id);
            res.status(200).json({ message: "Password reset successful." });
        }
        catch (err) {
            res.status(500).json({ error: "Password reset failed." });
        }
    }),
    verifyOtp: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ message: "Email and OTP are required." });
        }
        try {
            // Find the user by email
            const user = yield user_1.default.findOne({ email }).exec();
            if (!user) {
                return res.status(404).json({ message: "User not found." });
            }
            // Find the OTP reset token associated with this user
            const resetToken = yield resetToken_1.default.findOne({ owner: user._id }).exec();
            if (!resetToken) {
                return res
                    .status(400)
                    .json({ message: "No OTP found or it has already been used." });
            }
            // Compare the provided OTP with the stored token in ResetToken collection
            const isValidOtp = yield resetToken.compareToken(otp);
            if (!isValidOtp) {
                return res.status(400).json({ message: "Invalid OTP." });
            }
            res.status(200).json({ message: "OTP verified successfully." });
        }
        catch (err) {
            res.status(500).json({ error: "OTP verification failed." });
        }
    }),
};
//# sourceMappingURL=authController.js.map