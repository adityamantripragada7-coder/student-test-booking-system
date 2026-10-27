import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');

export interface LocalDataSchema {
  admins: any[];
  students: any[];
  slots: any[];
  bookings: any[];
  results: any[];
}

const getInitialData = (): LocalDataSchema => {
  const salt = bcrypt.genSaltSync(10);
  const adminPasswordHash = bcrypt.hashSync('adminpassword', salt);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 3);
  const nextWeekStr = nextWeek.toISOString().split('T')[0];

  return {
    admins: [
      {
        _id: 'admin_1',
        username: 'admin',
        name: 'System Administrator',
        email: 'admin@institution.edu',
        passwordHash: adminPasswordHash,
        createdAt: new Date().toISOString(),
      },
    ],
    students: [
      {
        _id: 'student_1',
        studentId: 'S001',
        name: 'Alex Mercer',
        phone: '+1 555-0101',
        registrationDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
      {
        _id: 'student_2',
        studentId: 'S002',
        name: 'Sarah Connor',
        phone: '+1 555-0102',
        registrationDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    ],
    slots: [
      {
        _id: 'slot_1',
        testTitle: 'Mathematics Midterm Exam',
        testDate: tomorrowStr,
        startTime: '09:00',
        endTime: '11:00',
        capacity: 15,
        bookedCount: 0,
        status: 'Available',
        location: 'Examination Hall A',
        createdAt: new Date().toISOString(),
      },
      {
        _id: 'slot_2',
        testTitle: 'Physics Lab Practical',
        testDate: nextWeekStr,
        startTime: '14:00',
        endTime: '16:00',
        capacity: 10,
        bookedCount: 0,
        status: 'Available',
        location: 'Physics Building Lab 3',
        createdAt: new Date().toISOString(),
      },
    ],
    bookings: [],
    results: [
      {
        _id: 'result_1',
        student: 'student_1',
        testName: 'General Science Assessment',
        marksObtained: 88,
        maxMarks: 100,
        grade: 'A',
        status: 'Pass',
        dateUploaded: new Date().toISOString(),
      },
    ],
  };
};

export class LocalStore {
  private static ensureFile() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      const initial = getInitialData();
      fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    }
  }

  public static read(): LocalDataSchema {
    this.ensureFile();
    try {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    } catch (e) {
      const initial = getInitialData();
      fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
  }

  public static write(data: LocalDataSchema): void {
    this.ensureFile();
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  }

  public static generateId(): string {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}
