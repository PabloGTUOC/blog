import { Schema, model, models, type ObjectId } from 'mongoose';

export interface PostDoc {
  _id: string;
  title: string;
  content: string;
  gallery?: ObjectId;
}

const PostSchema = new Schema<PostDoc>(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    gallery: { type: Schema.Types.ObjectId, ref: 'Gallery' },
  },
  { timestamps: true }
);

export default models.Post || model<PostDoc>('Post', PostSchema);
