import { Router } from "express";
import { createBoard, getBoardById } from "../controllers/boardController.js";
import { verifyJWT } from "../middleware/authMiddleware.js";

const router = Router();

router.use(verifyJWT); // every board route requires a logged-in user

router.post("/", createBoard);
router.get("/:id", getBoardById);

export default router;