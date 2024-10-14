import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcrypt";

// Define the ResetToken schema interface
export interface IResetToken extends Document {
  owner: mongoose.Schema.Types.ObjectId;
  token: string;
  createdAt: Date;
  compareToken: (token: string) => Promise<boolean>;
}

// Create the ResetToken schema
const resetTokenSchema = new Schema<IResetToken>({
  owner: {
    type: Schema.Types.ObjectId,
    ref: "User",  // References the User model
    required: true,
  },
  token: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    expires: 3600,  // The token expires after 1 hour
    default: Date.now,
  },
});

// Pre-save hook to hash the OTP token before saving
resetTokenSchema.pre("save", async function (next) {
  if (this.isModified("token")) {
    const hash = await bcrypt.hash(this.token, 8);  // Hash the token with a salt factor of 8
    this.token = hash;
  }
  next();
});

// Method to compare the OTP entered by the user with the hashed OTP
resetTokenSchema.methods.compareToken = async function (token: string): Promise<boolean> {
  return await bcrypt.compare(token, this.token);  // Compare plain text OTP with hashed token
};

// Export the ResetToken model
export default mongoose.model<IResetToken>("ResetToken", resetTokenSchema);
