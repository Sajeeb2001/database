import mongoose from "mongoose";

/**
 * ✅ REQUIRED FOR VERCEL BODY PARSING
 */
export const config = {
  api: {
    bodyParser: true,
  },
};

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

// MongoDB connection (cached for serverless)
async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGODB_URI);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

// Schema (same collection)
const SignatureSchema = new mongoose.Schema({
  linkKey: String,
  jobUUID: String,
  clientUUID: String,
  clientName: String,
  termsText: String,
  docId: String,
  type: String,
  signatureStatus: String,
  clicked: Number,
  createdAt: { type: Date, default: Date.now },
  signedAt: Date
});

const Signature =
  mongoose.models.Signature ||
  mongoose.model("Signature", SignatureSchema);

export default async function handler(req, res) {

  /**
   * ✅ CORS HEADERS
   */
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await connectDB();

    const { linkKey } = req.body;

    if (!linkKey) {
      return res.status(400).json({ error: "Missing linkKey" });
    }

    const record = await Signature.findOne({ linkKey });

    if (!record) {
      return res.status(404).json({ error: "Invalid linkKey" });
    }

    // Update signature status
    record.signatureStatus = "done";
    record.signedAt = new Date();
    await record.save();
    return res.status(200).json({
      success: true,
      message: "Signature marked as done",
      signedAt: record.signedAt
    });
  } catch (err) {
    console.error("SERVER ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
