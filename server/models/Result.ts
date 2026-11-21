import { Schema, model, Document, Types } from 'mongoose';

export type GradeType = 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'Retest';
export const VALID_GRADES: GradeType[] = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'Retest'];

export interface IResult extends Document {
  student: Types.ObjectId;
  studentId?: string;
  studentName?: string;
  studentPhone?: string;
  booking?: Types.ObjectId;
  slot?: Types.ObjectId;
  slotTitle?: string;
  slotDate?: string;
  slotTime?: string;
  syllabus?: string;
  testName: string;
  memoryGrade: GradeType;
  mistakesGrade: GradeType;
  grade?: GradeType; // For backward compatibility
  marksObtained?: number | null;
  maxMarks?: number | null;
  status: string;
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
      index: true,
    },
    studentId: {
      type: String,
      trim: true,
      index: true,
    },
    studentName: {
      type: String,
      trim: true,
      index: true,
    },
    studentPhone: {
      type: String,
      trim: true,
    },
    booking: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
    },
    slot: {
      type: Schema.Types.ObjectId,
      ref: 'TestSlot',
      index: true,
    },
    slotTitle: {
      type: String,
      trim: true,
    },
    slotDate: {
      type: String,
      trim: true,
    },
    slotTime: {
      type: String,
      trim: true,
    },
    syllabus: {
      type: String,
      trim: true,
    },
    testName: {
      type: String,
      required: true,
      trim: true,
      index: true,
      default: 'Assessment Session',
    },
    memoryGrade: {
      type: String,
      required: true,
      trim: true,
      enum: VALID_GRADES,
      index: true,
    },
    mistakesGrade: {
      type: String,
      required: true,
      trim: true,
      enum: VALID_GRADES,
      index: true,
    },
    // Optional legacy grade field populated with memoryGrade for backwards compatibility
    grade: {
      type: String,
      enum: VALID_GRADES,
    },
    marksObtained: {
      type: Number,
      default: null,
    },
    maxMarks: {
      type: Number,
      default: null,
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

// Prevent duplicate result records for the same booking
ResultSchema.index({ booking: 1 }, { unique: true, sparse: true });
ResultSchema.index({ student: 1, dateUploaded: -1 });

export const Result = model<IResult>('Result', ResultSchema);
