import nodemailer from "nodemailer";

export const generateOTP = (): string => {
  let otp = "";
  for (let i = 0; i < 4; i++) {
    const randVal = Math.floor(Math.random() * 10);
    otp += randVal.toString();
  }
  return otp;
};

// Function to create and configure the email transporter
export const mailTransport = () => {
  return nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",  
    port: 2525,
    auth: {
      user: process.env.EMAIL_USER, 
      pass: process.env.EMAIL_PASS,
    },
  });
};
