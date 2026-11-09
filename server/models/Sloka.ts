import { Schema, model, Document, Types } from 'mongoose';

export interface IQuestion {
  _id?: Types.ObjectId;
  questionText: string;
  options: string[];
  correctOptionIndex: number; // 0-based index
  explanation?: string;
  marks: number;
}

export interface ISloka extends Document {
  syllabus: string; // e.g. '1-5', '6-10', 'Monthly test-1'
  chapter: number;
  slokaNumber: number;
  title: string;
  sanskritText: string;
  transliteration?: string;
  englishMeaning: string;
  questions: IQuestion[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>(
  {
    questionText: {
      type: String,
      required: true,
      trim: true,
    },
    options: {
      type: [String],
      required: true,
      validate: [(val: string[]) => val.length >= 2, 'At least 2 options are required'],
    },
    correctOptionIndex: {
      type: Number,
      required: true,
      min: 0,
    },
    explanation: {
      type: String,
      trim: true,
      default: '',
    },
    marks: {
      type: Number,
      default: 10,
      min: 1,
    },
  },
  { _id: true }
);

const SlokaSchema = new Schema<ISloka>(
  {
    syllabus: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    chapter: {
      type: Number,
      required: true,
      min: 1,
    },
    slokaNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    sanskritText: {
      type: String,
      required: true,
      trim: true,
    },
    transliteration: {
      type: String,
      trim: true,
      default: '',
    },
    englishMeaning: {
      type: String,
      required: true,
      trim: true,
    },
    questions: [QuestionSchema],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for syllabus and sloka identification
SlokaSchema.index({ syllabus: 1, chapter: 1, slokaNumber: 1 });

export const Sloka = model<ISloka>('Sloka', SlokaSchema);

