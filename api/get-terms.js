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
  jobUUID: String,
  clientName: String,
  termsText: String,
  createdAt: { type: Date, default: Date.now },
});

const Signature =
  mongoose.models.Signature || mongoose.model("Signature", SignatureSchema);

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await connectDB();

    const { jobUUID } = req.query;

    if (!jobUUID) {
      return res.status(400).json({ error: "Missing jobUUID" });
    }

    // Get the latest terms for this job
    const record = await Signature.findOne({ jobUUID })
      .sort({ createdAt: -1 })
      .lean();

    if (!record) {
      return res.status(404).json({ error: "No terms found" });
    }

    return res.status(200).json({
      jobUUID: record.jobUUID,
      clientName: record.clientName || null,
      termsText: record.termsText,
      createdAt: record.createdAt,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}
