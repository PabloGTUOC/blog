import { Schema, model, models } from 'mongoose';

const PostSchema = new Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    gallery: { type: Schema.Types.ObjectId, ref: 'Gallery' },
  },
  { timestamps: true }
);

export default models.Post || model('Post', PostSchema);
