import fs from 'fs';
import path from 'path';

// Types representing our MongoDB-style schemas
export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  department: string;
  semester: string;
  subjects: string[];
  goals: string;
  learningStyle: 'Visual' | 'Auditory' | 'Reading/Writing' | 'Kinesthetic';
  availability: {
    days: string[]; // e.g., ["Monday", "Wednesday", "Friday"]
    times: string[]; // e.g., ["Morning", "Afternoon", "Evening"]
  };
  avatarUrl: string; // Avatar seed index or CSS theme
  streakDays: number;
  lastActiveDate: string; // ISO date string
  isAdmin: boolean;
  createdAt: string;
}

export interface ResourceLink {
  id: string;
  title: string;
  url: string;
  sharedBy: string; // Name of sender
  sharedByUserId: string;
  timestamp: string;
}

export interface Group {
  id: string;
  name: string;
  subject: string;
  department: string;
  semester: string;
  learningStyle: string;
  description: string;
  rules: string;
  creatorId: string;
  members: string[]; // List of user IDs
  resources: ResourceLink[];
  isOnline: boolean;
  createdAt: string;
}

export interface Message {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  userId: string;
  text: string;
  type: 'request' | 'accept' | 'reject' | 'invite' | 'system';
  relativeId?: string; // e.g., group or user id
  read: boolean;
  timestamp: string;
}

export interface SearchFilter {
  subject?: string;
  semester?: string;
  department?: string;
  learningStyle?: string;
  isOnline?: boolean;
}

export interface Request {
  id: string;
  groupId: string;
  groupName: string;
  requesterId: string;
  requesterName: string;
  type: 'join' | 'invite';
  status: 'pending' | 'accepted' | 'rejected';
  timestamp: string;
}

interface DatabaseSchema {
  users: User[];
  groups: Group[];
  messages: Message[];
  notifications: Notification[];
  requests: Request[];
}

const DB_FILE_PATH = path.join(process.cwd(), 'db.json');

// High-quality Seed Data for students of JIS College / JIS University
const initialData: DatabaseSchema = {
  users: [
    {
      id: "u1",
      name: "Ananya Sen",
      email: "ananya.sen@jis.edu",
      // hashed for 'student123'
      passwordHash: "$2a$10$W65R8KxKzscS9Ea0T9XU9OF2fRscgC7X8aMHeZ.1xM.sZ8H8XmUo2",
      department: "CSE",
      semester: "6th",
      subjects: ["Data Structures", "Web Development", "Operating Systems"],
      goals: "Prepare for JIS campus hackathon and upcoming semester exams.",
      learningStyle: "Visual",
      availability: {
        days: ["Monday", "Wednesday", "Friday", "Saturday"],
        times: ["Afternoon", "Evening"]
      },
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ananya",
      streakDays: 8,
      lastActiveDate: new Date().toISOString(),
      isAdmin: false,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "u2",
      name: "Rohit Das",
      email: "rohit.das@jis.edu",
      passwordHash: "$2a$10$W65R8KxKzscS9Ea0T9XU9OF2fRscgC7X8aMHeZ.1xM.sZ8H8XmUo2",
      department: "IT",
      semester: "4th",
      subjects: ["Database Systems", "Core Java", "Discrete Mathematics"],
      goals: "Looking to clear doubts in SQL normalizations and join a steady group.",
      learningStyle: "Kinesthetic",
      availability: {
        days: ["Tuesday", "Thursday", "Saturday", "Sunday"],
        times: ["Morning", "Evening"]
      },
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rohit",
      streakDays: 5,
      lastActiveDate: new Date().toISOString(),
      isAdmin: false,
      createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "u3",
      name: "Priyanka Roy",
      email: "priyanka.roy@jis.edu",
      passwordHash: "$2a$10$W65R8KxKzscS9Ea0T9XU9OF2fRscgC7X8aMHeZ.1xM.sZ8H8XmUo2",
      department: "ECE",
      semester: "6th",
      subjects: ["Microprocessors", "Web Development", "Digital Communication"],
      goals: "Acing the labs and collaborative project development.",
      learningStyle: "Auditory",
      availability: {
        days: ["Monday", "Tuesday", "Thursday"],
        times: ["Evening"]
      },
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priyanka",
      streakDays: 12,
      lastActiveDate: new Date().toISOString(),
      isAdmin: false,
      createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "u_admin",
      name: "Prof. S. Ghosal (JIS Admin)",
      email: "admin@jis.edu",
      passwordHash: "$2a$10$W65R8KxKzscS9Ea0T9XU9OF2fRscgC7X8aMHeZ.1xM.sZ8H8XmUo2", // student123
      department: "CSE",
      semester: "Faculty",
      subjects: ["All Subjects"],
      goals: "Oversee university-wide study collaboration dashboard.",
      learningStyle: "Reading/Writing",
      availability: {
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        times: ["Morning", "Afternoon"]
      },
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Admin",
      streakDays: 45,
      lastActiveDate: new Date().toISOString(),
      isAdmin: true,
      createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString()
    }
  ],
  groups: [
    {
      id: "g1",
      name: "JIS Web Dev Titans",
      subject: "Web Development",
      department: "CSE",
      semester: "6th",
      learningStyle: "Visual",
      description: "A target-driven study group looking to master React + Tailwind for the upcoming JIS TechFest hackathon. We focus on building real-world projects and solving challenges.",
      rules: "No spamming and join the group calls regularly. Shared learning resources must be relevant to the syllabus.",
      creatorId: "u1",
      members: ["u1", "u3", "u2"],
      resources: [
        {
          id: "r1",
          title: "Vite + React Quickstart Guide for JIS TechFest",
          url: "https://react.dev",
          sharedBy: "Ananya Sen",
          sharedByUserId: "u1",
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "r2",
          title: "Tailwind CSS Layout Cheat Sheet",
          url: "https://tailwindcss.com",
          sharedBy: "Priyanka Roy",
          sharedByUserId: "u3",
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        }
      ],
      isOnline: true,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "g2",
      name: "Discrete Maths Doubts Crackers",
      subject: "Discrete Mathematics",
      department: "IT",
      semester: "4th",
      learningStyle: "Kinesthetic",
      description: "Struggling with Set Theory and Graph Proofs? We study twice a week, solving textbook exercises step-by-step.",
      rules: "Participate in doubt solving. Help one student before asking your question.",
      creatorId: "u2",
      members: ["u2", "u1"],
      resources: [
        {
          id: "r3",
          title: "Graph Theory Lecture Slides (Prof. Roy)",
          url: "https://arxiv.org",
          sharedBy: "Rohit Das",
          sharedByUserId: "u2",
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        }
      ],
      isOnline: false,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    }
  ],
  messages: [
    {
      id: "m1",
      groupId: "g1",
      senderId: "u1",
      senderName: "Ananya Sen",
      text: "Hey everyone! Welcome to the JIS Web Dev Titans study group! Ready to design our hackathon project?",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "m2",
      groupId: "g1",
      senderId: "u3",
      senderName: "Priyanka Roy",
      text: "Yes, Ananya! Let's schedule a study session for Monday evening regarding React state management.",
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "m3",
      groupId: "g1",
      senderId: "u2",
      senderName: "Rohit Das",
      text: "I uploaded the Tailwind guide in our resources! Let me know if you guys find it helpful.",
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString()
    }
  ],
  notifications: [
    {
      id: "n1",
      userId: "u1",
      text: "Rohit Das has requested to join your study group 'JIS Web Dev Titans'.",
      type: "request",
      relativeId: "g1",
      read: false,
      timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "n2",
      userId: "u2",
      text: "Ananya Sen accepted your join request for 'JIS Web Dev Titans'!",
      type: "accept",
      relativeId: "g1",
      read: true,
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
    }
  ],
  requests: [
    {
      id: "req1",
      groupId: "g1",
      groupName: "JIS Web Dev Titans",
      requesterId: "u2",
      requesterName: "Rohit Das",
      type: "join",
      status: "accepted",
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
    }
  ]
};

class LocalDatabase {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE_PATH)) {
        const fileContent = fs.readFileSync(DB_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(fileContent) as DatabaseSchema;
        // Basic schema verification
        if (parsed.users && parsed.groups && parsed.messages && parsed.notifications && parsed.requests) {
          return parsed;
        }
      }
    } catch (err) {
      console.error('Error loading local database file, creating a new fresh one:', err);
    }
    
    // Save initial seed data to disk
    this.saveData(initialData);
    return JSON.parse(JSON.stringify(initialData));
  }

  private saveData(newData: DatabaseSchema) {
    try {
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(newData, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write database file:', err);
    }
  }

  public write() {
    this.saveData(this.data);
  }

  // Getters
  public getUsers(): User[] {
    return this.data.users;
  }

  public getGroups(): Group[] {
    return this.data.groups;
  }

  public getMessages(): Message[] {
    return this.data.messages;
  }

  public getNotifications(): Notification[] {
    return this.data.notifications;
  }

  public getRequests(): Request[] {
    return this.data.requests;
  }

  // Setters/upserts
  public addUser(user: User) {
    this.data.users.push(user);
    this.write();
  }

  public updateUser(updated: User) {
    this.data.users = this.data.users.map(u => u.id === updated.id ? updated : u);
    this.write();
  }

  public deleteUser(userId: string) {
    this.data.users = this.data.users.filter(u => u.id !== userId);
    // Remove memberships and invitations
    this.data.groups.forEach(g => {
      g.members = g.members.filter(id => id !== userId);
    });
    this.data.groups = this.data.groups.filter(g => g.creatorId !== userId); // or resign
    this.write();
  }

  public addGroup(group: Group) {
    this.data.groups.push(group);
    this.write();
  }

  public updateGroup(updated: Group) {
    this.data.groups = this.data.groups.map(g => g.id === updated.id ? updated : g);
    this.write();
  }

  public deleteGroup(groupId: string) {
    this.data.groups = this.data.groups.filter(g => g.id !== groupId);
    this.data.messages = this.data.messages.filter(m => m.groupId !== groupId);
    this.data.requests = this.data.requests.filter(r => r.groupId !== groupId);
    this.write();
  }

  public addMessage(msg: Message) {
    this.data.messages.push(msg);
    this.write();
  }

  public deleteMessage(msgId: string) {
    this.data.messages = this.data.messages.filter(m => m.id !== msgId);
    this.write();
  }

  public addNotification(notification: Notification) {
    this.data.notifications.push(notification);
    this.write();
  }

  public markNotificationsRead(userId: string) {
    this.data.notifications = this.data.notifications.map(n => n.userId === userId ? { ...n, read: true } : n);
    this.write();
  }

  public addRequest(req: Request) {
    this.data.requests.push(req);
    this.write();
  }

  public updateRequest(reqId: string, status: 'accepted' | 'rejected') {
    this.data.requests = this.data.requests.map(r => r.id === reqId ? { ...r, status } : r);
    this.write();
  }
}

export const db = new LocalDatabase();
