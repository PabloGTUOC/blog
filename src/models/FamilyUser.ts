import { Schema, model, models } from 'mongoose';

export interface FamilyUserDoc {
  _id: string;
  email: string;
  name?: string;
  status: 'pending' | 'approved' | 'blocked';
}

const FamilyUserSchema = new Schema<FamilyUserDoc>(
  {
    email: { type: String, required: true, unique: true },
    name: { type: String },
    status: {
      type: String,
      enum: ['pending', 'approved', 'blocked'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

export default models.FamilyUser || model<FamilyUserDoc>('FamilyUser', FamilyUserSchema);
