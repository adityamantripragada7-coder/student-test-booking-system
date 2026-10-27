import { Schema, model, Document } from 'mongoose';

export interface ITestSlot extends Document {
  testTitle?: string;
  testDate: string; // YYYY-MM-DD format
  startTime: string; // HH:mm format
  endTime?: string;
  capacity: number;
  bookedCount: number;
  status: 'Available' | 'Full' | 'Cancelled';
  location?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TestSlotSchema = new Schema<ITestSlot>(
  {
    testTitle: {
      type: String,
      trim: true,
      default: 'Assessment Slot',
    },
    testDate: {
      type: String,
      required: true,
      trim: true,
    },
    startTime: {
      type: String,
      required: true,
      trim: true,
    },
    endTime: {
      type: String,
      trim: true,
      default: '',
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
    },
    bookedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['Available', 'Full', 'Cancelled'],
      default: 'Available',
    },
    location: {
      type: String,
      trim: true,
      default: 'Main Examination Hall',
    },
  },
  {
    timestamps: true,
  }
);

export const TestSlot = model<ITestSlot>('TestSlot', TestSlotSchema);
