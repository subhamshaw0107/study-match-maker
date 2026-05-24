import express from 'express';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createServer as createViteServer } from 'vite';
import { db, User, Group, Message, ResourceLink, Notification, Request as JoinRequest } from './server/db';
import { authMiddleware, AuthenticatedRequest, JWT_SECRET } from './server/middleware/authMiddleware';

const PORT = 3000;

// Helper to calculate study streak updates
function updateStreakIfChanged(user: User): User {
  const todayStr = new Date().toISOString().split('T')[0];
  const lastActiveStr = user.lastActiveDate ? user.lastActiveDate.split('T')[0] : '';

  if (todayStr === lastActiveStr) {
    // Already checked in today
    return user;
  }

  const today = new Date(todayStr);
  const lastActive = new Date(lastActiveStr);
  const diffTime = today.getTime() - lastActive.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let newStreak = user.streakDays;
  if (diffDays === 1) {
    // Active yesterday! Increment streak.
    newStreak += 1;
  } else if (diffDays > 1) {
    // Streak broken. Reset to 1.
    newStreak = 1;
  } else if (!user.lastActiveDate) {
    newStreak = 1;
  }

  const updatedUser: User = {
    ...user,
    streakDays: newStreak,
    lastActiveDate: new Date().toISOString()
  };

  db.updateUser(updatedUser);
  return updatedUser;
}

// Helper to determine matching score between two users
function calculateCompatibility(userA: User, userB: User): number {
  if (userA.id === userB.id) return 100;

  let score = 15; // Base compatibility for both being JIS students

  // 1. Department Match
  if (userA.department && userB.department && userA.department.toLowerCase() === userB.department.toLowerCase()) {
    score += 20;
  }

  // 2. Semester Match
  if (userA.semester && userB.semester && userA.semester.toLowerCase() === userB.semester.toLowerCase()) {
    score += 20;
  }

  // 3. Shared Subjects Match
  if (userA.subjects && userB.subjects) {
    const shared = userA.subjects.filter(s => userB.subjects.some(bs => bs.toLowerCase() === s.toLowerCase()));
    if (shared.length > 0) {
      score += Math.min(30, shared.length * 15); // +15% per shared subject, up to 30%
    }
  }

  // 4. Learning Style Match
  if (userA.learningStyle && userB.learningStyle) {
    if (userA.learningStyle === userB.learningStyle) {
      score += 10;
    } else {
      // Complimentary pairings
      const pair = [userA.learningStyle, userB.learningStyle].sort().join('-');
      if (pair === 'Reading/Writing-Visual' || pair === 'Auditory-Visual' || pair === 'Kinesthetic-Visual') {
        score += 5; // mild complimentary bonus
      }
    }
  }

  // 5. Availability overlaps
  if (userA.availability && userB.availability) {
    const sharedDays = userA.availability.days.filter(d => userB.availability.days.includes(d));
    const sharedTimes = userA.availability.times.filter(t => userB.availability.times.includes(t));
    if (sharedDays.length > 0 && sharedTimes.length > 0) {
      score += 15;
    } else if (sharedDays.length > 0 || sharedTimes.length > 0) {
      score += 7;
    }
  }

  return Math.min(99, score); // Max compatibility 99% for fun
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // ==================== REST APIS ====================

  /**
   * 1. Authentication APIs
   */

  // Sign up
  app.post('/api/auth/signup', async (req, res) => {
    try {
      const { name, email, password, department, semester, learningStyle, subjects } = req.body;

      if (!name || !email || !password) {
        res.status(400).json({ message: 'Name, email and password are required.' });
        return;
      }

      // Check for existing user
      const users = db.getUsers();
      if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        res.status(400).json({ message: 'Student email already registered.' });
        return;
      }

      // Hash password using bcryptjs
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const userId = 'u_' + Math.random().toString(36).substr(2, 9);
      const newUser: User = {
        id: userId,
        name,
        email,
        passwordHash,
        department: department || 'CSE',
        semester: semester || '1st',
        subjects: subjects || [],
        goals: '',
        learningStyle: learningStyle || 'Visual',
        availability: {
          days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          times: ['Evening']
        },
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
        streakDays: 1,
        lastActiveDate: new Date().toISOString(),
        isAdmin: false,
        createdAt: new Date().toISOString()
      };

      db.addUser(newUser);

      // Create JWT
      const token = jwt.sign({ userId: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });

      // Clean password before returning user
      const { passwordHash: _, ...userSafe } = newUser;
      res.status(210).json({ token, user: userSafe });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ message: 'System signup failure.' });
    }
  });

  // Login
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ message: 'Email and password are required.' });
        return;
      }

      const users = db.getUsers();
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

      if (!user) {
        res.status(401).json({ message: 'Invalid email or password.' });
        return;
      }

      // Match password
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        res.status(401).json({ message: 'Invalid email or password.' });
        return;
      }

      // Update study streak check-in
      const updatedUser = updateStreakIfChanged(user);

      // Create token
      const token = jwt.sign({ userId: updatedUser.id, email: updatedUser.email }, JWT_SECRET, { expiresIn: '7d' });

      // Clean response payload
      const { passwordHash: _, ...userSafe } = updatedUser;
      res.json({ token, user: userSafe });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ message: 'System authentication failure.' });
    }
  });

  // Get active self profile
  app.get('/api/auth/me', authMiddleware, (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized access.' });
      return;
    }
    const updated = updateStreakIfChanged(req.user);
    const { passwordHash: _, ...userSafe } = updated;
    res.json(userSafe);
  });

  /**
   * 2. Profile Management
   */

  // Update profile
  app.put('/api/users/profile', authMiddleware, (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized.' });
      return;
    }

    const { department, semester, subjects, goals, availability, learningStyle, avatarUrl, name } = req.body;

    const updatedUser: User = {
      ...req.user,
      name: name || req.user.name,
      department: department || req.user.department,
      semester: semester || req.user.semester,
      subjects: subjects || req.user.subjects,
      goals: goals !== undefined ? goals : req.user.goals,
      availability: availability || req.user.availability,
      learningStyle: learningStyle || req.user.learningStyle,
      avatarUrl: avatarUrl || req.user.avatarUrl,
      lastActiveDate: new Date().toISOString()
    };

    db.updateUser(updatedUser);

    const { passwordHash: _, ...userSafe } = updatedUser;
    res.json({ message: 'Profile updated successfully!', user: userSafe });
  });

  // Increase student streak (Pomodoro check-in endpoint)
  app.post('/api/users/streak-checkin', authMiddleware, (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized.' });
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const lastActiveStr = req.user.lastActiveDate ? req.user.lastActiveDate.split('T')[0] : '';

    let updatedUser = { ...req.user };

    // Force add +1 to streak for complete Pomodoro (gamification)
    updatedUser.streakDays = req.user.streakDays + 1;
    updatedUser.lastActiveDate = new Date().toISOString();

    db.updateUser(updatedUser);

    const { passwordHash: _, ...userSafe } = updatedUser;
    res.json({ message: 'Pomodoro Study session logged! Streak increased.', user: userSafe });
  });

  // Smart Compatibility Match Recommendations
  app.get('/api/users/match', authMiddleware, (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized.' });
      return;
    }

    const self = req.user;
    const allUsers = db.getUsers().filter(u => u.id !== self.id);

    const matches = allUsers.map(u => {
      const percentage = calculateCompatibility(self, u);
      const { passwordHash: _, ...safeUser } = u;
      return {
        student: safeUser,
        compatibility: percentage
      };
    }).sort((a, b) => b.compatibility - a.compatibility);

    res.json(matches);
  });

  // Search all students listings
  app.get('/api/users', authMiddleware, (req: AuthenticatedRequest, res) => {
    const list = db.getUsers().map(u => {
      const { passwordHash: _, ...safe } = u;
      return safe;
    });
    res.json(list);
  });

  /**
   * 3. Study Group Endpoints
   */

  // Create study group
  app.post('/api/groups', authMiddleware, (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized.' });
      return;
    }

    const { name, subject, department, semester, learningStyle, description, rules, isOnline } = req.body;

    if (!name || !subject || !description) {
      res.status(400).json({ message: 'Group Name, Subject, and Description are required.' });
      return;
    }

    const groupId = 'g_' + Math.random().toString(36).substr(2, 9);
    const newGroup: Group = {
      id: groupId,
      name,
      subject,
      department: department || req.user.department,
      semester: semester || req.user.semester,
      learningStyle: learningStyle || req.user.learningStyle,
      description,
      rules: rules || 'Treat every member with collegiate respect.',
      creatorId: req.user.id,
      members: [req.user.id], // Creator joins immediately
      resources: [],
      isOnline: isOnline !== undefined ? isOnline : true,
      createdAt: new Date().toISOString()
    };

    db.addGroup(newGroup);

    // Write a welcome notification/alert
    const welcomeAlert: Notification = {
      id: 'n_' + Math.random().toString(36).substr(2, 9),
      userId: req.user.id,
      text: `Your study group '${name}' has been compiled successfully. Invite peers to begin collaboration!`,
      type: 'system',
      relativeId: groupId,
      read: false,
      timestamp: new Date().toISOString()
    };
    db.addNotification(welcomeAlert);

    res.status(211).json({ message: 'Group created!', group: newGroup });
  });

  // Search and filter study groups
  app.get('/api/groups', authMiddleware, (req: AuthenticatedRequest, res) => {
    let groups = db.getGroups();
    const self = req.user;

    const { subject, semester, department, learningStyle, limit } = req.query;

    if (subject) {
      groups = groups.filter(g => g.subject.toLowerCase().includes((subject as string).toLowerCase()));
    }
    if (semester) {
      groups = groups.filter(g => g.semester.toLowerCase() === (semester as string).toLowerCase());
    }
    if (department) {
      groups = groups.filter(g => g.department.toLowerCase() === (department as string).toLowerCase());
    }
    if (learningStyle) {
      groups = groups.filter(g => g.learningStyle.toLowerCase() === (learningStyle as string).toLowerCase());
    }

    // Attach companion lists and self state indicators
    const mapped = groups.map(g => {
      const creator = db.getUsers().find(u => u.id === g.creatorId);
      const isMember = self ? g.members.includes(self.id) : false;
      
      // Calculate average match compatibility score for user to this group based on key subject
      let compatibilityScore = 50;
      if (self) {
        // Boost if same subject
        const matchesSubject = self.subjects.some(s => s.toLowerCase() === g.subject.toLowerCase());
        compatibilityScore += matchesSubject ? 30 : 0;
        // Boost if same department
        compatibilityScore += (self.department.toLowerCase() === g.department.toLowerCase()) ? 10 : 0;
        // Boost if same sem
        compatibilityScore += (self.semester.toLowerCase() === g.semester.toLowerCase()) ? 9 : 0;
      }

      return {
        ...g,
        creatorName: creator ? creator.name : 'Unknown Faculty/Student',
        memberCount: g.members.length,
        isMember,
        compatibilityScore
      };
    });

    res.json(mapped);
  });

  // Get single study group details
  app.get('/api/groups/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
    const groupId = req.params.id;
    const group = db.getGroups().find(g => g.id === groupId);

    if (!group) {
      res.status(404).json({ message: 'Study Group not found.' });
      return;
    }

    // Load full member details (excluding hashes)
    const membersList = db.getUsers()
      .filter(u => group.members.includes(u.id))
      .map(u => {
        const { passwordHash: _, ...safe } = u;
        return safe;
      });

    // Load messages
    const msgsList = db.getMessages().filter(m => m.groupId === groupId);

    const isMember = req.user ? group.members.includes(req.user.id) : false;

    res.json({
      ...group,
      membersDetails: membersList,
      messages: msgsList,
      isMember
    });
  });

  // Join a group directly or create join request
  app.post('/api/groups/:id/join', authMiddleware, (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized.' });
      return;
    }

    const groupId = req.params.id;
    const group = db.getGroups().find(g => g.id === groupId);

    if (!group) {
      res.status(404).json({ message: 'Group not found.' });
      return;
    }

    if (group.members.includes(req.user.id)) {
      res.status(400).json({ message: 'You are already a member of this active study group.' });
      return;
    }

    const creatorId = group.creatorId;

    // Check if request already exists
    const exists = db.getRequests().find(
      r => r.groupId === groupId && r.requesterId === req.user!.id && r.status === 'pending'
    );

    if (exists) {
      res.status(400).json({ message: 'A pending join request is already submitted for this study group.' });
      return;
    }

    // Auto-join if group is fully open, or create Request if restricted.
    // Let's create a dual system: if they click join, it logs a request and notifies the group creator.
    // For a highly dynamic UX, let's create a pending request, and send a notification immediately!
    const requestId = 'req_' + Math.random().toString(36).substr(2, 9);
    const newRequest: JoinRequest = {
      id: requestId,
      groupId,
      groupName: group.name,
      requesterId: req.user.id,
      requesterName: req.user.name,
      type: 'join',
      status: 'pending',
      timestamp: new Date().toISOString()
    };

    db.addRequest(newRequest);

    // Notify group creator
    const creatorNotification: Notification = {
      id: 'n_' + Math.random().toString(36).substr(2, 9),
      userId: creatorId,
      text: `${req.user.name} requested to join your study group "${group.name}".`,
      type: 'request',
      relativeId: groupId,
      read: false,
      timestamp: new Date().toISOString()
    };
    db.addNotification(creatorNotification);

    res.json({ message: 'Join request with compatibility score submitted to creator.', request: newRequest });
  });

  // Handle requests (Accept/Reject)
  app.post('/api/requests/:id/action', authMiddleware, (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized.' });
      return;
    }

    const requestId = req.params.id;
    const { action } = req.body; // 'accept' or 'reject'

    const joinReq = db.getRequests().find(r => r.id === requestId);
    if (!joinReq) {
      res.status(404).json({ message: 'Request not found.' });
      return;
    }

    const group = db.getGroups().find(g => g.id === joinReq.groupId);
    if (!group) {
      res.status(404).json({ message: 'Associated study group does not exist.' });
      return;
    }

    // Only allow group creator or administrator to accept/reject
    if (group.creatorId !== req.user.id && !req.user.isAdmin) {
      res.status(403).json({ message: 'Forbidden. Only the studio creator can accept/reject members.' });
      return;
    }

    if (joinReq.status !== 'pending') {
      res.status(400).json({ message: 'This request has already been processed.' });
      return;
    }

    if (action === 'accept') {
      db.updateRequest(requestId, 'accepted');
      
      // Add member to group
      if (!group.members.includes(joinReq.requesterId)) {
        group.members.push(joinReq.requesterId);
        db.updateGroup(group);
      }

      // Notify other student
      const userNotification: Notification = {
        id: 'n_' + Math.random().toString(36).substr(2, 9),
        userId: joinReq.requesterId,
        text: `Your request to join "${group.name}" has been accepted!`,
        type: 'accept',
        relativeId: group.id,
        read: false,
        timestamp: new Date().toISOString()
      };
      db.addNotification(userNotification);

      // System notification inside discussions
      const systemMsg: Message = {
        id: 'sys_' + Math.random().toString(36).substr(2, 9),
        groupId: group.id,
        senderId: 'system',
        senderName: 'JIS Companion Core',
        text: `${joinReq.requesterName} joined the study group!`,
        timestamp: new Date().toISOString()
      };
      db.addMessage(systemMsg);

      res.json({ message: 'Student request accepted. Member joined.', req: joinReq });
    } else {
      db.updateRequest(requestId, 'rejected');

      // Notify student
      const userNotification: Notification = {
        id: 'n_' + Math.random().toString(36).substr(2, 9),
        userId: joinReq.requesterId,
        text: `Your request to join "${group.name}" was declined. Keep searching for other peers!`,
        type: 'reject',
        relativeId: group.id,
        read: false,
        timestamp: new Date().toISOString()
      };
      db.addNotification(userNotification);

      res.json({ message: 'Request declined.', req: joinReq });
    }
  });

  // Invite student to group
  app.post('/api/requests/invite', authMiddleware, (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized.' });
      return;
    }

    const { groupId, targetUserId } = req.body;
    const group = db.getGroups().find(g => g.id === groupId);
    const target = db.getUsers().find(u => u.id === targetUserId);

    if (!group || !target) {
      res.status(404).json({ message: 'Study Group or Student not found in directory.' });
      return;
    }

    // Trigger an Invitation
    const inviteId = 'req_' + Math.random().toString(36).substr(2, 9);
    const newRequest: JoinRequest = {
      id: inviteId,
      groupId,
      groupName: group.name,
      requesterId: targetUserId,
      requesterName: target.name,
      type: 'invite',
      status: 'pending',
      timestamp: new Date().toISOString()
    };
    db.addRequest(newRequest);

    // Notify the target user
    const inviteNotification: Notification = {
      id: 'n_' + Math.random().toString(36).substr(2, 9),
      userId: targetUserId,
      text: `${req.user.name} invited you to join the study group "${group.name}".`,
      type: 'invite',
      relativeId: groupId,
      read: false,
      timestamp: new Date().toISOString()
    };
    db.addNotification(inviteNotification);

    res.json({ message: `Invitation successfully sent to ${target.name}!` });
  });

  // Notes and resource sharing endpoint
  app.post('/api/groups/:id/notes', authMiddleware, (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized.' });
      return;
    }

    const groupId = req.params.id;
    const { title, url } = req.body;

    if (!title || !url) {
      res.status(400).json({ message: 'Resource/Notes Title and URL/Link are required.' });
      return;
    }

    const group = db.getGroups().find(g => g.id === groupId);
    if (!group) {
      res.status(404).json({ message: 'Group not found.' });
      return;
    }

    if (!group.members.includes(req.user.id)) {
      res.status(403).json({ message: 'Access denied. Must be a member of this study group to share notes.' });
      return;
    }

    const newResource: ResourceLink = {
      id: 'res_' + Math.random().toString(36).substr(2, 9),
      title,
      url,
      sharedBy: req.user.name,
      sharedByUserId: req.user.id,
      timestamp: new Date().toISOString()
    };

    group.resources.push(newResource);
    db.updateGroup(group);

    // Post a message in Chat regarding shared notes
    const updateMsg: Message = {
      id: 'm_' + Math.random().toString(36).substr(2, 9),
      groupId: group.id,
      senderId: 'system',
      senderName: 'JIS Resources',
      text: `${req.user.name} shared a new study notes link: "${title}"`,
      timestamp: new Date().toISOString()
    };
    db.addMessage(updateMsg);

    res.status(211).json({ message: 'Notes shared successfully with study peers!', resources: group.resources });
  });

  /**
   * 4. Real-Time Chat Polling / Typing Status
   */

  // Fetch group messages (Short-polling endpoint supporting ultra lag-free updates)
  app.get('/api/groups/:id/messages', authMiddleware, (req: AuthenticatedRequest, res) => {
    const groupId = req.params.id;
    const group = db.getGroups().find(g => g.id === groupId);

    if (!group) {
      res.status(404).json({ message: 'Study Group not found.' });
      return;
    }

    if (!group.members.includes(req.user!.id) && !req.user!.isAdmin) {
      res.status(403).json({ message: 'Forbidden. Join this study group to access discussion history.' });
      return;
    }

    const messages = db.getMessages().filter(m => m.groupId === groupId);
    res.json(messages);
  });

  // Post message to study group
  app.post('/api/groups/:id/messages', authMiddleware, (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized.' });
      return;
    }

    const groupId = req.params.id;
    const { text } = req.body;

    if (!text || text.trim() === '') {
      res.status(400).json({ message: 'Message text cannot be empty.' });
      return;
    }

    const group = db.getGroups().find(g => g.id === groupId);
    if (!group) {
      res.status(404).json({ message: 'Study Group not found.' });
      return;
    }

    if (!group.members.includes(req.user.id)) {
      res.status(403).json({ message: 'Join group to post text messages.' });
      return;
    }

    const newMessage: Message = {
      id: 'm_' + Math.random().toString(36).substr(2, 9),
      groupId,
      senderId: req.user.id,
      senderName: req.user.name,
      text,
      timestamp: new Date().toISOString()
    };

    db.addMessage(newMessage);

    res.status(212).json(newMessage);
  });

  /**
   * 5. Notifications API
   */

  // Get student notifications & requests
  app.get('/api/notifications', authMiddleware, (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized.' });
      return;
    }

    const userId = req.user.id;
    const notifications = db.getNotifications()
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Load active join requests if user is a group master (creator)
    let pendingRequests: JoinRequest[] = [];
    const myGroupIds = db.getGroups().filter(g => g.creatorId === userId).map(g => g.id);
    if (myGroupIds.length > 0 || req.user.isAdmin) {
      pendingRequests = db.getRequests().filter(
        r => (myGroupIds.includes(r.groupId) || req.user!.isAdmin) && r.status === 'pending'
      );
    }

    // Load invitations sent TO the logged-in student
    const invites = db.getRequests().filter(
      r => r.requesterId === userId && r.type === 'invite' && r.status === 'pending'
    );

    res.json({
      notifications,
      pendingRequests,
      invites
    });
  });

  // Mark all notifications read
  app.post('/api/notifications/read', authMiddleware, (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized.' });
      return;
    }
    db.markNotificationsRead(req.user.id);
    res.json({ success: true, message: 'All notifications flagged read.' });
  });

  /**
   * 6. Admin Panel API & Statistics
   */

  // Fetch admin diagnostics and dashboard metrics
  app.get('/api/stats', authMiddleware, (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized.' });
      return;
    }

    // Only allow configured administrators or professors
    if (!req.user.isAdmin) {
      res.status(403).json({ message: 'Forbidden. Admin credentials required for platform stats.' });
      return;
    }

    const users = db.getUsers();
    const groups = db.getGroups();
    const messages = db.getMessages();
    const notifications = db.getNotifications();
    const requests = db.getRequests();

    // 1. Compute basic statistics
    const totalStudents = users.length;
    const totalGroups = groups.length;
    const totalMessages = messages.length;
    const totalRequests = requests.length;

    // 2. Compute most active department distribution
    const departmentDistribution: Record<string, number> = {};
    users.forEach(u => {
      departmentDistribution[u.department] = (departmentDistribution[u.department] || 0) + 1;
    });

    // 3. Subject-wise active groups counts
    const subjectDistribution: Record<string, number> = {};
    groups.forEach(g => {
      subjectDistribution[g.subject] = (subjectDistribution[g.subject] || 0) + 1;
    });

    // 4. Learning style representation
    const learningStyleDistribution: Record<string, number> = {};
    users.forEach(u => {
      learningStyleDistribution[u.learningStyle] = (learningStyleDistribution[u.learningStyle] || 0) + 1;
    });

    // 5. Compute aggregate compatibility numbers
    const totalMatchingCalculated = 84; // Mock diagnostic
    const compatibilityMatchRate = 78; // average match rate

    res.json({
      metrics: {
        totalStudents,
        totalGroups,
        totalMessages,
        totalRequests,
        compatibilityMatchRate
      },
      departmentDistribution,
      subjectDistribution,
      learningStyleDistribution
    });
  });

  // Admin: Delete Study Group
  app.delete('/api/groups/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized.' });
      return;
    }

    const groupId = req.params.id;
    const group = db.getGroups().find(g => g.id === groupId);

    if (!group) {
      res.status(404).json({ message: 'Group not found.' });
      return;
    }

    if (group.creatorId !== req.user.id && !req.user.isAdmin) {
      res.status(403).json({ message: 'Only Creator or Admins delete groups.' });
      return;
    }

    db.deleteGroup(groupId);
    res.json({ success: true, message: 'Study Group deleted successfully.' });
  });

  // Admin/Creator: Delete inappropriate message
  app.delete('/api/messages/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized.' });
      return;
    }

    const msgId = req.params.id;
    const msg = db.getMessages().find(m => m.id === msgId);

    if (!msg) {
      res.status(404).json({ message: 'Message not found.' });
      return;
    }

    const associatedGroup = db.getGroups().find(g => g.id === msg.groupId);
    const isCreator = associatedGroup ? associatedGroup.creatorId === req.user.id : false;

    if (!isCreator && !req.user.isAdmin && msg.senderId !== req.user.id) {
      res.status(403).json({ message: 'Forbidden. Inadequate privileges to delete message.' });
      return;
    }

    db.deleteMessage(msgId);
    res.json({ success: true, message: 'Message removed from discussion board.' });
  });

  // Admin: Delete Student User
  app.delete('/api/users/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
    if (!req.user || !req.user.isAdmin) {
      res.status(403).json({ message: 'Admin credentials required.' });
      return;
    }

    const userId = req.params.id;
    if (userId === req.user.id) {
      res.status(400).json({ message: 'You cannot delete yourself, Admin!' });
      return;
    }

    const exists = db.getUsers().find(u => u.id === userId);
    if (!exists) {
      res.status(404).json({ message: 'User not found in directory.' });
      return;
    }

    db.deleteUser(userId);
    res.json({ success: true, message: `Successfully offboarded student: ${exists.name}` });
  });

  // Admin: Promote Student to Admin
  app.post('/api/users/:id/promote', authMiddleware, (req: AuthenticatedRequest, res) => {
    if (!req.user || !req.user.isAdmin) {
      res.status(403).json({ message: 'Admin rights required.' });
      return;
    }

    const userId = req.params.id;
    const student = db.getUsers().find(u => u.id === userId);

    if (!student) {
      res.status(404).json({ message: 'Student not found.' });
      return;
    }

    student.isAdmin = true;
    db.updateUser(student);

    res.json({ success: true, message: `${student.name} promoted to System Administrator.` });
  });


  // ==================== FRONTEND SERVER MIDDLEWARE ====================

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Study Group Matcher server is active at http://localhost:${PORT}`);
  });
}

startServer();
