import bcrypt from "bcrypt";
import { OAuth2Client } from "google-auth-library";
import prisma from "../config/prisma";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const registerUser = async (
    name: string,
    email: string,
    password: string
) => {

    const existingUser = await prisma.user.findUnique({
        where: { email }
    });

    if (existingUser) {
        throw new Error("User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
        },
        select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            updatedAt: true,
        },
    });

    return user;
};

export const loginUser = async (
    email: string,
    password: string
) => {

    const user = await prisma.user.findUnique({
        where: { email }
    });

    if (!user)
        throw new Error("Invalid Credentials");

    // Google-only accounts have no password set
    if (!user.password)
        throw new Error("This account uses Google Sign-In. Please continue with Google.");

    const isMatch = await bcrypt.compare(
        password,
        user.password
    );

    if (!isMatch)
        throw new Error("Invalid Credentials");

    const { password: _, ...userWithoutPassword } = user;

    return userWithoutPassword as typeof user;
};

export const googleAuthUser = async (
    idToken: string
) => {

    if (!process.env.GOOGLE_CLIENT_ID) {
        throw new Error("Google Sign-In is not configured on the server");
    }

    const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
        throw new Error("Invalid Google token");
    }

    const { sub: googleId, email, name, picture } = payload;

    // Find by googleId first, then fall back to email (link existing account).
    let user = await prisma.user.findFirst({
        where: {
            OR: [{ googleId }, { email }],
        },
    });

    if (user) {
        // Backfill googleId/avatar for accounts created via email/password.
        if (!user.googleId || (picture && user.avatar !== picture)) {
            user = await prisma.user.update({
                where: { id: user.id },
                data: {
                    googleId: user.googleId || googleId,
                    avatar: picture ?? user.avatar,
                },
            });
        }
    } else {
        user = await prisma.user.create({
            data: {
                name: name || email,
                email,
                googleId,
                avatar: picture ?? null,
            },
        });
    }

    const { password: _, ...userWithoutPassword } = user;

    return userWithoutPassword as typeof user;
};
