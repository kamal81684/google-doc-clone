import { Router } from "express";
import { applyOrganize, chat, getAiStatus, proposeOrganize } from "../controllers/ai.controller";
import { isAuthenticated } from "../middleware/auth.middleware";

const router = Router();

router.get("/status", isAuthenticated, getAiStatus);

router.post("/chat", isAuthenticated, chat);

router.post("/organize", isAuthenticated, proposeOrganize);

router.post("/organize/apply", isAuthenticated, applyOrganize);

export default router;
