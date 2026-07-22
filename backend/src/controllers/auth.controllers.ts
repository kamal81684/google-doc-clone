import { Request, Response } from "express";
import {
    googleAuthUser,
    loginUser,
    registerUser,
} from "../services/auth.services";
import { generateToken } from "../utils/generateToken";

const setAuthCookie = (res: Response, userId: string) => {
    const token = generateToken(userId);

    res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
};

export const register = async (
    req: Request,
    res: Response
) => {

    try {

        const { name, email, password } = req.body;

        const user = await registerUser(
            name,
            email,
            password
        );

        res.status(201).json({
            success: true,
            message: "User Registered Successfully",
            user,
        });

    } catch (error: any) {

        res.status(400).json({
            success: false,
            message: error.message,
        });

    }

};

export const login = async (
    req: Request,
    res: Response
) => {

    try {

        const { email, password } = req.body;

        const user = await loginUser(
            email,
            password
        );

        setAuthCookie(res, user.id);

        res.status(200).json({
            success: true,
            user,
        });

    } catch (error: any) {

        res.status(400).json({
            success: false,
            message: error.message,
        });

    }

};

export const googleLogin = async (
    req: Request,
    res: Response
) => {

    try {

        const { credential } = req.body;

        if (!credential) {
            return res.status(400).json({
                success: false,
                message: "Missing Google credential",
            });
        }

        const user = await googleAuthUser(credential);

        setAuthCookie(res, user.id);

        res.status(200).json({
            success: true,
            user,
        });

    } catch (error: any) {

        res.status(400).json({
            success: false,
            message: error.message,
        });

    }

};

export const logout = async (
    req: Request,
    res: Response
) => {

    res.cookie("token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
    });

    res.json({
        success: true,
        message: "Logged Out",
    });

};