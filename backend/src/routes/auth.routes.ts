import { Router } from "express";

import {
    login,
    logout,
    register,
} from "../controllers/auth.controllers";

import { isAuthenticated } from "../middleware/auth.middleware";
import prisma from "../config/prisma";

const router = Router();

router.post("/register", register);

router.post("/login", login);

router.post("/logout", logout);

router.get("/me", isAuthenticated, async (req, res) => {

    try {

        const user = await prisma.user.findUnique({
            where: { id: (req as any).user.id },
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        res.json({
            success: true,
            user,
        });

    } catch (error: any) {

        res.status(500).json({
            success: false,
            message: error.message,
        });

    }

});

export default router;