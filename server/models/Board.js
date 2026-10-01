import mongoose from "mongoose";

const boardSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, default: "Untitled board" },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    canvasJSON: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Board", boardSchema);