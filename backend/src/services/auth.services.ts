import bcrypt from "bcrypt";
import { OAuth2Client } from "google-auth-library";
import prisma from "../config/prisma";
import { claimDocumentInvites } from "./permission.service";
import { sendVerificationCode, verifyEmailCode } from "./emailVerification.service";
import { isMailEnabled } from "../config/mailer";
import { AuthError } from "../utils/authError";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const registerUser = async (
    name: string,
    rawEmail: string,
    password: string
) => {
    const email = String(rawEmail ?? "").trim().toLowerCase();

    const existingUser = await prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
    });

    if (existingUser?.emailVerified) {
        throw new AuthError("User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Without SMTP there's no way to deliver a code, so accounts are verified right away
    const verifyByEmail = isMailEnabled();

    // An unfinished sign-up for this email is replaced, so an abandoned (or someone else's)
    // attempt can't block the real owner from registering
    const user = existingUser
        ? await prisma.user.update({
              where: { id: existingUser.id },
              data: { name, password: hashedPassword, emailVerified: !verifyByEmail },
          })
        : await prisma.user.create({
              data: { name, email, password: hashedPassword, emailVerified: !verifyByEmail },
          });

    if (!verifyByEmail) {
        await claimInvitesSafely(user.id, user.email);
        return { user: publicUser(user), requiresVerification: false };
    }

    try {
        await sendVerificationCode(user);
    } catch (error) {
        console.error("Sending verification code failed:", error);
        throw new AuthError("We couldn't send the verification email. Please try again.", 502);
    }

    return { user: publicUser(user), requiresVerification: true };
};

export const loginUser = async (
    email: string,
    password: string
) => {

    const user = await prisma.user.findFirst({
        where: { email: { equals: String(email ?? "").trim(), mode: "insensitive" } },
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

    if (!user.emailVerified) {
        // Send a fresh code (unless one went out in the last minute) and send them to verify
        try {
            await sendVerificationCode(user);
        } catch (error) {
            console.error("Sending verification code failed:", error);
        }
        throw new AuthError(
            "Please verify your email to continue. We've sent a code to your inbox.",
            403,
            "EMAIL_NOT_VERIFIED"
        );
    }

    // Picks up any invite left unclaimed (e.g. one that failed at sign-up)
    await claimInvitesSafely(user.id, user.email);

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

    if (payload.email_verified === false) {
        throw new Error("Your Google email isn't verified");
    }

    // Find by googleId first, then fall back to email (link existing account).
    let user = await prisma.user.findFirst({
        where: {
            OR: [{ googleId }, { email }],
        },
    });

    if (user) {
        // Backfill googleId/avatar for accounts created via email/password.
        if (!user.googleId || !user.emailVerified || (picture && user.avatar !== picture)) {
            user = await prisma.user.update({
                where: { id: user.id },
                data: {
                    googleId: user.googleId || googleId,
                    avatar: picture ?? user.avatar,
                    // Google proved they own this email. An unverified password sign-up may have
                    // been someone else's, so its password is dropped.
                    ...(user.emailVerified ? {} : { emailVerified: true, password: null }),
                },
            });
            await prisma.emailVerification.deleteMany({ where: { userId: user.id } });
        }
    } else {
        user = await prisma.user.create({
            data: {
                name: name || email,
                email,
                googleId,
                avatar: picture ?? null,
                emailVerified: true,
            },
        });
    }

    // Covers new Google accounts and existing ones invited since their last sign-in
    await claimInvitesSafely(user.id, user.email);

    const { password: _, ...userWithoutPassword } = user;

    return userWithoutPassword as typeof user;
};

/** Completes sign-up with the emailed code; the caller logs them in. */
export const verifyEmail = async (email: string, code: string) => {
    const user = await verifyEmailCode(email, code);
    await claimInvitesSafely(user.id, user.email);
    return publicUser(user);
};

/** Resends the code. Says nothing about whether the email exists. */
export const resendVerificationCode = async (rawEmail: string) => {
    const email = String(rawEmail ?? "").trim();
    const user = await prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
    });
    if (!user || user.emailVerified || !isMailEnabled()) {
        return { retryAfter: 60 };
    }
    const { retryAfter } = await sendVerificationCode(user);
    return { retryAfter };
};

const publicUser = <T extends { password?: string | null }>(user: T) => {
    const { password: _, ...rest } = user;
    return rest;
};

// A failed claim shouldn't block signing in; the invites stay and are retried next time
const claimInvitesSafely = async (userId: string, email: string) => {
    try {
        await claimDocumentInvites(userId, email);
    } catch (error) {
        console.error("Claiming document invites failed:", error);
    }
};
