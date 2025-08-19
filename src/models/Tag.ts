import { Schema, model, models } from "mongoose";

const TagSchema = new Schema(
    {
        name: { type: String, required: true, trim: true, unique: true },
        color: { type: String, default: "#111111" }, // optional cosmetic
    },
    { timestamps: true }
);

export default models.Tag || model("Tag", TagSchema);
