import { Schema, model, Document, Types } from 'mongoose';

export interface IResult extends Document {
  student: Types.ObjectId;
  testName: string;
  marksObtained?: number | null;
  maxMarks?: number | null;
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'Retest';
  status?: string;
  dateUploaded: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ResultSchema = new Schema<IResult>(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    testName: {
      type: String,
      required: true,
      trim: true,
    },
    marksObtained: {
      type: Number,
      default: null,
      min: 0,
    },
    maxMarks: {
      type: Number,
      default: null,
      min: 1,
    },
    grade: {
      type: String,
      required: true,
      trim: true,
      enum: ['A+', 'A', 'B+', 'B', 'C+', 'C', 'Retest'],
    },
    status: {
      type: String,
      default: 'Published',
    },
    dateUploaded: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const Result = model<IResult>('Result', ResultSchema);
