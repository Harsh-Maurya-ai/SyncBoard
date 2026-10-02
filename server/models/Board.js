import mongoose from "mongoose";

// People (other than the owner) who were given access through a share link
const memberSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["viewer", "editor"], default: "viewer" },
  },
  { _id: false }
);

const boardSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, default: "Untitled board" },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    canvasJSON: { type: mongoose.Schema.Types.Mixed, default: null },
    members: { type: [memberSchema], default: [] },
    // Invite link: anyone signed in who opens it gets `shareRole` on this board
    shareToken: { type: String, index: true },
    shareRole: { type: String, enum: ["viewer", "editor"], default: "viewer" },
  },
  { timestamps: true, minimize: false }
);

export default mongoose.model("Board", boardSchema);