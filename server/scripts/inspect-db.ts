import dotenv from 'dotenv';
import { connectDB } from '../db.js';
import { Student } from '../models/Student.js';
import { Result } from '../models/Result.js';
import { Admin } from '../models/Admin.js';
import { Booking } from '../models/Booking.js';
import { TestSlot } from '../models/TestSlot.js';

dotenv.config();

async function inspect() {
  await connectDB();
  const students = await Student.find({}).lean();
  const results = await Result.find({}).lean();
  const admins = await Admin.find({}).lean();
  const bookings = await Booking.find({}).lean();
  const slots = await TestSlot.find({}).lean();

  console.log('--- DB INSPECTION START ---');
  console.log('STUDENTS (' + students.length + '):', JSON.stringify(students, null, 2));
  console.log('RESULTS (' + results.length + '):', JSON.stringify(results, null, 2));
  console.log('ADMINS (' + admins.length + '):', admins.map(a => ({ _id: a._id, username: a.username, name: a.name })));
  console.log('BOOKINGS (' + bookings.length + '):', JSON.stringify(bookings, null, 2));
  console.log('SLOTS (' + slots.length + '):', JSON.stringify(slots, null, 2));
  console.log('--- DB INSPECTION END ---');
  process.exit(0);
}

inspect().catch(err => {
  console.error(err);
  process.exit(1);
});

