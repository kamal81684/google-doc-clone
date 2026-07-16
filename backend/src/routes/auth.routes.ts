import { Router } from "express";

import {
    login,
    logout,
    register,
} from "../controllers/auth.controllers";

import { isAuthenticated } from "../middleware/auth.middleware";

const router = Router();

router.post("/register", register);

router.post("/login", login);

router.post("/logout", logout);

router.get("/me", isAuthenticated, (req, res) => {

    res.json({
        success: true,
        user: (req as any).user,
    });

});

export default router;