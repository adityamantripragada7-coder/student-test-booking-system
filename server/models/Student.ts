import { Schema, model, Document } from 'mongoose';

export interface IStudent extends Document {
  studentId: string;
  name: string;
  phone?: string;
  registrationDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema = new Schema<IStudent>(
  {
    studentId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      immutable: true, // Prevents studentId modification after creation
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    registrationDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound text/sorting indexes
StudentSchema.index({ createdAt: -1 });

export const Student = model<IStudent>('Student', StudentSchema);
