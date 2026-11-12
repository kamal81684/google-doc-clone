/** An auth failure with an HTTP status and a machine-readable code the frontend can act on */
export class AuthError extends Error {
    constructor(
        message: string,
        public status = 400,
        public code?: string
    ) {
        super(message);
    }
}
