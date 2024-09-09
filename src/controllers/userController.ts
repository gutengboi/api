import { Request, Response } from "express";
import User from "../models/user"; 

export const userController = {
  deleteUser: async (req: Request, res: Response) => {
    try {
      const user = await User.findByIdAndDelete(req.params.id);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.status(200).json({ message: "Successfully Deleted" });
    } catch (error) {
      res.status(500).json({ message: "An error occurred", error });
    }
  },

  getUser: async (req: Request, res: Response) => {
    try {
      const user = await User.findById(req.params.id);

      if (!user) {
        return res.status(404).json({ message: "User does not exist" });
      }

      // Destructure sensitive data from the user object
      const { password, __v, createdAt, updatedAt, ...userData } = user.toObject();

      res.status(200).json(userData);
    } catch (error) {
      res.status(500).json({ message: "An error occurred", error });
    }
  },
};

export default userController;
