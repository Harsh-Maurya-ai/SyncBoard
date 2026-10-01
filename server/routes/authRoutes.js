import { Router } from "express";
import { registerUser, loginUser, getCurrentUser } from "../controllers/authController.js";
import { verifyJWT } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", verifyJWT, getCurrentUser);

export default router;