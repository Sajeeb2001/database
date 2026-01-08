import mongoose from "mongoose";

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

// Schema (same collection: signatures)
const SignatureSchema = new mongoose.Schema({
  linkKey: String,
  type: String, // "terms" | "doc"
  jobUUID: String,
  clientUUID: String,
  clientName: String,
  termsText: String,
  docId: String,
  signatureStatus: String, // "pending" | "signed"
  createdAt: { type: Date, default: Date.now },
});

const Signature =
  mongoose.models.Signature || mongoose.model("Signature", SignatureSchema);

export default async function handler(req, res) {

  /* ✅ CORS */
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await connectDB();

    /* ✅ FIX: USE WHATWG URL API (NO url.parse) */
    const url = new URL(req.url, `http://${req.headers.host}`);
    const k = url.searchParams.get("k");

    if (!k) {
      return res.status(400).json({ error: "Missing link key" });
    }

    const record = await Signature.findOne({ linkKey: k }).lean();

    if (!record) {
      return res.status(404).json({ error: "Invalid or expired link" });
    }

    return res.status(200).json({
      linkKey: record.linkKey,
      type: record.type,
      jobUUID: record.jobUUID,
      clientUUID: record.clientUUID,
      clientName: record.clientName || null,
      termsText: record.termsText || null,
      docId: record.docId || null,
      signatureStatus: record.signatureStatus,
      createdAt: record.createdAt,
    });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
