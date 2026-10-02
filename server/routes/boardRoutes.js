import { Router } from "express";
import {
  createBoard,
  getBoardById,
  saveBoard,
  listUserBoards,
  deleteBoard,
  renameBoard,
} from "../controllers/boardController.js";
import {
  checkAccess,
  createShareLink,
  revokeShareLink,
  joinBoardByToken,
  listMembers,
  updateMemberRole,
  removeMember,
} from "../controllers/permissionController.js";
import { verifyJWT } from "../middleware/authMiddleware.js";

const router = Router();

router.use(verifyJWT); // every board route requires a logged-in user

router.get("/", listUserBoards);
router.post("/", createBoard);

// Must stay above the "/:id" routes
router.post("/join/:token", joinBoardByToken);

router.get("/:id", checkAccess("viewer"), getBoardById);
router.put("/:id/state", checkAccess("editor"), saveBoard);
router.patch("/:id", checkAccess("owner"), renameBoard);
router.delete("/:id", checkAccess("owner"), deleteBoard);

router.post("/:id/share", checkAccess("owner"), createShareLink);
router.delete("/:id/share", checkAccess("owner"), revokeShareLink);

router.get("/:id/members", checkAccess("owner"), listMembers);
router.put("/:id/members/:userId", checkAccess("owner"), updateMemberRole);
router.delete("/:id/members/:userId", checkAccess("viewer"), removeMember);

export default router;