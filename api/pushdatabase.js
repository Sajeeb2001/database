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

// Schema
const SignatureSchema = new mongoose.Schema({
  jobUUID: String,
  clientName: String,
  termsText: String,
  createdAt: { type: Date, default: Date.now }
});

const Signature =
  mongoose.models.Signature || mongoose.model("Signature", SignatureSchema);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await connectDB();

    const { jobUUID, clientName, termsText } = req.body;

    if (!jobUUID || !termsText) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const record = await Signature.create({
      jobUUID,
      clientName,
      termsText
    });

    return res.status(200).json({
      success: true,
      id: record._id
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}
