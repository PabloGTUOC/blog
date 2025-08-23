import { Schema, model, models } from "mongoose";

const AdminUserSchema = new Schema(
    {
        username: { type: String, required: true, unique: true, index: true },
        password: { type: String, required: true },
    },
    { timestamps: true }
);

export default models.AdminUser || model("AdminUser", AdminUserSchema);
