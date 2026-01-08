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

/**
 * ✅ UPDATED SCHEMA
 */
const SignatureSchema = new mongoose.Schema({
  linkKey: { type: String, required: true, unique: true },

  type: { type: String, enum: ["terms", "doc"], required: true },

  jobUUID: { type: String, required: true },
  clientUUID: { type: String },
  clientName: { type: String },

  termsText: { type: String },
  docId: { type: String },

  signatureStatus: {
    type: String,
    enum: ["pending", "signed"],
    default: "pending"
  },

  signedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

/**
 * ✅ INDEXES (IMPORTANT)
 */
SignatureSchema.index({ jobUUID: 1 });
SignatureSchema.index({ linkKey: 1 });

const Signature =
  mongoose.models.Signature ||
  mongoose.model("Signature", SignatureSchema);

export default async function handler(req, res) {

  /**
   * ✅ CORS HEADERS (REQUIRED FOR SERVICEM8)
   */
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  /**
   * ✅ HANDLE PREFLIGHT REQUEST
   */
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  /**
   * ✅ ALLOW ONLY POST
   */
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await connectDB();

    /**
     * ✅ EXTRACT ALL EXPECTED FIELDS
     */
    const {
      linkKey,
      type,
      jobUUID,
      clientUUID,
      clientName,
      termsText,
      docId,
      signatureStatus
    } = req.body;

    /**
     * ✅ VALIDATION
     */
    if (!linkKey || !type || !jobUUID) {
      return res.status(400).json({
        error: "Missing required fields (linkKey, type, jobUUID)"
      });
    }

    if (type === "terms" && !termsText) {
      return res.status(400).json({
        error: "termsText is required for terms link"
      });
    }

    if (type === "doc" && !docId) {
      return res.status(400).json({
        error: "docId is required for doc link"
      });
    }

    /**
     * ✅ CREATE RECORD
     */
    const record = await Signature.create({
      linkKey,
      type,
      jobUUID,
      clientUUID,
      clientName,
      termsText,
      docId,
      signatureStatus: signatureStatus || "pending"
    });

    return res.status(200).json({
      success: true,
      id: record._id
    });

  } catch (err) {

    /**
     * ✅ HANDLE DUPLICATE linkKey
     */
    if (err.code === 11000) {
      return res.status(409).json({
        error: "Link already exists"
      });
    }

    console.error("SERVER ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
