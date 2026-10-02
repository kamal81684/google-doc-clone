import { Router } from "express";
import {
    applyOrganize,
    chat,
    getAiStatus,
    getConversationById,
    getConversations,
    proposeOrganize,
    removeConversation,
} from "../controllers/ai.controller";
import { isAuthenticated } from "../middleware/auth.middleware";

const router = Router();

router.get("/status", isAuthenticated, getAiStatus);

router.post("/chat", isAuthenticated, chat);

router.get("/conversations", isAuthenticated, getConversations);

router.get("/conversations/:id", isAuthenticated, getConversationById);

router.delete("/conversations/:id", isAuthenticated, removeConversation);

router.post("/organize", isAuthenticated, proposeOrganize);

router.post("/organize/apply", isAuthenticated, applyOrganize);

export default router;
