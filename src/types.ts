export interface User {
  id: string;
  name: string;
  email: string;
  department: string;
  semester: string;
  subjects: string[];
  goals: string;
  learningStyle: 'Visual' | 'Auditory' | 'Reading/Writing' | 'Kinesthetic';
  availability: {
    days: string[];
    times: string[];
  };
  avatarUrl: string;
  streakDays: number;
  lastActiveDate: string;
  isAdmin: boolean;
  createdAt: string;
}

export interface ResourceLink {
  id: string;
  title: string;
  url: string;
  sharedBy: string;
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
  members: string[];
  resources: ResourceLink[];
  isOnline: boolean;
  createdAt: string;
  
  // Attached dynamic properties from endpoint:
  creatorName?: string;
  memberCount?: number;
  isMember?: boolean;
  compatibilityScore?: number;
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
  relativeId?: string;
  read: boolean;
  timestamp: string;
}

export interface JoinRequest {
  id: string;
  groupId: string;
  groupName: string;
  requesterId: string;
  requesterName: string;
  type: 'join' | 'invite';
  status: 'pending' | 'accepted' | 'rejected';
  timestamp: string;
}

export interface Metrics {
  totalStudents: number;
  totalGroups: number;
  totalMessages: number;
  totalRequests: number;
  compatibilityMatchRate: number;
}

export interface StatsDashboard {
  metrics: Metrics;
  departmentDistribution: Record<string, number>;
  subjectDistribution: Record<string, number>;
  learningStyleDistribution: Record<string, number>;
}
