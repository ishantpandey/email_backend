const mongoose = require("mongoose");

let ragDBConnection = null;

/**
 * Connect to RAG MongoDB.
 */
const connectRagDB = async () => {
    try {
        ragDBConnection = await mongoose.createConnection(process.env.MONGO_RAG_URI).asPromise();
        
        console.log("✅ RAG MongoDB Connected");
       
        ragDBConnection.on('error', (err) => {
            console.error("RAG MongoDB Error:", err.message);
        });

        ragDBConnection.on('disconnected', () => {
            console.warn("⚠️ RAG MongoDB Disconnected");
        });
        
        return ragDBConnection;
    } catch (error) {
        console.error("❌ RAG MongoDB Connection Error:", error.message);
        throw error;
    }
};

const getRagDBConnection = () => ragDBConnection;

module.exports = { connectRagDB, getRagDBConnection };