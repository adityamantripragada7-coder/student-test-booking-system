# 🎓 Student Test Booking System

A full-stack, responsive, production-ready Student Test Booking System built with React, TypeScript, Vite, Tailwind CSS, Express, and MongoDB Atlas. Prepared for high-performance serverless deployment on Vercel.

---

## 🚀 Features

### 🛡️ Admin Portal
* **Live MongoDB Dashboard Statistics**: Real-time aggregate counts for Total Students, Test Slots, Active Bookings, and Published Results.
* **Student Management**: Full CRUD operations for student records. Unique, immutable Student IDs, searching, pagination, and cascade cleanup of bookings/results upon deletion.
* **Test Slot Management**: Create, edit, and delete examination sessions. Input validation for past dates, positive capacities, available seat calculations, and automatic `Full` status marking.
* **Booking Management**: View all active and historical student reservations. Filter by test date and booking status, search by student name/ID, and cancel bookings with automatic seat release.
* **Results Management**: Upload, edit, and publish assessment marks, letter grades, and Pass/Fail statuses with strict validation.
* **System Settings**: View live Express API health metrics, database connection status, and Vercel environment parameters.

### 🎓 Student Portal
* **Personalized Student Dashboard**: Welcome banner, student ID display, current active booking card, upcoming test information, and latest published grade.
* **Interactive Slot Booking**: Browse available test sessions with real-time seat availability. One-click booking with strict enforcement of **1 active booking per student**.
* **Results Portal**: Isolated access to personal grade history and latest test score.
* **Student Profile**: View profile details and authentication architecture notes.

### 🔐 Security & Database Architecture
* **MongoDB Atlas Integration**: Mongoose schemas with indexed unique constraints, serverless connection caching, and atomic `$inc` seat booking operations to prevent over-booking.
* **Role-Based JWT Authentication**: Secure admin password hashing via `bcryptjs`, token-based authorization middleware, and controlled one-time admin setup secret.
* **Student ID Login**: Streamlined login using assigned Student IDs (with architecture structured for institutional SSO or OTP extension).

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 18, TypeScript, Vite |
| **Styling & UI** | Tailwind CSS v3, Lucide React Icons |
| **Backend Runtime** | Node.js, Express.js |
| **Database** | MongoDB Atlas, Mongoose ODM |
| **Authentication** | JSON Web Tokens (JWT), bcryptjs |
| **Deployment** | Vercel (Frontend & Vercel Serverless Functions) |

---

## 📁 Project Structure

```text
├── api/
│   └── index.ts               # Vercel Serverless Function entry point
├── public/
│   └── favicon.svg            # Favicon asset
├── server/
│   ├── app.ts                 # Central Express application config & middleware
│   ├── db.ts                  # Cached MongoDB Atlas connection handler
│   ├── middleware/
│   │   └── auth.ts            # JWT verification & role authorization
│   ├── models/
│   │   ├── Admin.ts           # Admin schema & bcrypt password model
│   │   ├── Booking.ts         # Booking schema with unique partial index
│   │   ├── Result.ts          # Student test results schema
│   │   ├── Student.ts         # Student model with immutable studentId
│   │   └── TestSlot.ts        # Test slot capacity & availability schema
│   ├── routes/
│   │   ├── adminRoutes.ts     # Admin stats API
│   │   ├── authRoutes.ts      # Authentication & admin setup APIs
│   │   ├── bookingRoutes.ts   # Concurrency-safe booking APIs
│   │   ├── resultRoutes.ts    # Student results APIs
│   │   ├── slotRoutes.ts       # Test slot CRUD APIs
│   │   └── studentRoutes.ts   # Student CRUD APIs
│   ├── scripts/
│   │   ├── test-app-logic.ts  # Synthetic business logic verification script
│   │   └── test-db.ts         # Database connectivity test script
│   └── server.ts              # Local standalone Node development server
├── src/
│   ├── api/
│   │   └── client.ts          # Centralized API fetch client
│   ├── components/
│   │   ├── Badge.tsx          # Status tags
│   │   ├── ConfirmDialog.tsx  # Confirmation dialog modal
│   │   ├── EmptyState.tsx     # Zero-data display
│   │   ├── Modal.tsx          # Accessible dialog component
│   │   ├── Navbar.tsx         # Header navigation bar
│   │   ├── Pagination.tsx     # Table pagination controls
│   │   ├── Sidebar.tsx        # Responsive navigation sidebar
│   │   └── Skeleton.tsx       # Loading skeleton placeholders
│   ├── context/
│   │   └── AuthContext.tsx    # React authentication context
│   ├── pages/
│   │   ├── admin/             # Admin portal pages
│   │   ├── student/           # Student portal pages
│   │   └── Login.tsx          # Dual-tab login page
│   ├── types/
│   │   └── index.ts           # TypeScript interfaces
│   ├── App.tsx                # Main router & protected layout
│   ├── index.css              # Design system stylesheet
│   └── main.tsx               # React entry point
├── .env.example               # Template environment variables
├── .gitignore                 # Git ignore rules
├── index.html                 # HTML entry point
├── package.json               # Dependencies & npm scripts
├── postcss.config.js          # PostCSS config
├── tailwind.config.js         # Tailwind theme config
├── tsconfig.json              # TypeScript compiler config
├── vercel.json                # Single-project Vercel deployment setup
└── vite.config.ts             # Vite bundler configuration
```

---

## ⚡ Prerequisites

* **Node.js**: v18.0.0 or higher installed
* **NPM**: v9.0.0 or higher installed
* **MongoDB Atlas Account**: Free tier cluster created on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
* **Vercel & GitHub Accounts**: For automated cloud deployment

---

## 🔑 Environment Variables

Create a `.env` file in the root directory for local development based on `.env.example`:

```ini
# Server Port
PORT=5000
NODE_ENV=development

# MongoDB Atlas Connection URI
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/test_booking?retryWrites=true&w=majority

# JWT Token Secret Key (Use a strong random 32+ character string in production)
JWT_SECRET=your-random-jwt-secret-key-32-characters-min

# One-Time Admin Setup Secret Key
ADMIN_SETUP_SECRET=your-admin-setup-secret-key

# Frontend CORS Origin
FRONTEND_URL=http://localhost:5173

# Frontend VITE API URL (Leave blank for single Vercel project deployment)
VITE_API_URL=
```

> ⚠️ **Important Security Note**: Never commit `.env` files to git. `.env` is listed in `.gitignore`.

---

## 💻 Local Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone <your-repository-url>
   cd "Test Booking"
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure MongoDB Atlas Connection**:
   - Log into MongoDB Atlas and create a Database Cluster.
   - Go to **Network Access** and add your IP address (or `0.0.0.0/0` for cloud deployment).
   - Go to **Database Access** and create a Database User with read/write permissions.
   - Obtain your Connection String and paste it into `.env` under `MONGODB_URI`.

4. **Verify MongoDB Connection**:
   ```bash
   npm run test:db
   ```

5. **Start Local Development Server**:
   ```bash
   npm run dev
   ```
   * Frontend available at: `http://localhost:5173`
   * Backend API running at: `http://localhost:5000/api`

6. **Initial Administrator Setup**:
   - Open `http://localhost:5173/login` in your browser.
   - Click the **Admin Login** tab.
   - Click **Setup Admin Account**.
   - Enter your full name, desired admin username, password, and the `ADMIN_SETUP_SECRET` value from your `.env` file.
   - Once submitted, your administrator account is created and logged in!

---

## 🧪 Testing & Verification

Run the TypeScript build and code check:
```bash
npm run build
```

Run database logic verification:
```bash
npx tsx server/scripts/test-app-logic.ts
```

---

## ☁️ Deploying to Vercel (Step-by-Step Guide)

### Option A: Single Vercel Project (Recommended)

1. **Initialize Git Repository & Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Complete Student Test Booking System"
   git branch -M main
   git remote add origin https://github.com/<your-username>/student-test-booking.git
   git push -u origin main
   ```

2. **Import Repository into Vercel**:
   - Log in to your [Vercel Dashboard](https://vercel.com).
   - Click **Add New** &rarr; **Project**.
   - Import your GitHub repository `student-test-booking`.

3. **Configure Vercel Environment Variables**:
   In the Vercel project configuration page under **Environment Variables**, add:
   * `MONGODB_URI` = `mongodb+srv://<username>:<password>@cluster.mongodb.net/test_booking`
   * `JWT_SECRET` = `[Your strong random 32+ character secret]`
   * `ADMIN_SETUP_SECRET` = `[Your admin setup key]`
   * `NODE_ENV` = `production`

4. **Deploy**:
   - Click **Deploy**.
   - Vercel automatically builds the Vite frontend and deploys the Express serverless function in `/api/index.ts`.
   - Your live website URL will be generated (e.g. `https://student-test-booking.vercel.app`).

5. **Perform First-Time Production Admin Setup**:
   - Open your live Vercel URL.
   - Switch to **Admin Login** &rarr; **Setup Admin Account**.
   - Fill in your admin details and the `ADMIN_SETUP_SECRET` set in your Vercel Environment Variables.

---

## 🔒 Security Architecture & Limitations

* **Student ID Login**: Student authentication uses assigned Student IDs for frictionless test booking. Because Student ID login does not require a password by default, it is documented for initial institutional setups. The backend is structured to seamlessly integrate OTP, password, or OAuth authentication.
* **Serverless Connection Management**: Database connections reuse cached Mongoose connection instances to prevent connection leaks during serverless cold starts.
* **Concurrency Handling**: Seat bookings utilize atomic Mongoose queries (`$inc` with conditional capacity filtering) to prevent over-booking even under concurrent traffic spikes.

---

## 📄 License

This project is licensed under the MIT License.
