import { Router } from "express";
import { createFolder, deleteFolder, getFolders, renameFolder } from "../controllers/folder.controller";
import { isAuthenticated } from "../middleware/auth.middleware";

const router = Router();

router.get("/", isAuthenticated, getFolders);
router.post("/", isAuthenticated, createFolder);
router.patch("/:id", isAuthenticated, renameFolder);
router.delete("/:id", isAuthenticated, deleteFolder);

export default router;
