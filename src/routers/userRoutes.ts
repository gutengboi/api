import { Router } from "express";
import userController from "../controllers/userController";

const router = Router();

router.get("/:id", userController.getUser);
router.delete("/:id", userController.deleteUser);

export default router;
