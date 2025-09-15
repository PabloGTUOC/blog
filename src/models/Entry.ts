import { Schema, model, models } from 'mongoose';

export interface EntryDoc {
  title: string;
  caption: string;
  imageUrl: string;
  publishedAt: Date;
}

const EntrySchema = new Schema<EntryDoc>(
  {
    title: { type: String, required: true },
    caption: { type: String, required: true },
    imageUrl: { type: String, required: true },
    publishedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

export default models.Entry || model<EntryDoc>('Entry', EntrySchema);
