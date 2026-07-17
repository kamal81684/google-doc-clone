import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import documentRoutes from "./routes/document.route";

import authRoutes from "./routes/auth.routes";

const app = express();

app.use(express.json());

app.use(cookieParser());

app.use(cors({
    origin: "http://localhost:3000",
    credentials: true,
}));

app.use(helmet());

app.use(morgan("dev"));

app.use("/api/v1/auth", authRoutes);

app.use("/api/v1/documents", documentRoutes);

export default app;