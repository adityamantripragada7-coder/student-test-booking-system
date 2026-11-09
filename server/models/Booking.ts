import { Schema, model, Document, Types } from 'mongoose';

export interface IBooking extends Document {
  student: Types.ObjectId;
  slot: Types.ObjectId;
  syllabus: string;
  status: 'active' | 'cancelled' | 'completed';
  bookedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    slot: {
      type: Schema.Types.ObjectId,
      ref: 'TestSlot',
      required: true,
      index: true,
    },
    syllabus: {
      type: String,
      required: true,
      trim: true,
      default: 'General Syllabus',
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'completed'],
      default: 'active',
      index: true,
    },
    bookedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Enforce rule: A student can only have ONE active booking at a time
BookingSchema.index(
  { student: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } }
);

// Rapid filtering index
BookingSchema.index({ slot: 1, status: 1 });
BookingSchema.index({ createdAt: -1 });

export const Booking = model<IBooking>('Booking', BookingSchema);
