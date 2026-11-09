import { Schema, model, Document, Types } from 'mongoose';

export interface ISubmittedAnswerItem {
  slokaId: Types.ObjectId;
  questionId: string;
  questionText: string;
  selectedOptionIndex: number;
  selectedOptionText: string;
  correctOptionIndex: number;
  isCorrect: boolean;
  marksAwarded: number;
  maxMarks: number;
}

export interface IStudentAnswer extends Document {
  student: Types.ObjectId;
  booking?: Types.ObjectId;
  syllabus: string;
  testName: string;
  answers: ISubmittedAnswerItem[];
  totalScore: number;
  maxScore: number;
  percentage: number;
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'Retest';
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SubmittedAnswerItemSchema = new Schema<ISubmittedAnswerItem>(
  {
    slokaId: {
      type: Schema.Types.ObjectId,
      ref: 'Sloka',
      required: true,
    },
    questionId: {
      type: String,
      required: true,
    },
    questionText: {
      type: String,
      required: true,
    },
    selectedOptionIndex: {
      type: Number,
      required: true,
    },
    selectedOptionText: {
      type: String,
      required: true,
    },
    correctOptionIndex: {
      type: Number,
      required: true,
    },
    isCorrect: {
      type: Boolean,
      required: true,
    },
    marksAwarded: {
      type: Number,
      required: true,
      min: 0,
    },
    maxMarks: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { _id: false }
);

const StudentAnswerSchema = new Schema<IStudentAnswer>(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    booking: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      index: true,
    },
    syllabus: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    testName: {
      type: String,
      required: true,
      trim: true,
    },
    answers: [SubmittedAnswerItemSchema],
    totalScore: {
      type: Number,
      required: true,
      min: 0,
    },
    maxScore: {
      type: Number,
      required: true,
      min: 1,
    },
    percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    grade: {
      type: String,
      required: true,
      enum: ['A+', 'A', 'B+', 'B', 'C+', 'C', 'Retest'],
      index: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for rapid lookups and student history
StudentAnswerSchema.index({ student: 1, submittedAt: -1 });
StudentAnswerSchema.index({ syllabus: 1, submittedAt: -1 });

export const StudentAnswer = model<IStudentAnswer>('StudentAnswer', StudentAnswerSchema);

