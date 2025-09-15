import { Schema, model, models, type Types } from 'mongoose';

export interface EntryDoc {
  title: string;
  caption: string;
  imageUrl: string;
  publishedAt: Date;
  tags: Types.ObjectId[];
}

const EntrySchema = new Schema<EntryDoc>(
  {
    title: { type: String, required: true },
    caption: { type: String, required: true },
    imageUrl: { type: String, required: true },
    publishedAt: { type: Date, required: true, default: Date.now },
    tags: [{ type: Schema.Types.ObjectId, ref: 'Tag', default: [] }],
  },
  { timestamps: true }
);

export default models.Entry || model<EntryDoc>('Entry', EntrySchema);
