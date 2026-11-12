import { Request, Response } from "express";
import {
    googleAuthUser,
    loginUser,
    registerUser,
    resendVerificationCode,
    verifyEmail,
} from "../services/auth.services";
import { AuthError } from "../utils/authError";

const sendError = (res: Response, error: any) => {
    const status = error instanceof AuthError ? error.status : 400;
    res.status(status).json({
        success: false,
        message: error.message,
        ...(error instanceof AuthError && error.code ? { code: error.code } : {}),
    });
};
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

        const { user, requiresVerification } = await registerUser(
            name,
            email,
            password
        );

        res.status(201).json({
            success: true,
            message: requiresVerification
                ? "We sent a verification code to your email"
                : "User Registered Successfully",
            requiresVerification,
            email: user.email,
            user,
        });

    } catch (error: any) {

        sendError(res, error);

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

        sendError(res, error);

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

export const verifyEmailOtp = async (
    req: Request,
    res: Response
) => {

    try {

        const { email, code } = req.body;

        const user = await verifyEmail(email, code);

        // Verified: log them straight in
        setAuthCookie(res, user.id);

        res.status(200).json({
            success: true,
            message: "Email verified",
            user,
        });

    } catch (error: any) {

        sendError(res, error);

    }

};

export const resendOtp = async (
    req: Request,
    res: Response
) => {

    try {

        const { retryAfter } = await resendVerificationCode(req.body.email);

        res.status(200).json({
            success: true,
            message: "If that account needs verifying, a new code is on its way",
            retryAfter,
        });

    } catch (error: any) {

        sendError(res, error);

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