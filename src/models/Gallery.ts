import { Schema, model, models } from 'mongoose';

const GallerySchema = new Schema(
  {
    name: { type: String, required: true },
    images: { type: [String], default: [] },
    passwordHash: { type: String },
  },
  { timestamps: true }
);

export default models.Gallery || model('Gallery', GallerySchema);
