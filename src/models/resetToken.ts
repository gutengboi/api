import mongoose, { Schema, Document } from "mongoose";
import CryptoJS from "crypto-js";

export interface IResetToken extends Document {
  owner: mongoose.Schema.Types.ObjectId;
  token: string;
  createdAt: Date;
  compareToken: (token: string) => Promise<boolean>;
}


const resetTokenSchema = new Schema<IResetToken>({
  owner: {
    type: Schema.Types.ObjectId,
    ref: "User", 
    required: true,
  },
  token: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    expires: 3600, 
    default: Date.now,
  },
});


resetTokenSchema.pre("save", async function (next) {
  if (this.isModified("token")) {
    const secret = process.env.RESET_TOKEN_SECRET; 
    if (!secret) {
      throw new Error("Missing environment variable RESET_TOKEN_SECRET");
    }
    const hash = CryptoJS.AES.encrypt(this.token, secret).toString();
    this.token = hash;
  }
  next();
});

resetTokenSchema.methods.compareToken = async function (
  token: string
): Promise<boolean> {
  const secret = process.env.RESET_TOKEN_SECRET; 
  if (!secret) {
    throw new Error("Missing environment variable RESET_TOKEN_SECRET");
  }
  const decrypted = CryptoJS.AES.decrypt(this.token, secret).toString(
    CryptoJS.enc.Utf8
  );
  return decrypted === token; 
};

export default mongoose.model<IResetToken>("ResetToken", resetTokenSchema);
