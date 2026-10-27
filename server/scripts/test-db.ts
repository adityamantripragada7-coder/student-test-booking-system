import dotenv from 'dotenv';
import { connectDB } from '../db.js';
import { Admin } from '../models/Admin.js';
import { Student } from '../models/Student.js';
import { TestSlot } from '../models/TestSlot.js';
import bcrypt from 'bcryptjs';

dotenv.config();

async function testDatabase() {
  console.log('🔍 Testing MongoDB Atlas Connection...');
  try {
    await connectDB();
    console.log('✅ Connection successful!');

    const adminCount = await Admin.countDocuments();
    console.log(`📊 Admin Users in DB: ${adminCount}`);

    const studentCount = await Student.countDocuments();
    console.log(`📊 Student Records in DB: ${studentCount}`);

    const slotCount = await TestSlot.countDocuments();
    console.log(`📊 Test Slots in DB: ${slotCount}`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Connection or DB Test Failed:', err);
    process.exit(1);
  }
}

testDatabase();
