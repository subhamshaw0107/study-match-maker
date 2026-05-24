# Study Group Matcher for JIS 🎓🤝

A modern, responsive full-stack collegiate web platform built for students at **JIS University / JIS Group of Institutions**. The application matches classmates into highly compatible study groups based on departments, semesters, focused subjects, learning styles, and schedule availability.

## 🚀 Key Features Built-in

1. **Intelligent Companion Matching**: Automatically computes Compatibility % metrics based on department tracks, semester courses, overlapping subjects, and active study days.
2. **Glassmorphism Aesthetic UI**: Gorgeous blue & white responsive interfaces featuring dark/light mode switches.
3. **Collegiate Group Hubs**: Student-managed study workspaces equipped with live discussion board streams, calendar trackers, and shared files repository.
4. **Interactive Focus Pomodoro**: circular focus timers utilizing arpeggiated browser Web Audio API alarms that increment consecutive daily study streaks.
5. **Study Streak Mechanics**: Fire-flame widgets to cultivate consistent academic habits and check-in accountability.
6. **Platform Administration Console**: Dedicated Professor/Admin controls to audit members, ban inappropriate materials, check department statistics, and oversee match rates.

---

## 💻 Tech Stack & Architecture

- **Frontend**: React 19 + Tailwind CSS + Lucide Icons + Motion Layout Framer
- **Backend**: Node.js v18+ + Express.js API routers + JWT Passporting
- **Database Model**: MongoDB schema architecture, abstraction managed with a persistent, seed-rich JSON Database (`/server/db.ts`) for zero-configuration startup. See below for Atlas migration instructions!
- **Authentication**: JWT Authorization + Cryptographic Password Salts (`bcryptjs`)

---

## 📂 Project Directory Structure

```text
/
├── .env.example              # Environment variables definition documentation
├── db.json                   # Preserved student profiles, conversations & streaks
├── index.html                # Vite HTML primary mount point
├── metadata.json             # AI Studio Applet Configurations
├── package.json              # Npm package dependencies and esbuild routers
├── server.ts                 # Full-stack entry combining Express controllers & API Router
├── tsconfig.json             # Typescript compiler guidelines
├── vite.config.ts            # Vite asset Bundlers & reverse proxies
├── server/
│   ├── db.ts                 # Database models, schemas, and live database state CRUDs
│   └── middleware/
│       └── authMiddleware.ts # JWT authentication guard layer
├── src/
│   ├── App.tsx               # Master React interface rendering landing, matchers and rooms
│   ├── index.css             # Tailwinds setup with Google fonts and Glassmorphic presets
│   ├── main.tsx              # React client bootstrapping
│   ├── types.ts              # Shared typescript interfaces (User, Group, Stats, Messages)
│   └── components/
│       ├── AdminPanel.tsx    # University dashboard analytics & moderation tools
│       ├── CalendarWidget.tsx# Peer scheduling meetups with mock Google Cal sync switches
│       └── PomodoroTimer.tsx # Visual Circle Study Timer with arpeggiated bleeps synthesizer
```

---

## 🛠️ Installation & Setup

Ensure you have **Node.js (v18+)** and **npm** installed on your workstation.

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Application locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) on your local browser to play with the platform!

### 3. Build for Production
```bash
npm run build
```

### 4. Direct Production launch
```bash
npm run start
```

---

## 🔐 Seed Directory Accounts for Testing

Testing is simple! Use the preselected JIS accounts to log in instantly (password: **`student123`**):

1. **CSE Student**: `ananya.sen@jis.edu` *(Has active study groups and a 8-day streak)*
2. **IT Student**: `rohit.das@jis.edu` *(Compatible partner with discrete math doubts)*
3. **Faculty / Staff Admin**: `admin@jis.edu` *(Has complete Access to admin statistics & moderation graphs)*

---

## 🌿 Transitioning to MongoDB Atlas & Live Deployment

The system is fully modular and MVC schema compliant. To swap the local file database with a live Mongo/Mongoose environment:

1. Replace `/server/db.ts` file operations with standard Mongoose connections:
   ```typescript
   import mongoose from 'mongoose';
   mongoose.connect(process.env.MONGODB_URI);
   ```
2. Port our TypeScript interfaces in `/src/types.ts` directly into Mongoose models:
   ```typescript
   const UserSchema = new mongoose.Schema({
     name: String,
     email: { type: String, unique: true },
     passwordHash: String,
     streakDays: { type: Number, default: 1 },
     // ...
   });
   ```
3. Update API endpoints inside `server.ts` to perform async MongoDB commands (`User.find()`, `Group.create()`)!

---

## 🔮 Future Improvement Suggestions

- **Whiteboards Integration**: Integrating collaborative canvas sheets (using socket connections or Fabric.js) inside the Study Workspace.
- **Micro-credential Rewards**: Reward verified digital badges to students matching 15+ consecutive focus timer sessions.
- **Exams Syllabus AI Grounding**: Integrate process.env.GEMINI_API_KEY inside the groups notes area to summarize user-shared pdf notes instantly.
