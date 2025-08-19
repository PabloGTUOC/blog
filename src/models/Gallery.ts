import { Schema, model, models } from 'mongoose';

const GallerySchema = new Schema(
  {
    name: { type: String, required: true },
    images: { type: [String], default: [] },
    passwordHash: { type: String },
    tags: [{ type: Schema.Types.ObjectId, ref: 'Tag', default: [] }],
  },
  { timestamps: true }
);

export default models.Gallery || model('Gallery', GallerySchema);
