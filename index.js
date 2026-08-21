// Core dependencies
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");
 //const { initializeCheckpointer } = require("./agent/config/checkpointer.config");
// Configuration
dotenv.config();

// Database connection
const connectDB = require("./config/db");

// Routes
const authRoutes = require("./router/authRoutes");
const emailRoutes = require("./router/emailRoutes");
const ingestionRoutes = require("./router/ingestion.routes");
const chatRoutes = require("./router/chat.routes");
const agentRoutes = require("./router/agentRoute");
// Add this at the very top of your file
const dns = require('node:dns');
dns.setServers(['1.1.1.1', '8.8.8.8']); 

// Initialize database connection
const initializeApp = async () => {
  try {
    await connectDB();
    
    console.log('✅ All database connections established');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
};

initializeApp();

// const initializedCheckpointer = async () => {
 
//  try {
//     await initializeCheckpointer();
//     console.log('✅ Checkpointer initialized successfully');
//   } catch (error) {
//     console.error('❌ Checkpointer initialization failed:', error);
//     process.exit(1);
//   }
// };

// initializedCheckpointer()

const app = express();

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Apply middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Request logging (development only)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
   
    next();
  });
}

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/email", emailRoutes);
app.use("/api/documents", ingestionRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/agent", agentRoutes);
// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Global Error Handler:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Start server
const PORT = process.env.PORT || 5000;
 app.listen(PORT, () => {
 // console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('📧 Email queue service is active');
});


module.exports = app;
