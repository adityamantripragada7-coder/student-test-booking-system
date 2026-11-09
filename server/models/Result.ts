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
      index: true,
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
      index: true,
    },
    status: {
      type: String,
      default: 'Published',
      index: true,
    },
    dateUploaded: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

ResultSchema.index({ student: 1, dateUploaded: -1 });

export const Result = model<IResult>('Result', ResultSchema);
