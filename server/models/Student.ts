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
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    registrationDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const Student = model<IStudent>('Student', StudentSchema);
