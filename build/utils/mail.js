"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mailTransport = exports.generateOTP = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const generateOTP = () => {
    let otp = "";
    for (let i = 0; i < 4; i++) {
        const randVal = Math.floor(Math.random() * 10);
        otp += randVal.toString();
    }
    return otp;
};
exports.generateOTP = generateOTP;
// Function to create and configure the email transporter
const mailTransport = () => {
    return nodemailer_1.default.createTransport({
        host: "sandbox.smtp.mailtrap.io",
        port: 2525,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
};
exports.mailTransport = mailTransport;
//# sourceMappingURL=mail.js.map