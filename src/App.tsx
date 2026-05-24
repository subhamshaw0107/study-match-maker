import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  BookOpen,
  Users,
  MessageSquare,
  Award,
  Bell,
  Calendar as CalIcon,
  Flame,
  ChevronRight,
  LogOut,
  User as UserIcon,
  Plus,
  ArrowRight,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Send,
  SlidersHorizontal,
  FolderLock,
  Globe,
  Share2,
  Bookmark,
  Sun,
  Moon,
  CheckCircle,
  HelpCircle,
  Info
} from 'lucide-react';

import { User, Group, Message, Notification, JoinRequest } from './types';
import { PomodoroTimer } from './components/PomodoroTimer';
import { CalendarWidget } from './components/CalendarWidget';
import { AdminPanel } from './components/AdminPanel';

export default function App() {
  // Authentication & Session States
  const [token, setToken] = useState<string | null>(localStorage.getItem('jis_study_token'));
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  
  // Login / Signup Form States
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authDept, setAuthDept] = useState('CSE');
  const [authSem, setAuthSem] = useState('6th');
  const [authStyle, setAuthStyle] = useState<'Visual' | 'Auditory' | 'Reading/Writing' | 'Kinesthetic'>('Visual');
  const [authSubjects, setAuthSubjects] = useState<string[]>([]);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  // Main Nav / Tab routing: 'home' (Landing or Dashboard), 'matcher', 'groups', 'workspace', 'admin'
  const [currentTab, setCurrentTab] = useState<'home' | 'matcher' | 'groups' | 'workspace' | 'admin'>('home');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('jis_dark_mode') === 'true';
  });

  // User Dashboard State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileGoals, setProfileGoals] = useState('');
  const [profileStyle, setProfileStyle] = useState<'Visual' | 'Auditory' | 'Reading/Writing' | 'Kinesthetic'>('Visual');
  const [profileDept, setProfileDept] = useState('CSE');
  const [profileSem, setProfileSem] = useState('6th');
  const [profileSubjects, setProfileSubjects] = useState<string[]>([]);
  const [profileDays, setProfileDays] = useState<string[]>([]);
  const [profileTimes, setProfileTimes] = useState<string[]>([]);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');

  // Match / Partner Search States
  const [matches, setMatches] = useState<{ student: User; compatibility: number }[]>([]);
  const [allStudents, setAllStudents] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterSem, setFilterSem] = useState('');
  const [filterStyle, setFilterStyle] = useState('');

  // Groups Marketplace States
  const [groups, setGroups] = useState<Group[]>([]);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupSubject, setNewGroupSubject] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupRules, setNewGroupRules] = useState('');
  const [newGroupDept, setNewGroupDept] = useState('CSE');
  const [newGroupSem, setNewGroupSem] = useState('6th');
  const [newGroupStyle, setNewGroupStyle] = useState('Visual');
  const [newGroupOnline, setNewGroupOnline] = useState(true);
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [groupFilterSubject, setGroupFilterSubject] = useState('');

  // Active Workspace / Study Room States
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<(Group & { membersDetails?: User[]; messages?: Message[] }) | null>(null);
  const [newMessageText, setNewMessageText] = useState('');
  const [activeGroupLoading, setActiveGroupLoading] = useState(false);
  
  // Simulated real-time typing indicators
  const [typingUser, setTypingUser] = useState<string | null>(null);

  // Notifications Sidebar / Alerts
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pendingRequests, setPendingRequests] = useState<JoinRequest[]>([]);
  const [invites, setInvites] = useState<JoinRequest[]>([]);
  const [unreadsCount, setUnreadsCount] = useState(0);

  // Share note / upload notes resources
  const [noteTitle, setNoteTitle] = useState('');
  const [noteUrl, setNoteUrl] = useState('');
  const [noteError, setNoteError] = useState('');
  const [noteSuccess, setNoteSuccess] = useState('');

  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Available typical subjects at JIS Group of Institutions
  const universitySubjects = [
    'Data Structures',
    'Web Development',
    'Discrete Mathematics',
    'Core Java',
    'Operating Systems',
    'Database Systems',
    'Microprocessors',
    'Digital Communication',
    'Python Programming',
    'Machine Learning',
    'Computer Networks'
  ];

  // System Initialize & Polling
  useEffect(() => {
    if (token) {
      fetchMyProfile();
      loadNotificationCenter();
    }
    // Set standard theme class on start-up
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [token, darkMode]);

  // General data loading based on current selected visual tab
  useEffect(() => {
    if (token) {
      if (currentTab === 'matcher') {
        fetchRecMatches();
        fetchAllStudents();
      } else if (currentTab === 'groups') {
        fetchGroupsList();
      }
    }
  }, [currentTab, token]);

  // Auto poll notifications and live study room chat logs if room is open
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (token) {
      interval = setInterval(() => {
        loadNotificationCenter();
        if (currentTab === 'workspace' && activeGroupId) {
          fetchWorkspaceChatLogsSilent();
        }
      }, 3000); // short polling interval
    }
    return () => clearInterval(interval);
  }, [token, currentTab, activeGroupId]);

  // Simulate peers "typing indicators" randomly inside the active study room for dynamic look
  useEffect(() => {
    if (currentTab === 'workspace' && activeGroup) {
      const peers = activeGroup.membersDetails?.filter(m => m.id !== user?.id) || [];
      if (peers.length > 0) {
        const typingInterval = setInterval(() => {
          if (Math.random() > 0.65) {
            const randomPeer = peers[Math.floor(Math.random() * peers.length)];
            setTypingUser(randomPeer.name);
            setTimeout(() => setTypingUser(null), 2500);
          }
        }, 8000);
        return () => clearInterval(typingInterval);
      }
    }
  }, [currentTab, activeGroup]);

  // Scroll chat boards on updates
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeGroup?.messages]);

  // Light/Dark mode togglers
  const toggleDarkMode = () => {
    const nextDark = !darkMode;
    setDarkMode(nextDark);
    localStorage.setItem('jis_dark_mode', String(nextDark));
    if (nextDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Helper auth headers
  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  });

  // REST CALLS

  // Handle Fetching Self profile
  async function fetchMyProfile() {
    try {
      const res = await fetch('/api/auth/me', { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        // Sync profile fields
        setProfileName(data.name);
        setProfileDept(data.department);
        setProfileSem(data.semester);
        setProfileStyle(data.learningStyle);
        setProfileGoals(data.goals);
        setProfileSubjects(data.subjects);
        setProfileDays(data.availability?.days || []);
        setProfileTimes(data.availability?.times || []);
      } else {
        // Token stale, clear out
        handleLogOut();
      }
    } catch (e) {
      console.error('Core startup connection issue:', e);
    }
  }

  // Reload Notifications
  async function loadNotificationCenter() {
    try {
      const res = await fetch('/api/notifications', { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setPendingRequests(data.pendingRequests || []);
        setInvites(data.invites || []);
        // calculate unread alert badge
        const unreads = (data.notifications || []).filter((n: any) => !n.read).length;
        setUnreadsCount(unreads);
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Clear unreads flags
  async function handleMarkNotificationsRead() {
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: getHeaders()
      });
      loadNotificationCenter();
    } catch (e) {
      console.error(e);
    }
  }

  // Handle login submit
  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    if (!authEmail || !authPassword) {
      setAuthError('Email and password fields are required.');
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        localStorage.setItem('jis_study_token', data.token);
        setUser(data.user);
        setAuthSuccess('✓ Access verified! Welcome to JIS study boards.');
        setTimeout(() => {
          setIsAuthModalOpen(false);
          setCurrentTab('home');
        }, 1200);
      } else {
        setAuthError(data.message || 'Authentications failed.');
      }
    } catch (err) {
      setAuthError('Network error connecting to backend.');
    }
  }

  // Handle Signup submit
  async function handleSignupSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    if (!authName || !authEmail || !authPassword) {
      setAuthError('All basic credentials are required to enroll.');
      return;
    }

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: authName,
          email: authEmail,
          password: authPassword,
          department: authDept,
          semester: authSem,
          learningStyle: authStyle,
          subjects: authSubjects
        })
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        localStorage.setItem('jis_study_token', data.token);
        setUser(data.user);
        setAuthSuccess('✓ Enrollment complete! Let\'s build your matching profile.');
        setTimeout(() => {
          setIsAuthModalOpen(false);
          setCurrentTab('home');
          setIsEditingProfile(true); // Guide them immediately to detail availability planner!
        }, 1500);
      } else {
        setAuthError(data.message || 'Enrollment rejected.');
      }
    } catch (err) {
      setAuthError('Database offline.');
    }
  }

  // Fetch match recommendations
  async function fetchRecMatches() {
    try {
      const res = await fetch('/api/users/match', { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setMatches(data);
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Fetch full student directory
  async function fetchAllStudents() {
    try {
      const res = await fetch('/api/users', { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAllStudents(data);
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Fetch Study Groups
  async function fetchGroupsList() {
    try {
      const res = await fetch('/api/groups', { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setGroups(data);
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Refresh user profiles inside the visual Dashboard
  async function handleProfileUpdate(e: React.FormEvent) {
    e.preventDefault();
    setProfileSuccessMsg('');

    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          name: profileName,
          department: profileDept,
          semester: profileSem,
          learningStyle: profileStyle,
          goals: profileGoals,
          subjects: profileSubjects,
          availability: {
            days: profileDays,
            times: profileTimes
          }
        })
      });

      const d = await res.json();
      if (res.ok) {
        setUser(d.user);
        setProfileSuccessMsg('✓ Your JIS Academic profile has been updated!');
        setTimeout(() => {
          setProfileSuccessMsg('');
          setIsEditingProfile(false);
        }, 2200);
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Join a group (Submit join request)
  async function handleJoinGroupRequest(groupId: string) {
    try {
      const res = await fetch(`/api/groups/${groupId}/join`, {
        method: 'POST',
        headers: getHeaders()
      });
      const data = await res.json();
      alert(data.message || 'Request processed!');
      fetchGroupsList();
      loadNotificationCenter();
    } catch (e) {
      console.error(e);
    }
  }

  // Enter Workspace Study Room
  async function enterStudyRoom(gId: string) {
    setActiveGroupId(gId);
    setActiveGroupLoading(true);
    setCurrentTab('workspace');

    try {
      const res = await fetch(`/api/groups/${gId}`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setActiveGroup(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActiveGroupLoading(false);
    }
  }

  // Load chat updates silently for short polling inside the Active Room
  async function fetchWorkspaceChatLogsSilent() {
    if (!activeGroupId) return;
    try {
      const res = await fetch(`/api/groups/${activeGroupId}`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        // Preserving local resources or participants listings, but update messages
        setActiveGroup(prev => {
          if (!prev) return data;
          return {
            ...prev,
            messages: data.messages,
            resources: data.resources,
            membersDetails: data.membersDetails
          };
        });
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Send message in study room
  async function handlePostMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!activeGroupId || !newMessageText.trim()) return;

    const typedText = newMessageText;
    setNewMessageText(''); // instant visually responsive wipe

    // Optimistic frontend rendering
    const tempId = 'temp_' + Date.now();
    const optimisticMsg: Message = {
      id: tempId,
      groupId: activeGroupId,
      senderId: user?.id || 'u',
      senderName: user?.name || 'Me',
      text: typedText,
      timestamp: new Date().toISOString()
    };

    setActiveGroup(prev => {
      if (!prev) return null;
      return {
        ...prev,
        messages: [...(prev.messages || []), optimisticMsg]
      };
    });

    try {
      const res = await fetch(`/api/groups/${activeGroupId}/messages`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ text: typedText })
      });
      if (!res.ok) {
        console.error('Failed to post discussion text.');
      } else {
        fetchWorkspaceChatLogsSilent();
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Upload notes/resource links inside the Workspace Room
  async function handleShareNotes(e: React.FormEvent) {
    e.preventDefault();
    setNoteError('');
    setNoteSuccess('');

    if (!noteTitle || !noteUrl) {
      setNoteError('Title and URL link are required.');
      return;
    }

    try {
      const res = await fetch(`/api/groups/${activeGroupId}/notes`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ title: noteTitle, url: noteUrl })
      });
      const data = await res.json();
      if (res.ok) {
        setNoteSuccess('✓ Shared successfully with peers!');
        setNoteTitle('');
        setNoteUrl('');
        if (activeGroup) {
          setActiveGroup({
            ...activeGroup,
            resources: data.resources
          });
        }
        setTimeout(() => setNoteSuccess(''), 3000);
      } else {
        setNoteError(data.message || 'Share rejected.');
      }
    } catch (e) {
      setNoteError('Failed link publication.');
    }
  }

  // Create group submit
  async function handleCreateGroupSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newGroupName || !newGroupSubject || !newGroupDesc) {
      alert('Group Name, Subject, and Description are required.');
      return;
    }

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          name: newGroupName,
          subject: newGroupSubject,
          description: newGroupDesc,
          rules: newGroupRules,
          department: newGroupDept,
          semester: newGroupSem,
          learningStyle: newGroupStyle,
          isOnline: newGroupOnline
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert('✓ Study Group created! Enter the workspace to begin.');
        setNewGroupName('');
        setNewGroupSubject('');
        setNewGroupDesc('');
        setNewGroupRules('');
        setIsCreateGroupOpen(false);
        fetchGroupsList();
        // Instantly enter newly created room
        enterStudyRoom(data.group.id);
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Handle request actions: Accept/Reject Join Request
  async function handleRequestDecision(requestId: string, action: 'accept' | 'reject') {
    try {
      const res = await fetch(`/api/requests/${requestId}/action`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ action })
      });
      const d = await res.json();
      alert(d.message || 'Action saved.');
      loadNotificationCenter();
      if (currentTab === 'groups') fetchGroupsList();
    } catch (e) {
      console.error(e);
    }
  }

  // Direct Peer study request invite
  async function handleInvitePeer(targetId: string) {
    if (!token) {
      alert('Please log in to contact study partners!');
      return;
    }
    // Present choice of groups to invite to if user has groups they manage
    const myGroups = groups.filter(g => g.creatorId === user?.id);
    if (myGroups.length === 0) {
      // Prompt user to create a study group first
      const conf = confirm('You must establish at least one active Study Group to host and invite partners. Would you like to create your study group now?');
      if (conf) {
        setCurrentTab('groups');
        setIsCreateGroupOpen(true);
      }
      return;
    }

    // Select the first group for convenience, or trigger a clean list
    const firstGroup = myGroups[0];
    try {
      const res = await fetch('/api/requests/invite', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ groupId: firstGroup.id, targetUserId: targetId })
      });
      const data = await res.json();
      alert(data.message || 'Invitation sent!');
    } catch (err) {
      console.error(err);
    }
  }

  const handleLogOut = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('jis_study_token');
    setCurrentTab('home');
  };

  // Subject checklist toggle helper
  const handleToggleSubject = (sub: string, state: 'profile' | 'auth') => {
    const list = state === 'profile' ? profileSubjects : authSubjects;
    const setList = state === 'profile' ? setProfileSubjects : setAuthSubjects;

    if (list.includes(sub)) {
      setList(list.filter(item => item !== sub));
    } else {
      setList([...list, sub]);
    }
  };

  // Day toggle helper
  const handleToggleDay = (day: string) => {
    if (profileDays.includes(day)) {
      setProfileDays(profileDays.filter(d => d !== day));
    } else {
      setProfileDays([...profileDays, day]);
    }
  };

  // Time toggle helper
  const handleToggleTime = (time: string) => {
    if (profileTimes.includes(time)) {
      setProfileTimes(profileTimes.filter(t => t !== time));
    } else {
      setProfileTimes([...profileTimes, time]);
    }
  };

  // Filtered lists computation
  const filteredMatches = matches.filter(m => {
    const matchesSearch = searchQuery === '' || 
      m.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.student.subjects.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesDept = filterDept === '' || m.student.department === filterDept;
    const matchesSem = filterSem === '' || m.student.semester === filterSem;
    const matchesStyle = filterStyle === '' || m.student.learningStyle === filterStyle;

    return matchesSearch && matchesDept && matchesSem && matchesStyle;
  });

  const filteredGroups = groups.filter(g => {
    const matchesSearch = groupSearchQuery === '' || 
      g.name.toLowerCase().includes(groupSearchQuery.toLowerCase()) ||
      g.subject.toLowerCase().includes(groupSearchQuery.toLowerCase()) ||
      g.description.toLowerCase().includes(groupSearchQuery.toLowerCase());

    const matchesSubject = groupFilterSubject === '' || g.subject === groupFilterSubject;

    return matchesSearch && matchesSubject;
  });

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* ==================== GLOBAL NAVBAR ==================== */}
      <header className="sticky top-0 z-40 w-full glass-effect border-b border-black/5 dark:border-white/5 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex h-16 items-center justify-between">
          
          {/* Logo / Brand */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setCurrentTab('home')}>
            <div className="h-9 w-9 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md shadow-blue-500/10">
              JIS
            </div>
            <div>
              <span className="font-sans font-extrabold text-[#0f172a] dark:text-white tracking-tight text-[15px] sm:text-base leading-none block">
                StudyMatcher
              </span>
              <span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider block mt-0.5">
                JIS University Portal
              </span>
            </div>
          </div>

          {/* Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-6 font-sans text-xs font-semibold">
            <button
              onClick={() => setCurrentTab('home')}
              className={`transition-colors cursor-pointer ${currentTab === 'home' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'}`}
            >
              Dashboard
            </button>
            {token && (
              <>
                <button
                  onClick={() => setCurrentTab('matcher')}
                  className={`transition-colors cursor-pointer ${currentTab === 'matcher' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'}`}
                >
                  Find Partners
                </button>
                <button
                  onClick={() => setCurrentTab('groups')}
                  className={`transition-colors cursor-pointer ${currentTab === 'groups' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'}`}
                >
                  Study Groups
                </button>
              </>
            )}
            {user?.isAdmin && (
              <button
                onClick={() => setCurrentTab('admin')}
                className={`flex items-center gap-1 transition-colors cursor-pointer ${currentTab === 'admin' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'}`}
              >
                <ShieldCheck className="w-4 h-4 text-indigo-500" />
                Admin Panel
              </button>
            )}
          </nav>

          {/* Actions / Utilities */}
          <div className="flex items-center gap-3">
            
            {/* Dark/Light Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
              title="Toggle Light/Dark Theme"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
            </button>

            {token ? (
              <>
                {/* Notifications Bell */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setIsNotificationsOpen(!isNotificationsOpen);
                      if (!isNotificationsOpen) {
                        handleMarkNotificationsRead();
                      }
                    }}
                    className="p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-all cursor-pointer relative"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadsCount > 0 && (
                      <span className="absolute top-0 right-0 h-4 w-4 bg-rose-600 text-white rounded-full flex items-center justify-center text-[9px] font-bold border border-white">
                        {unreadsCount}
                      </span>
                    )}
                  </button>

                  {/* Notifications Sandbox Popover */}
                  {isNotificationsOpen && (
                    <div className="absolute right-0 mt-2.5 w-80 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-4 font-sans text-xs">
                      <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100 dark:border-slate-800">
                        <span className="font-bold text-slate-800 dark:text-slate-100">Updates & Requests</span>
                        <button
                          onClick={() => setIsNotificationsOpen(false)}
                          className="text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          Dismiss
                        </button>
                      </div>

                      {/* Display Pending Join Requests (If user is group creator) */}
                      {pendingRequests.length > 0 && (
                        <div className="mb-4 space-y-2">
                          <p className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 tracking-wider">Join Requests</p>
                          {pendingRequests.map((r) => (
                            <div key={r.id} className="p-2.5 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-105 rounded-xl space-y-1.5">
                              <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                                <strong>{r.requesterName}</strong> wants to join <strong>{r.groupName}</strong>
                              </p>
                              <div className="flex gap-1.5 justify-end">
                                <button
                                  onClick={() => handleRequestDecision(r.id, 'reject')}
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[10px] rounded font-semibold cursor-pointer text-slate-600 dark:text-slate-350"
                                >
                                  Decline
                                </button>
                                <button
                                  onClick={() => handleRequestDecision(r.id, 'accept')}
                                  className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] rounded font-semibold cursor-pointer"
                                >
                                  Accept
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Display invitations to user */}
                      {invites.length > 0 && (
                        <div className="mb-4 space-y-2">
                          <p className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider">Received Invitations</p>
                          {invites.map((inv) => (
                            <div key={inv.id} className="p-2.5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 rounded-xl space-y-1.5">
                              <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                                You are invited to join <strong>{inv.groupName}</strong>!
                              </p>
                              <div className="flex gap-1.5 justify-end">
                                <button
                                  onClick={() => handleRequestDecision(inv.id, 'reject')}
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-[10px] rounded font-semibold cursor-pointer"
                                >
                                  Ignore
                                </button>
                                <button
                                  onClick={() => handleRequestDecision(inv.id, 'accept')}
                                  className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] rounded font-semibold cursor-pointer"
                                >
                                  Join Room
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Past Activities</p>
                        {notifications.length === 0 ? (
                          <p className="text-center text-slate-400 py-4 italic text-[11px]">No recent alerts.</p>
                        ) : (
                          notifications.map((n) => (
                            <div key={n.id} className="p-2 bg-slate-50 dark:bg-slate-850 rounded-lg">
                              <p className="text-slate-700 dark:text-slate-300 leading-snug">{n.text}</p>
                              <span className="text-[9px] text-slate-400 block mt-1">{new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Logged User widget */}
                <div className="flex items-center gap-2">
                  <div
                    onClick={() => {
                      setCurrentTab('home');
                      setIsEditingProfile(true);
                    }}
                    className="h-8 w-8 rounded-full bg-blue-100 border border-blue-500/20 flex items-center justify-center cursor-pointer select-none"
                    title="Edit study preferences"
                  >
                    <img
                      src={user?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`}
                      alt={user?.name}
                      className="w-full h-full rounded-full"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <button
                    onClick={handleLogOut}
                    className="text-xs p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer font-semibold"
                    title="Log Out"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={() => {
                  setAuthMode('login');
                  setIsAuthModalOpen(true);
                }}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 transition-colors text-white font-semibold text-xs rounded-xl flex items-center gap-1 cursor-pointer shadow-md"
              >
                <UserIcon className="w-4 h-4" />
                Student Login
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ==================== HOME / DASHBOARD / LANDING ==================== */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-8">
        {!token ? (
          /* ==================== GUEST LANDING VIEW ==================== */
          <div className="space-y-16 animate-fade-in">
            {/* Hero Section */}
            <section className="text-center py-12 md:py-20 max-w-4xl mx-auto space-y-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100/60 dark:bg-blue-900/10 text-blue-700 dark:text-blue-300 font-sans text-[11px] font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                Collaborative Peer Matching System
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-sans font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                Find Your Perfect <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-500 bg-clip-text text-transparent">
                  Study Group at JIS
                </span>
              </h1>
              <p className="text-slate-600 dark:text-slate-350 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
                Join JIS University's smart study matching utility. We align college students dynamically based on departments, sem courses, specific subjects, learning styles, and daily availability slots.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                <button
                  onClick={() => {
                    setAuthMode('signup');
                    setIsAuthModalOpen(true);
                  }}
                  className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/15 group"
                >
                  Create Student Account
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
                <button
                  onClick={() => {
                    setAuthMode('login');
                    setIsAuthModalOpen(true);
                  }}
                  className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-205 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-sm rounded-xl flex items-center justify-center cursor-pointer"
                >
                  Explore Existing Groups
                </button>
              </div>
            </section>

            {/* Bento Grid Features Panel */}
            <section className="space-y-8">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Designed Specifically for University Success</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Everything you need to master your syllabus alongside collegiate peers.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Visual Card 1: Smart Match */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/30 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:shadow-xl transition-all duration-300">
                  <div className="space-y-3">
                    <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">Smart Compatibility Engine</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Matches classmates by analyzing semester, department classes, mutual doubt topics, and shared calendar study schedules automatically.
                    </p>
                  </div>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold block pt-4 uppercase">Dual Matching algorithm</span>
                </div>

                {/* Visual Card 2: Immersive Rooms */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/30 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:shadow-xl transition-all duration-300">
                  <div className="space-y-3">
                    <div className="h-10 w-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">Real-Time Chat & Resources</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Study rooms represent modular workspaces where peer groups share important drive/notes URLs, class presentations, and live chat discussions.
                    </p>
                  </div>
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold block pt-4 uppercase">Collative study spaces</span>
                </div>

                {/* Visual Card 3: Gamified Streaks */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/30 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:shadow-xl transition-all duration-300">
                  <div className="space-y-3">
                    <div className="h-10 w-10 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center">
                      <Flame className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">Pomodoro Timer & Streaks</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Log your study hours using our integrated Pomodoro clock. Succeeding ticks increases your consecutive daily academic study streak.
                    </p>
                  </div>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block pt-4 uppercase">Acing student discipline</span>
                </div>

              </div>
            </section>

            {/* University Department Roster Showcase */}
            <section className="bg-gradient-to-b from-blue-50 to-slate-50 dark:from-slate-900/40 dark:to-slate-950 rounded-3xl p-8 border border-slate-200/20 dark:border-slate-850">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest block">Semesters / Groups Catalog</span>
                  <h3 className="text-2xl font-sans font-bold text-slate-850 dark:text-white leading-snug">
                    Spanning Computer Science, IT, Electronics, and Mechanical cohorts
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Study Matcher coordinates study circles for JIS University's major engineering and science tracks. Classmates create customized subject directories tailored for semester mid-terms and lab preparations.
                  </p>
                  <div className="flex gap-2 flex-wrap text-xs">
                    <span className="p-2 py-1 bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-850 hover:border-blue-500 rounded-xl font-medium">🛡️ CSE Department</span>
                    <span className="p-2 py-1 bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-850 hover:border-blue-500 rounded-xl font-medium">💻 IT Sector</span>
                    <span className="p-2 py-1 bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-850 hover:border-blue-500 rounded-xl font-medium">⚡ ECE Labs</span>
                    <span className="p-2 py-1 bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-850 hover:border-blue-500 rounded-xl font-medium">⚙️ EE Circuits</span>
                  </div>
                </div>
                <div className="relative flex justify-center">
                  <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/30 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-sm space-y-4">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-150">Active Seed Students</p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-50 dark:border-slate-850">
                        <div className="flex items-center gap-2">
                          <span className="font-bold h-6 w-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center font-mono">AS</span>
                          <div>
                            <span className="font-semibold block">Ananya Sen</span>
                            <span className="text-[9px] text-slate-400">Computer Science • 6th Sem</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">94% Compatibility</span>
                      </div>
                      <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-50 dark:border-slate-850">
                        <div className="flex items-center gap-2">
                          <span className="font-bold h-6 w-6 bg-indigo-100 text-indigo-800 rounded-full flex items-center justify-center font-mono">RD</span>
                          <div>
                            <span className="font-semibold block">Rohit Das</span>
                            <span className="text-[9px] text-slate-400">IT Department • 4th Sem</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-blue-600 font-bold bg-blue-50 dark:bg-blue-900/10 px-2 py-0.5 rounded-full">87% Compatibility</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        ) : (
          /* ==================== AUTHENTICATED STUDENT PORTAL (Tab contents) ==================== */
          <div className="space-y-8 animate-fade-in">
            {currentTab === 'home' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Visual Dashboard Sidebar Area */}
                <div className="space-y-6 lg:col-span-1">
                  
                  {/* Student Profile Card (Interactive Glass Container) */}
                  <div className="bg-white/70 dark:bg-slate-900/70 border border-white/40 dark:border-slate-800/40 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 h-16 w-16 bg-blue-500/15 rounded-bl-3xl" />
                    
                    <div className="flex items-center gap-4.5 mb-5">
                      <img
                        src={user?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`}
                        alt={user?.name}
                        className="w-16 h-16 rounded-full border-2 border-blue-500/35 bg-slate-50"
                        referrerPolicy="no-referrer"
                      />
                      <div className="space-y-0.5">
                        <h2 className="font-sans font-extrabold text-[#0f172a] dark:text-white text-base leading-tight">
                          {user?.name}
                        </h2>
                        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                          {user?.department} • {user?.semester} Semester
                        </p>
                        <div className="inline-flex items-center gap-1 text-[10px] text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/25 px-2 py-0.5 rounded-full font-bold">
                          <Flame className="w-3.5 h-3.5 fill-current animate-bounce" />
                          <span>{user?.streakDays} Day Streak</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 text-xs font-sans">
                      <div className="pb-3 border-b border-slate-100 dark:border-slate-850">
                        <span className="text-[10px] text-slate-400 font-semibold block uppercase">Learning Style</span>
                        <span className="font-semibold text-slate-850 dark:text-slate-200 flex items-center gap-1.5 mt-1.5 p-1 px-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 w-max rounded-lg">
                          📖 {user?.learningStyle} Style
                        </span>
                      </div>

                      <div className="pb-3 border-b border-slate-100 dark:border-slate-850">
                        <span className="text-[10px] text-slate-400 font-semibold block uppercase">Target Study Subjects</span>
                        <div className="flex gap-1.5 flex-wrap mt-2">
                          {user?.subjects && user.subjects.length > 0 ? (
                            user.subjects.map((sub) => (
                              <span key={sub} className="px-2 py-1 bg-slate-100 dark:bg-slate-850 text-slate-600 dark:text-slate-300 rounded-md font-mono text-[10px] font-semibold border border-slate-200/20">
                                {sub}
                              </span>
                            ))
                          ) : (
                            <span className="italic text-slate-400 text-[10px]">No subjects added yet. Update profile below.</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold block uppercase">Academic Objectives & Goals</span>
                        <p className="text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed leading-normal text-[11px] italic bg-slate-50/50 dark:bg-slate-850/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850">
                          {user?.goals || '“Set semester objective files to match compatibility filters perfectly!”'}
                        </p>
                      </div>

                      {!isEditingProfile ? (
                        <button
                          onClick={() => setIsEditingProfile(true)}
                          className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs rounded-xl transition-all cursor-pointer shadow-md text-center"
                        >
                          Modify Study Preferences
                        </button>
                      ) : (
                        <button
                          onClick={() => setIsEditingProfile(false)}
                          className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-350 font-semibold text-xs rounded-xl transition-all cursor-pointer text-center"
                        >
                          Cancel Changes
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Focus Pomodoro Timer Widget */}
                  <PomodoroTimer
                    token={token}
                    onStreakUpdate={(newStreak) => {
                      if (user) setUser({ ...user, streakDays: newStreak });
                    }}
                  />

                </div>

                {/* Dashboard Main Panel area */}
                <div className="space-y-6 lg:col-span-2">
                  
                  {/* Profile Editing Form Overlay-State */}
                  {isEditingProfile ? (
                    <div className="bg-white/70 dark:bg-slate-900/70 border border-white/40 dark:border-slate-800/40 rounded-3xl p-6 shadow-xl animate-fade-in">
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-4">Edit JIS Academic Preferences</h3>
                      
                      {profileSuccessMsg && (
                        <p className="p-3 bg-emerald-100/10 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-semibold border border-emerald-500/20 mb-4 animate-bounce">
                          {profileSuccessMsg}
                        </p>
                      )}

                      <form onSubmit={handleProfileUpdate} className="space-y-4 text-xs">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="font-semibold text-slate-600 dark:text-slate-450 uppercase text-[10px]">Student Registry Name</label>
                            <input
                              type="text"
                              value={profileName}
                              onChange={(e) => setProfileName(e.target.value)}
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="font-semibold text-slate-600 dark:text-slate-450 uppercase text-[10px]">Primary Learning System</label>
                            <select
                              value={profileStyle}
                              onChange={(e: any) => setProfileStyle(e.target.value)}
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-blue-500"
                            >
                              <option value="Visual">Visual (Slides, Flowcharts)</option>
                              <option value="Auditory">Auditory (Lectures, Talking)</option>
                              <option value="Reading/Writing">Reading/Writing (Notes, Manuals)</option>
                              <option value="Kinesthetic">Kinesthetic (Code Projects, Experiments)</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="font-semibold text-slate-600 dark:text-slate-450 uppercase text-[10px]">Department Track</label>
                            <select
                              value={profileDept}
                              onChange={(e) => setProfileDept(e.target.value)}
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-blue-500"
                            >
                              <option value="CSE">CSE Department</option>
                              <option value="IT">IT Division</option>
                              <option value="ECE">ECE Telecom</option>
                              <option value="EE">EE Circuits</option>
                              <option value="ME">ME Cohort</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="font-semibold text-slate-600 dark:text-slate-450 uppercase text-[10px]">Semester</label>
                            <select
                              value={profileSem}
                              onChange={(e) => setProfileSem(e.target.value)}
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-blue-500"
                            >
                              {['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'].map((sem) => (
                                <option key={sem} value={sem}>{sem} Semester</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Subject picker checkbox arrays */}
                        <div className="space-y-1.5">
                          <label className="font-semibold text-slate-600 dark:text-slate-450 uppercase text-[10px]">Academic Focus Subjects (Select multiple)</label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-2xl max-h-40 overflow-y-auto">
                            {universitySubjects.map((sub) => (
                              <label key={sub} className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-slate-100/60 dark:hover:bg-slate-900">
                                <input
                                  type="checkbox"
                                  checked={profileSubjects.includes(sub)}
                                  onChange={() => handleToggleSubject(sub, 'profile')}
                                  className="rounded border-slate-300 dark:border-slate-705 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-[11px] truncate">{sub}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Availability Checklist Schedule */}
                        <div className="space-y-2">
                          <label className="font-semibold text-slate-600 dark:text-slate-450 uppercase text-[10px]">Your Availability Slots</label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-2xl space-y-2">
                              <span className="text-[10px] font-bold text-slate-400 block uppercase">Weekly Days Available</span>
                              <div className="flex flex-wrap gap-1.5">
                                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                                  const isActive = profileDays.includes(day);
                                  return (
                                    <button
                                      type="button"
                                      key={day}
                                      onClick={() => handleToggleDay(day)}
                                      className={`px-2 py-1 text-[10px] rounded font-semibold transition-all cursor-pointer ${
                                        isActive ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                      }`}
                                    >
                                      {day.substring(0, 3)}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-2xl space-y-2">
                              <span className="text-[10px] font-bold text-slate-400 block uppercase">Hour Slots Available</span>
                              <div className="flex flex-wrap gap-1.5">
                                {['Morning', 'Afternoon', 'Evening'].map((time) => {
                                  const isActive = profileTimes.includes(time);
                                  return (
                                    <button
                                      type="button"
                                      key={time}
                                      onClick={() => handleToggleTime(time)}
                                      className={`px-2 py-1 text-[10px] rounded font-semibold transition-all cursor-pointer ${
                                        isActive ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                      }`}
                                    >
                                      {time}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold text-slate-600 dark:text-slate-450 uppercase text-[10px]">Study Goals & Target Exam description</label>
                          <textarea
                            value={profileGoals}
                            onChange={(e) => setProfileGoals(e.target.value)}
                            placeholder="e.g., Acing normal forms in DBMS exam and finishing lab exercises."
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-850 rounded-xl px-3.5 py-2 focus:outline-none focus:border-blue-500 h-16 resize-none"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all cursor-pointer text-center"
                        >
                          Save Changes & Synergize
                        </button>
                      </form>
                    </div>
                  ) : null}

                  {/* Welcoming Dashboard Header */}
                  <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 h-28 w-28 bg-white/10 rounded-full -mr-6 -mt-6" />
                    <span className="text-[10px] uppercase font-bold text-white/70 block tracking-widest">Dashboard Hub</span>
                    <h2 className="text-xl sm:text-2xl font-bold font-sans mt-1">Hello, {user?.name}!</h2>
                    <p className="text-xs text-blue-100 max-w-xl mt-1.5 leading-relaxed">
                      Welcome to your JIS study dashboard. Let's find suitable study partners, collaborative groups, scheduling meetings, and logging streaks.
                    </p>
                    <div className="flex gap-2.5 mt-4">
                      <button
                        onClick={() => setCurrentTab('matcher')}
                        className="px-4 py-2 bg-white text-blue-750 font-bold text-xs rounded-xl hover:bg-slate-50 shadow-md cursor-pointer transition-all"
                      >
                        Explore Peers
                      </button>
                      <button
                        onClick={() => setCurrentTab('groups')}
                        className="px-4 py-2 bg-blue-700/60 hover:bg-blue-700/80 text-white font-bold text-xs rounded-xl border border-blue-500/25 cursor-pointer transition-all"
                      >
                        Browse Groups
                      </button>
                    </div>
                  </div>

                  {/* Calendar scheduler integration widget */}
                  <CalendarWidget />

                  {/* Quick Guide to Study Modes Info Alert */}
                  <div className="bg-white/40 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 flex gap-3.5 items-start">
                    <div className="p-2 bg-blue-100/60 text-blue-600 rounded-lg dark:bg-blue-900/20 dark:text-blue-400 mt-0.5">
                      <Info className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-100">Study Tip: Pairing Learning Styles</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-450 leading-relaxed leading-normal">
                        To maximize compatibility score, seek peers with complementary styles! For example, Visual learners (slides) pair excellently with Reading/Writing types (study note guides) or Kinesthetic developers (lab code exercises).
                      </p>
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* ==================== PARTNERS MATCH EXPLORER ==================== */}
            {currentTab === 'matcher' && (
              <div className="space-y-6">
                
                {/* Search & Sliders Filter Panel */}
                <div className="p-5 bg-white/70 dark:bg-slate-900/70 border border-white/40 dark:border-slate-800/40 rounded-3xl shadow-xl space-y-4">
                  <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-sans font-bold text-slate-800 dark:text-white text-base">Recommended Students Directory</h3>
                      <p className="text-[11px] text-slate-405 mt-0.5">Matching algorithm scans subjects and course semester availability</p>
                    </div>
                    
                    <div className="relative flex-1 md:max-w-md">
                      <Search className="absolute left-3.5 top-2.5 h-4.5 w-4.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search student names or specific subjects..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 text-slate-850 dark:text-slate-100 text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/50 dark:border-slate-800 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Fast Selector Filters Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1.5 border-t border-slate-100 dark:border-slate-800">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">By Department</span>
                      <select
                        value={filterDept}
                        onChange={(e) => setFilterDept(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 text-slate-805 dark:text-slate-205 border border-slate-200/50 dark:border-slate-800 rounded-lg p-1.5 focus:outline-none focus:border-blue-550"
                      >
                        <option value="">All Departments</option>
                        <option value="CSE">CSE Department</option>
                        <option value="IT">IT Sector</option>
                        <option value="ECE">ECE Telecom</option>
                        <option value="EE">EE Circuits</option>
                        <option value="ME">ME Cohort</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">By Semester</span>
                      <select
                        value={filterSem}
                        onChange={(e) => setFilterSem(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 text-slate-805 dark:text-slate-205 border border-slate-200/50 dark:border-slate-800 rounded-lg p-1.5 focus:outline-none"
                      >
                        <option value="">All Semesters</option>
                        <option value="1st">1st Sem</option>
                        <option value="2nd">2nd Sem</option>
                        <option value="3rd">3rd Sem</option>
                        <option value="4th">4th Sem</option>
                        <option value="5th">5th Sem</option>
                        <option value="6th">6th Sem</option>
                        <option value="7th">7th Sem</option>
                        <option value="8th">8th Sem</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">By Learning Style</span>
                      <select
                        value={filterStyle}
                        onChange={(e) => setFilterStyle(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 text-slate-805 dark:text-slate-205 border border-slate-200/50 dark:border-slate-800 rounded-lg p-1.5 focus:outline-none"
                      >
                        <option value="">All Styles</option>
                        <option value="Visual">Visual</option>
                        <option value="Auditory">Auditory</option>
                        <option value="Reading/Writing">Reading/Writing</option>
                        <option value="Kinesthetic">Kinesthetic</option>
                      </select>
                    </div>

                    <div className="flex items-end">
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setFilterDept('');
                          setFilterSem('');
                          setFilterStyle('');
                        }}
                        className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350 rounded-lg font-semibold transition-all cursor-pointer text-center text-[11px]"
                      >
                        Clear Quick Filters
                      </button>
                    </div>
                  </div>
                </div>

                {/* Compatibility Recommended Partner Deck */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredMatches.length === 0 ? (
                    <div className="col-span-3 text-center py-12 text-slate-400">
                      <p>No JIS classmates match your search inputs. Try widening your criteria parameters!</p>
                    </div>
                  ) : (
                    filteredMatches.map(({ student, compatibility }) => (
                      <div
                        key={student.id}
                        className="bg-white/70 dark:bg-slate-900/70 border border-white/40 dark:border-slate-800/40 rounded-3xl p-5 shadow-xl transition-all duration-300 hover:shadow-2xl hover:translate-y-[-2px] flex flex-col justify-between"
                      >
                        <div className="space-y-4">
                          {/* Card Header Match details */}
                          <div className="flex justify-between items-start gap-2 border-b border-slate-50 dark:border-slate-850 pb-3">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={student.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.name}`}
                                alt={student.name}
                                className="w-10 h-10 rounded-full bg-slate-100"
                                referrerPolicy="no-referrer"
                              />
                              <div>
                                <span className="font-semibold text-slate-850 dark:text-white block text-sm leading-tight">{student.name}</span>
                                <span className="text-[10px] text-slate-400 block leading-tight mt-0.5">
                                  {student.department} • {student.semester} Semester
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="inline-block text-[11px] font-bold text-blue-750 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300 rounded-full p-1 px-2.5">
                                {compatibility}% Match
                              </span>
                            </div>
                          </div>

                          <div className="space-y-2.5 text-xs">
                            <div className="flex flex-wrap gap-1">
                              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-805 dark:bg-indigo-900/10 dark:text-indigo-350 rounded font-bold text-[9px] uppercase tracking-wider">
                                {student.learningStyle} Style
                              </span>
                              {student.streakDays >= 5 && (
                                <span className="px-2 py-0.5 bg-orange-55 text-orange-700 dark:bg-orange-950/20 dark:text-orange-300 rounded font-bold text-[9px] uppercase tracking-wider flex items-center gap-0.5">
                                  🔥 {student.streakDays}d Streak
                                </span>
                              )}
                            </div>

                            <p className="text-slate-500 dark:text-slate-400 text-[11px] line-clamp-2 italic leading-relaxed">
                              &ldquo;{student.goals || 'Looking to connect with serious study peer groups!'}&rdquo;
                            </p>

                            <div className="space-y-1">
                              <span className="text-[10px] text-slate-400 font-bold block uppercase">Subjects Focused:</span>
                              <div className="flex gap-1.5 flex-wrap">
                                {student.subjects.map((s) => (
                                  <span key={s} className="px-1.5 py-0.5 bg-slate-50 dark:bg-slate-850 rounded border border-slate-200/10 text-[10px] truncate max-w-[140px]" title={s}>
                                    {s}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Ava schedule check preview */}
                            <div className="pt-1 select-none">
                              <span className="text-[9px] text-slate-400 font-bold block uppercase mb-1">Weekly availability</span>
                              <div className="flex gap-1 dark:text-slate-300 text-[9px] font-medium font-mono">
                                {['Monday', 'Wednesday', 'Friday'].map((day) => {
                                  const matchesA = student.availability?.days?.includes(day);
                                  return (
                                    <span key={day} className={`p-1 px-1.5 border rounded-md ${matchesA ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/10' : 'bg-slate-50 text-slate-400 border-slate-200/40 opacity-50'}`}>
                                      {day.substring(0, 3)}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 mt-4 border-t border-slate-50 dark:border-slate-850 flex items-center justify-between">
                          <span className="text-[10px] leading-tight text-slate-400 font-mono">
                            Available in <strong>{student.availability?.times[0] || 'Evening'}s</strong>
                          </span>
                          <button
                            onClick={() => handleInvitePeer(student.id)}
                            className="p-2 px-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Invite Study
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

              </div>
            )}

            {/* ==================== STUDY GROUPS MARKETPLACE ==================== */}
            {currentTab === 'groups' && (
              <div className="space-y-6">
                
                {/* Search, Filter groups with Create Button */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-5 bg-white/70 dark:bg-slate-900/70 border border-white/40 dark:border-slate-800/40 rounded-3xl shadow-xl">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-2.5 h-4.5 w-4.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search groups by topic, titles..."
                      value={groupSearchQuery}
                      onChange={(e) => setGroupSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 text-slate-850 dark:text-slate-100 text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/50 dark:border-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex gap-2 text-xs">
                    <select
                      value={groupFilterSubject}
                      onChange={(e) => setGroupFilterSubject(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 border border-slate-200/50 dark:border-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-550"
                    >
                      <option value="">All Subjects</option>
                      {universitySubjects.map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                    
                    <button
                      onClick={() => setIsCreateGroupOpen(true)}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Create Group
                    </button>
                  </div>
                </div>

                {/* Create Group Modal Overlay */}
                {isCreateGroupOpen && (
                  <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5 text-sm uppercase tracking-wider">
                          <Plus className="w-5 h-5 text-blue-600" />
                          Establish JIS Study Circle
                        </h3>
                        <button
                          onClick={() => setIsCreateGroupOpen(false)}
                          className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer text-xs"
                        >
                          ✕ Close
                        </button>
                      </div>

                      <form onSubmit={handleCreateGroupSubmit} className="space-y-3.5 text-xs">
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-600 dark:text-slate-450 uppercase text-[10px]">Study Circle Name</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g., CSE Web Titans - Lab prep"
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="font-semibold text-slate-600 dark:text-slate-450 uppercase text-[10px]">Academic subject focus</label>
                            <select
                              value={newGroupSubject}
                              onChange={(e) => setNewGroupSubject(e.target.value)}
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none"
                            >
                              <option value="">Select subject</option>
                              {universitySubjects.map(sub => (
                                <option key={sub} value={sub}>{sub}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="font-semibold text-slate-600 dark:text-slate-450 uppercase text-[10px]">Cohort Track</label>
                            <select
                              value={newGroupStyle}
                              onChange={(e) => setNewGroupStyle(e.target.value)}
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none font-medium"
                            >
                              <option value="Visual">Visual Learners preferred</option>
                              <option value="Auditory">Auditory focus</option>
                              <option value="Reading/Writing">Reading notes focus</option>
                              <option value="Kinesthetic">Kinesthetic hands-on</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="font-semibold text-slate-600 dark:text-slate-450 uppercase text-[10px]">Department Track Code</label>
                            <select
                              value={newGroupDept}
                              onChange={(e) => setNewGroupDept(e.target.value)}
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none"
                            >
                              <option value="CSE">CSE (Computer Science)</option>
                              <option value="IT">IT Division</option>
                              <option value="ECE">ECE Telecom</option>
                              <option value="EE">Electrical (EE)</option>
                              <option value="ME">Mech (ME)</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="font-semibold text-slate-600 dark:text-slate-450 uppercase text-[10px]">Semester</label>
                            <select
                              value={newGroupSem}
                              onChange={(e) => setNewGroupSem(e.target.value)}
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none"
                            >
                              {['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'].map(sem => (
                                <option key={sem} value={sem}>{sem} Sem</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold text-slate-600 dark:text-slate-450 uppercase text-[10px]">Study Chapter / Room description</label>
                          <textarea
                            required
                            placeholder="Write semester prep goals, doubts to master or project criteria."
                            value={newGroupDesc}
                            onChange={(e) => setNewGroupDesc(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl px-3.5 py-2 focus:outline-none h-16 resize-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold text-slate-600 dark:text-slate-450 uppercase text-[10px]">Group Study Rules / Guidelines</label>
                          <input
                            type="text"
                            placeholder="e.g., Solve weekly questions + Share reference materials only."
                            value={newGroupRules}
                            onChange={(e) => setNewGroupRules(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-805 rounded-xl px-3.5 py-2"
                          />
                        </div>

                        <div className="flex items-center gap-2 py-1.5 select-none">
                          <input
                            type="checkbox"
                            id="online_check"
                            checked={newGroupOnline}
                            onChange={(e) => setNewGroupOnline(e.target.checked)}
                            className="rounded border-slate-300 dark:border-slate-705 text-blue-600 focus:ring-blue-500"
                          />
                          <label htmlFor="online_check" className="font-semibold text-slate-700 dark:text-slate-350 cursor-pointer uppercase text-[10px]">
                            Preferred Mode: <strong>Online Meetups</strong>
                          </label>
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md cursor-pointer transition-all text-center"
                        >
                          Compile & Open Study Room
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                {/* Groups Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredGroups.length === 0 ? (
                    <div className="col-span-3 text-center py-12 text-slate-400">
                      <p>No JIS study circles match your search query. Try creating one!</p>
                    </div>
                  ) : (
                    filteredGroups.map((g) => {
                      const compatibilityColor = g.compatibilityScore && g.compatibilityScore > 75
                        ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-300'
                        : 'text-blue-600 bg-blue-50 dark:bg-blue-900/10 dark:text-blue-350';

                      return (
                        <div
                          key={g.id}
                          className="bg-white/70 dark:bg-slate-900/70 border border-white/40 dark:border-slate-800/40 rounded-3xl p-5 shadow-xl hover:shadow-2xl hover:translate-y-[-2px] transition-all duration-300 flex flex-col justify-between"
                        >
                          <div className="space-y-3.5">
                            <div className="flex justify-between items-start gap-1.5 border-b border-slate-50 dark:border-slate-85 pb-2.5">
                              <div>
                                <h4 className="font-bold text-slate-850 dark:text-white leading-tight text-sm truncate max-w-[200px]" title={g.name}>{g.name}</h4>
                                <span className="text-[10px] text-slate-400 block mt-0.5 font-sans leading-none">Founded by <strong>{g.creatorName || 'Peer'}</strong></span>
                              </div>
                              <span className={`px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider rounded-md ${compatibilityColor}`}>
                                {g.compatibilityScore}% Relevant
                              </span>
                            </div>

                            <p className="text-xs text-slate-500 leading-relaxed font-sans line-clamp-3">
                              {g.description}
                            </p>

                            <div className="flex flex-wrap gap-1.5 pt-1">
                              <span className="p-1 px-2 bg-slate-55 dark:bg-slate-850 text-slate-600 dark:text-slate-350 rounded font-code text-[10px] font-semibold border border-slate-200/10">
                                📚 {g.subject}
                              </span>
                              <span className="p-1 px-2 bg-slate-55 dark:bg-slate-850 text-slate-600 dark:text-slate-350 rounded font-sans text-[10px] font-semibold border border-slate-200/10">
                                🏫 {g.department} • {g.semester} sem
                              </span>
                              <span className="p-1 px-2 bg-slate-55 dark:bg-slate-850 text-slate-600 dark:text-slate-350 rounded font-sans text-[10px] font-semibold border border-slate-200/10">
                                {g.isOnline ? '🌐 Online' : '🏢 In-Lab'}
                              </span>
                            </div>
                          </div>

                          <div className="pt-4 mt-4 border-t border-slate-50 dark:border-slate-85 flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                              <Users className="w-4 h-4 text-slate-300" />
                              <span>🧑‍🎓 <strong>{g.memberCount}</strong> Members</span>
                            </div>

                            {g.isMember ? (
                              <button
                                onClick={() => enterStudyRoom(g.id)}
                                className="p-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1 leading-none"
                              >
                                Enter Room
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleJoinGroupRequest(g.id)}
                                className="p-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1 leading-none"
                              >
                                Join Group
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

              </div>
            )}

            {/* ==================== ACTIVE GROUP WORKSPACE STUDY ROOM ==================== */}
            {currentTab === 'workspace' && activeGroup && (
              <div className="space-y-6">
                
                {/* Active Group Header */}
                <div className="p-5 bg-gradient-to-tr from-slate-900 to-slate-950 text-white rounded-3xl border border-slate-800 shadow-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-blue-600/30 text-blue-300 rounded font-bold uppercase text-[9px] tracking-widest border border-blue-500/20 font-mono">
                        {activeGroup.subject} Study Space
                      </span>
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] uppercase font-bold text-emerald-400">Active Room Session</span>
                    </div>
                    <h2 className="text-xl font-bold font-sans tracking-tight">{activeGroup.name}</h2>
                    <p className="text-[11px] text-slate-400 max-w-2xl leading-relaxed">{activeGroup.description}</p>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <button
                      onClick={() => setCurrentTab('groups')}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold border border-slate-700 text-slate-300 transition-all cursor-pointer"
                    >
                      ← Exit Room
                    </button>
                  </div>
                </div>

                {/* Main Workspace Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  
                  {/* Left Column (2 lg-cols) -> Live Chat and Discussion */}
                  <div className="lg:col-span-2 bg-white/70 dark:bg-slate-900/70 border border-white/40 dark:border-slate-800/40 rounded-3xl p-5 shadow-xl flex flex-col h-[600px] justify-between">
                    
                    {/* Chat Header */}
                    <div className="flex justify-between items-center pb-3 border-b border-slate-50 dark:border-slate-850">
                      <div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-150 flex items-center gap-1">
                          <MessageSquare className="w-5 h-5 text-blue-600" />
                          Class Study Discussion
                        </h3>
                        <p className="text-[10px] text-slate-405">Short-polling instant stream sync active</p>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/25 px-2 py-0.5 rounded">
                        ● Live Study Link
                      </span>
                    </div>

                    {/* Discussion Area */}
                    <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-2 select-text">
                      {activeGroup.messages?.map((m) => {
                        const isMe = m.senderId === user?.id;
                        const isSystem = m.senderId === 'system';

                        if (isSystem) {
                          return (
                            <div key={m.id} className="text-center">
                              <span className="inline-block p-1 px-3 bg-blue-50/60 dark:bg-blue-900/10 text-blue-700 dark:text-blue-300 text-[10px] rounded-lg font-semibold font-mono border border-blue-550/10">
                                {m.text}
                              </span>
                            </div>
                          );
                        }

                        return (
                          <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-bold text-slate-400 capitalize">{m.senderName}</span>
                              <span className="text-[8px] text-slate-400 font-mono">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className={`p-3 rounded-2xl max-w-sm text-xs leading-relaxed max-w-[85%] ${
                              isMe
                                ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-tr-none shadow-md'
                                : 'bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-slate-150 rounded-tl-none border border-slate-205 dark:border-slate-800'
                            }`}>
                              {m.text}
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Peers simulated typing indicator */}
                      {typingUser && (
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium animate-pulse">
                          <span>👤 <strong>{typingUser}</strong> is typing doubts...</span>
                        </div>
                      )}

                      <div ref={chatBottomRef} />
                    </div>

                    {/* Send Message Input Form */}
                    <form onSubmit={handlePostMessage} className="pt-3 border-t border-slate-50 dark:border-slate-850 flex items-center gap-2.5">
                      <input
                        type="text"
                        placeholder="Discuss syllabus topics or seek doubts..."
                        value={newMessageText}
                        onChange={(e) => setNewMessageText(e.target.value)}
                        className="flex-1 bg-slate-50 dark:bg-slate-950 text-slate-850 dark:text-slate-100 text-xs px-4 py-3 rounded-xl border border-slate-205 dark:border-slate-800 focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="submit"
                        disabled={!newMessageText.trim()}
                        className="p-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl shadow-md cursor-pointer transition-all"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>

                  </div>

                  {/* Right Columns (2 lg-cols) -> Materials Resource Sharing & Timers */}
                  <div className="lg:col-span-2 space-y-6">
                    
                    {/* Notes & Materials Share widget */}
                    <div className="bg-white/70 dark:bg-slate-900/70 border border-white/40 dark:border-slate-800/40 rounded-3xl p-5 shadow-xl space-y-4">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-50 dark:border-slate-85">
                        <div>
                          <h3 className="font-bold text-slate-800 dark:text-slate-150 flex items-center gap-1 text-sm">
                            <BookOpen className="w-5 h-5 text-blue-600" />
                            Notes & Syllabus Sharing
                          </h3>
                        </div>
                      </div>

                      {/* Display Shared Notes list */}
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {activeGroup.resources && activeGroup.resources.length > 0 ? (
                          activeGroup.resources.map((res) => (
                            <div key={res.id} className="p-3 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl flex items-center justify-between gap-2.5 border border-slate-200/20">
                              <div className="min-w-0">
                                <span className="text-xs font-semibold text-slate-800 dark:text-white block truncate leading-tight">{res.title}</span>
                                <span className="text-[9px] text-slate-400 font-sans block mt-0.5 mt-1 leading-none">Shared by <strong>{res.sharedBy}</strong></span>
                              </div>
                              <a
                                href={res.url}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 bg-blue-50 border border-blue-100 hover:bg-blue-100 dark:bg-blue-900/15 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg cursor-pointer transform hover:scale-105 transition"
                                title="Open notes download link"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-4 text-slate-400 text-xs italic">
                            No syllabi or reference files shared. Publish the first notes link below!
                          </div>
                        )}
                      </div>

                      {/* Add study notes URL form */}
                      <form onSubmit={handleShareNotes} className="pt-2 border-t border-slate-50 dark:border-slate-850/60 text-xs space-y-2.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block pb-1">Publish Study Materials Link</span>
                        {noteError && <p className="text-rose-500 font-semibold">{noteError}</p>}
                        {noteSuccess && <p className="text-emerald-600 font-semibold animate-bounce">{noteSuccess}</p>}

                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Resource Name (e.g. Unit 3 SQL Slides)"
                            value={noteTitle}
                            onChange={(e) => setNoteTitle(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-950 text-slate-850 dark:text-slate-100 px-3 py-1.5 rounded-lg border border-slate-205 dark:border-slate-800 focus:outline-none"
                          />
                          <input
                            type="text"
                            placeholder="Hyperlink (e.g. https://drive.google.com/..."
                            value={noteUrl}
                            onChange={(e) => setNoteUrl(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-950 text-slate-850 dark:text-slate-100 px-3 py-1.5 rounded-lg border border-slate-205 dark:border-slate-800 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <button
                          type="submit"
                          className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer text-center text-[11px]"
                        >
                          Share with Workspace Group
                        </button>
                      </form>

                    </div>

                    {/* Local Calendar meetings scheduler synced to this active board */}
                    <CalendarWidget currentGroupName={activeGroup.name} />

                  </div>

                </div>

              </div>
            )}

            {/* ==================== ADMINISTRATIVE CONSOLE ==================== */}
            {currentTab === 'admin' && (
              <div className="space-y-6">
                {user?.isAdmin ? (
                  <AdminPanel
                    token={token}
                    currentUser={user}
                    onRefreshTrigger={() => {
                      fetchMyProfile();
                    }}
                  />
                ) : (
                  <div className="p-8 text-center bg-rose-50/50 dark:bg-rose-950/20 text-rose-550 border border-rose-200 rounded-3xl">
                    <ShieldCheck className="w-12 h-12 text-rose-500 mx-auto mb-2" />
                    <h3 className="font-bold">Credential Access Denied</h3>
                    <p className="text-xs text-slate-400 mt-1">This panel is restricted exclusively to faculty and registered university administrators.</p>
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </main>

      {/* ==================== FOOTER ==================== */}
      <footer className="w-full bg-white dark:bg-slate-950 border-t border-slate-200/50 dark:border-slate-900 py-8 text-xs text-slate-400 select-none">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 dark:text-slate-300">Study Group Matcher for JIS</span>
            <span>•</span>
            <span>Designed for JIS University Academics © 2026</span>
          </div>
          <div className="flex gap-4 font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 transition">
            <a href="#privacy" className="hover:text-blue-500">Academic Guidelines</a>
            <a href="#about" className="hover:text-blue-500">Contact Faculty</a>
            <a href="#help" className="hover:text-blue-500">Help Desk</a>
          </div>
        </div>
      </footer>

      {/* ==================== AUTHENTICATIONS MODAL WINDOW ==================== */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-fade-in my-8">
            
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-sans font-extrabold text-[#0f172a] dark:text-white flex items-center gap-1.5 text-sm uppercase tracking-wider">
                <Users className="w-5 h-5 text-blue-600" />
                {authMode === 'login' ? 'Classmate Login' : 'Enlist New Student'}
              </h3>
              <button
                onClick={() => {
                  setIsAuthModalOpen(false);
                  setAuthError('');
                  setAuthSuccess('');
                }}
                className="p-1 text-slate-400 hover:text-slate-605 cursor-pointer text-xs"
              >
                ✕ Close
              </button>
            </div>

            {authError && (
              <p className="p-2 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450 rounded-xl text-xs font-semibold border border-rose-300/30">
                ✗ {authError}
              </p>
            )}
            {authSuccess && (
              <p className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-450 rounded-xl text-xs font-semibold border border-emerald-300/30 animate-bounce">
                {authSuccess}
              </p>
            )}

            {authMode === 'login' ? (
              /* --- LOGIN SCREEN --- */
              <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 dark:text-slate-450 uppercase text-[10px]">Student Institution Email</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g., student.name@jis.edu"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 dark:text-slate-100 border border-slate-205 dark:border-slate-800 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-blue-550"
                  />
                  <p className="text-[9px] text-slate-400">Seed emails: ananya.sen@jis.edu, rohit.das@jis.edu, admin@jis.edu</p>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 dark:text-slate-450 uppercase text-[10px]">Profile Access Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 dark:text-slate-100 border border-slate-205 dark:border-slate-800 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-blue-550"
                  />
                  <p className="text-[9px] text-slate-400">Seed student password is <strong>student123</strong></p>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md cursor-pointer transition-all"
                >
                  Confirm Credentials & Entry
                </button>

                <p className="text-[10px] text-center text-slate-400 pt-2 border-t border-slate-50 dark:border-slate-850">
                  New student?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signup');
                      setAuthError('');
                    }}
                    className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                  >
                    Create Matcher Profile
                  </button>
                </p>
              </form>
            ) : (
              /* --- SIGNUP SCREEN (STEPS INCLUDED IN ONE SCREEN) --- */
              <form onSubmit={handleSignupSubmit} className="space-y-3.5 text-xs max-h-[500px] overflow-y-auto pr-1">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 dark:text-slate-450 uppercase text-[10px]">Student Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Priyansh Gupta"
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 dark:text-slate-100 border border-slate-205 dark:border-slate-800 rounded-xl px-3.5 py-2.5 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 dark:text-slate-450 uppercase text-[10px]">Institution E-Mail (edu)</label>
                  <input
                    type="email"
                    required
                    placeholder="student.id@jis.edu"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 dark:text-slate-100 border border-slate-205 dark:border-slate-800 rounded-xl px-3.5 py-2.5 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 dark:text-slate-450 uppercase text-[10px]">Set Secret Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Min. 8 characters"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 dark:text-slate-100 border border-slate-205 dark:border-slate-800 rounded-xl px-3.5 py-2.5 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600 dark:text-slate-450 uppercase text-[10px]">Department Track</label>
                    <select
                      value={authDept}
                      onChange={(e) => setAuthDept(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 dark:text-slate-100 border border-slate-205 dark:border-slate-800 rounded-xl px-3.5 py-2.5"
                    >
                      <option value="CSE">CSE (Computer Science)</option>
                      <option value="IT">IT (Information Tech)</option>
                      <option value="ECE">ECE (Electronics)</option>
                      <option value="EE">EE (Electrical)</option>
                      <option value="ME">ME (Mechanical)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600 dark:text-slate-450 uppercase text-[10px]">Current Semester</label>
                    <select
                      value={authSem}
                      onChange={(e) => setAuthSem(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 dark:text-slate-100 border border-slate-205 dark:border-slate-800 rounded-xl px-3.5 py-2.5"
                    >
                      {['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'].map(sem => (
                        <option key={sem} value={sem}>{sem} Sem</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 dark:text-slate-450 uppercase text-[10px]">Your Primary learning style style</label>
                  <select
                    value={authStyle}
                    onChange={(e: any) => setAuthStyle(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 dark:text-slate-100 border border-slate-205 dark:border-slate-800 rounded-xl px-3 py-2.5"
                  >
                    <option value="Visual">Visual (Infographics, Videos)</option>
                    <option value="Auditory">Auditory (Listen & Debate)</option>
                    <option value="Reading/Writing">Reading/Writing (Textbooks, Notes)</option>
                    <option value="Kinesthetic">Kinesthetic (Active coding labs)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 dark:text-slate-450 uppercase text-[10px]">Target Academic Subjects</label>
                  <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-2xl max-h-32 overflow-y-auto">
                    {universitySubjects.map((sub) => (
                      <label key={sub} className="flex items-center gap-2 cursor-pointer p-0.5 rounded hover:bg-slate-100/60 dark:hover:bg-slate-900">
                        <input
                          type="checkbox"
                          checked={authSubjects.includes(sub)}
                          onChange={() => handleToggleSubject(sub, 'auth')}
                          className="rounded text-blue-600"
                        />
                        <span className="text-[10px] truncate">{sub}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md cursor-pointer transition-all"
                >
                  Enlist & Build Smart Profile
                </button>

                <p className="text-[10px] text-center text-slate-400 pt-2 border-t border-slate-50 dark:border-slate-850">
                  Already registered?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setAuthError('');
                    }}
                    className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                  >
                    Login here
                  </button>
                </p>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
