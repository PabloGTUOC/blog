import { Schema, model, models } from 'mongoose';

const GallerySchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, trim: true, unique: true },
    images: { type: [String], default: [] },
    passwordHash: { type: String },
    tags: [{ type: Schema.Types.ObjectId, ref: 'Tag', default: [] }],
    eventMonth: { type: Number, min: 1, max: 12 },
    eventYear: { type: Number, min: 1900, max: 3000 },
  },
  { timestamps: true }
);

GallerySchema.index({ eventYear: 1, eventMonth: 1 });
GallerySchema.index({ slug: 1 }, { unique: true });

export default models.Gallery || model('Gallery', GallerySchema);
