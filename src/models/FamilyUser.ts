import { Schema, model, models } from "mongoose";

const FamilyUserSchema = new Schema(
    {
        email: { type: String, required: true, unique: true, index: true },
        name: String,
        status: {
            type: String,
            enum: ["pending", "approved", "blocked"],
            default: "pending",
            index: true,
        },
    },
    { timestamps: true }
);

export default models.FamilyUser || model("FamilyUser", FamilyUserSchema);
