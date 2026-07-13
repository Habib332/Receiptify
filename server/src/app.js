const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const authRoutes = require("./modules/auth/auth.routes");
const errorMiddleware = require("./middleware/error.middleware");
const businessRoutes = require("./modules/business/business.routes");
const receiptsRoutes = require("./modules/receipts/receipts.routes");
const userRoutes = require("./modules/users/user.routes");
const app = express();

// Core middleware
app.use(helmet());
app.use(cors()); // TODO: restrict origins before production
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // needed for the short-lived Google OAuth state cookie

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/business", businessRoutes);
app.use("/api/receipts", receiptsRoutes);
app.use("/api/users", userRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({ success: true, message: "Server is running" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Central error handler — must be last
app.use(errorMiddleware);

module.exports = app;