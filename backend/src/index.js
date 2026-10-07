require("dotenv").config();
require("express-async-errors");
const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorHandler");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const productRoutes = require("./routes/productRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const returnRoutes = require("./routes/returnRoutes");
const walletRoutes = require("./routes/walletRoutes");
const wishlistRoutes = require("./routes/wishlistRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const locationRoutes = require("./routes/locationRoutes");
const adminRoutes = require("./routes/adminRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const sellerRoutes = require("./routes/sellerRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const superAdminRoutes = require("./routes/superAdminRoutes");
const planRoutes = require("./routes/planRoutes");
const enquiryRoutes = require("./routes/enquiryRoutes");
const businessRoutes = require("./routes/businessRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const courierRoutes = require("./routes/courierRoutes");
const offerRoutes = require("./routes/offerRoutes");
const searchRoutes = require("./routes/searchRoutes");
const customerTicketRoutes = require("./routes/customerTicketRoutes");
const whatsappRoutes = require("./routes/whatsappRoutes");
const metalRateRoutes = require("./routes/metalRateRoutes");
const blogRoutes = require("./routes/blogRoutes");
const contactMessageRoutes = require("./routes/contactMessageRoutes");

connectDB();

const app = express();

app.use(helmet());

// Seller storefronts live on subdomains of the main site (e.g. "my-shop.growthkarts.com",
// or "my-shop.localhost:5173" in dev), so CORS must accept those dynamically rather than
// a single fixed origin. Any origin matching the root domain or "<anything>.<root domain>"
// is allowed; credentials require the specific origin to be echoed back, not a wildcard.
const rootHost = (() => {
  try {
    return new URL(process.env.CLIENT_URL || "http://localhost:5173").hostname;
  } catch {
    return "localhost";
  }
})();

// Extra frontend domains, comma-separated (e.g. a Vercel deployment):
// CORS_ORIGINS=https://jewellery-three-beta.vercel.app,https://www.mysite.com
const extraHosts = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((o) => {
    try {
      return new URL(o.trim()).hostname;
    } catch {
      return o.trim().toLowerCase();
    }
  })
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // non-browser clients (curl, mobile apps)
      let hostname;
      try {
        hostname = new URL(origin).hostname;
      } catch {
        return callback(new Error("Not allowed by CORS"));
      }
      if (hostname === rootHost || hostname.endsWith(`.${rootHost}`))
        return callback(null, true);
      if (extraHosts.some((h) => hostname === h || hostname.endsWith(`.${h}`)))
        return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
// Only log requests that actually failed (4xx/5xx) — every successful
// request was flooding the console and looked like a wall of errors even
// though status 200/304 lines are normal, healthy traffic.
app.use(morgan("dev", { skip: (req, res) => res.statusCode < 400 }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "development" ? 5000 : 300,
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api/", limiter);

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/returns", returnRoutes);
app.use("/api/v1/wallet", walletRoutes);
app.use("/api/v1/wishlist", wishlistRoutes);
app.use("/api/v1/reviews", reviewRoutes);
app.use("/api/v1/location", locationRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/seller", sellerRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/settings", settingsRoutes);
app.use("/api/v1/superadmin", superAdminRoutes);
app.use("/api/v1/plans", planRoutes);
app.use("/api/v1/enquiries", enquiryRoutes);
app.use("/api/v1/businesses", businessRoutes);
app.use("/api/v1/upload", uploadRoutes);
app.use("/api/v1/courier", courierRoutes);
app.use("/api/v1/offers", offerRoutes);
app.use("/api/v1/search", searchRoutes);
app.use("/api/v1/customer-tickets", customerTicketRoutes);
app.use("/api/v1/whatsapp", whatsappRoutes);
app.use("/api/v1/metal-rates", metalRateRoutes);
app.use("/api/v1/blogs", blogRoutes);
app.use("/api/v1/contact-messages", contactMessageRoutes);

app.get("/api/v1/health", (req, res) => {
  res.json({
    status: "ok",
    message: "growthkarts API is running",
    timestamp: new Date().toISOString(),
  });
});

// ── Frontend Static Files ───────────────────────────────────────────────
// public/ mein index.html aur assets/ hain (frontend build yahan copy hoti hai)
const frontendPath = path.join(__dirname, "..", "public");
app.use(express.static(frontendPath));

// ── SPA Fallback ────────────────────────────────────────────────────────
// Sirf non-API GET requests ke liye index.html serve karo (React Router ke
// client-side routes jaise /login, /dashboard refresh/direct-navigate hone
// par). /api/* unmatched requests ko existing notFound/errorHandler chain
// tak pahunchne do — taaki har controller ka res.status(xxx) wahi behave
// kare jaise pehle karta tha.
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(frontendPath, "index.html"), (err) => {
    if (err) {
      console.error("[ERROR] index.html serve failed:", err.message);
      res.status(500).send("Frontend not available.");
    }
  });
});

// Error handler must be registered LAST so it catches errors from every
// route/middleware defined above it (including the static/SPA fallback).
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(
    `🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`,
  );
});
// Large video uploads (storefront hero banners) can take a while on a slow
// connection — the default 5-minute request timeout was cutting those off
// mid-upload, which showed up to the browser as a broken/500 response.
server.requestTimeout = 15 * 60 * 1000;
server.headersTimeout = 15 * 60 * 1000 + 5000;
