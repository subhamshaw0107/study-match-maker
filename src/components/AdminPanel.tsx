import React, { useState, useEffect } from 'react';
import { ShieldCheck, Users, MessageSquare, Award, Trash2, UserPlus, FileBarChart, Group, ChevronRight } from 'lucide-react';
import { User, Group as StudyGroup, StatsDashboard } from '../types';

interface AdminPanelProps {
  token: string | null;
  currentUser: User | null;
  onRefreshTrigger?: () => void;
}

export function AdminPanel({ token, currentUser, onRefreshTrigger }: AdminPanelProps) {
  const [stats, setStats] = useState<StatsDashboard | null>(null);
  const [students, setStudents] = useState<User[]>([]);
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stats' | 'students' | 'groups'>('stats');
  const [notification, setNotification] = useState('');

  useEffect(() => {
    if (token) {
      loadAdminData();
    }
  }, [token]);

  async function loadAdminData() {
    setIsLoading(true);
    try {
      const authHeader = { 'Authorization': `Bearer ${token}` };

      // 1. Load Stats
      const statsRes = await fetch('/api/stats', { headers: authHeader });
      const statsData = await statsRes.json();
      if (statsRes.ok) setStats(statsData);

      // 2. Load Students
      const usersRes = await fetch('/api/users', { headers: authHeader });
      const usersData = await usersRes.json();
      if (usersRes.ok) setStudents(usersData);

      // 3. Load Groups
      const groupsRes = await fetch('/api/groups', { headers: authHeader });
      const groupsData = await groupsRes.json();
      if (groupsRes.ok) setGroups(groupsData);

    } catch (err) {
      console.error('Error compiling admin data info:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteStudent(userId: string) {
    if (!token) return;
    if (confirm('Are you absolutely sure you want to delete this student from the JIS study directory? All their created groups and messages will be purged.')) {
      try {
        const res = await fetch(`/api/users/${userId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const d = await res.json();
        if (res.ok) {
          setNotification(`✓ Successfully deleted student!`);
          setStudents(students.filter(s => s.id !== userId));
          if (onRefreshTrigger) onRefreshTrigger();
          setTimeout(() => setNotification(''), 4000);
        } else {
          setNotification(`✗ ${d.message || 'Purge failed.'}`);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }

  async function handlePromoteStudent(userId: string) {
    if (!token) return;
    try {
      const res = await fetch(`/api/users/${userId}/promote`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const d = await res.json();
      if (res.ok) {
        setNotification(`✓ Student promoted to University Admin!`);
        setStudents(students.map(s => s.id === userId ? { ...s, isAdmin: true } : s));
        setTimeout(() => setNotification(''), 4000);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDeleteGroup(groupId: string) {
    if (!token) return;
    if (confirm('Are you sure you want to delete this study group? This will wipe the conversation boards and shared logs.')) {
      try {
        const res = await fetch(`/api/groups/${groupId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const d = await res.json();
        if (res.ok) {
          setNotification(`✓ Successfully closed study group.`);
          setGroups(groups.filter(g => g.id !== groupId));
          if (onRefreshTrigger) onRefreshTrigger();
          setTimeout(() => setNotification(''), 4000);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-blue-600 dark:text-blue-400 font-medium font-sans animate-pulse">
        Polling university roster & databases...
      </div>
    );
  }

  return (
    <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg border border-white/40 dark:border-slate-800/40 rounded-3xl p-6 shadow-2xl">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-xl shadow-md">
            <ShieldCheck className="w-5.5 h-5.5" />
          </div>
          <div>
            <h2 className="font-sans font-bold text-slate-800 dark:text-white text-lg flex items-center gap-1.5">
              JIS Platform Admin Panel
              <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Full-Access
              </span>
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-550">
              Logged in as <strong className="text-slate-700 dark:text-slate-200">{currentUser?.name}</strong>
            </p>
          </div>
        </div>

        {/* Custom Admin navigation tabs */}
        <div className="flex gap-1.5 p-1 bg-slate-100/80 dark:bg-slate-850/80 rounded-xl border border-slate-200/30">
          {(['stats', 'students', 'groups'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-xs px-3.5 py-1.5 rounded-lg font-semibold transition-all duration-300 cursor-pointer ${
                activeTab === tab
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-350 dark:hover:text-white'
              }`}
            >
              {tab === 'stats' ? 'Analytics' : tab === 'students' ? 'Student Roster' : 'Study Groups'}
            </button>
          ))}
        </div>
      </div>

      {notification && (
        <div className="mb-4 p-3 rounded-xl text-xs font-semibold bg-blue-50 dark:bg-blue-950/25 border border-blue-100 dark:border-blue-900 text-blue-750 dark:text-blue-350 leading-relaxed animate-fade-in">
          {notification}
        </div>
      )}

      {/* 1. ANALYTICS BOARD */}
      {activeTab === 'stats' && stats && (
        <div className="space-y-6">
          {/* Bento Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50/40 dark:bg-slate-850/40 border border-blue-100/30 dark:border-slate-800/50 rounded-2xl p-4">
              <span className="text-slate-400 dark:text-slate-500 font-sans text-[11px] font-semibold uppercase tracking-wider">Total Registrants</span>
              <p className="text-3xl font-mono font-bold text-blue-600 dark:text-blue-400 mt-1">{stats.metrics.totalStudents}</p>
              <span className="text-[10px] text-slate-400">Enrolled Students</span>
            </div>
            <div className="bg-cyan-50/40 dark:bg-slate-850/40 border border-cyan-150/20 dark:border-slate-800/50 rounded-2xl p-4">
              <span className="text-slate-400 dark:text-slate-500 font-sans text-[11px] font-semibold uppercase tracking-wider">Active Group Hubs</span>
              <p className="text-3xl font-mono font-bold text-cyan-600 dark:text-cyan-400 mt-1">{stats.metrics.totalGroups}</p>
              <span className="text-[10px] text-slate-400">Collaboration rooms</span>
            </div>
            <div className="bg-indigo-50/40 dark:bg-slate-850/40 border border-indigo-100/30 dark:border-slate-800/50 rounded-2xl p-4">
              <span className="text-slate-400 dark:text-slate-500 font-sans text-[11px] font-semibold uppercase tracking-wider">Compatibility Score</span>
              <p className="text-3xl font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-1">{stats.metrics.compatibilityMatchRate}%</p>
              <span className="text-[10px] text-slate-400">Avg. matching accuracy</span>
            </div>
            <div className="bg-emerald-50/40 dark:bg-slate-850/40 border border-emerald-100/30 dark:border-slate-800/50 rounded-2xl p-4">
              <span className="text-slate-400 dark:text-slate-500 font-sans text-[11px] font-semibold uppercase tracking-wider">Interactions</span>
              <p className="text-3xl font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats.metrics.totalMessages}</p>
              <span className="text-[10px] text-slate-400">Discussion board comments</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Custom SVG Distribution chart 1 (Department representation) */}
            <div className="bg-white/40 dark:bg-slate-850/30 border border-slate-100 dark:border-slate-800/40 rounded-2xl p-5">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider mb-4">Department Enrollment Shares</h4>
              <div className="space-y-3">
                {Object.entries(stats.departmentDistribution).map(([dept, rawCount]) => {
                  const count = rawCount as number;
                  const vals = Object.values(stats.departmentDistribution) as number[];
                  const maxCount = Math.max(...vals);
                  const percentWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;
                  return (
                    <div key={dept} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-600 dark:text-slate-300 font-mono">{dept} Department</span>
                        <span className="text-slate-800 dark:text-white">{count} Students</span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${percentWidth}%` }}
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Custom SVG Distribution chart 2 (Learning Style Spreads) */}
            <div className="bg-white/40 dark:bg-slate-850/30 border border-slate-100 dark:border-slate-800/40 rounded-2xl p-5">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider mb-4">Learning Style Spreads</h4>
              <div className="space-y-3">
                {Object.entries(stats.learningStyleDistribution).map(([style, rawCount]) => {
                  const count = rawCount as number;
                  const vals = Object.values(stats.learningStyleDistribution) as number[];
                  const maxCount = Math.max(...vals);
                  const percentWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;
                  return (
                    <div key={style} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-600 dark:text-slate-300">{style} Learner</span>
                        <span className="text-slate-800 dark:text-white">{count} ({Math.round(percentWidth)}%)</span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${percentWidth}%` }}
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full transition-all duration-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. ACTIONS: ROSTER MANAGEMENT */}
      {activeTab === 'students' && (
        <div className="overflow-x-auto rounded-xl border border-slate-150 dark:border-slate-800/80">
          <table className="w-full text-left border-collapse bg-white/10">
            <thead>
              <tr className="bg-slate-100/50 dark:bg-slate-850 text-[10px] font-sans font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-150 dark:border-slate-800">
                <th className="p-3">Student Name / Email</th>
                <th className="p-3">Dept & Sem</th>
                <th className="p-3">Primary Style</th>
                <th className="p-3 font-mono">Streak Days</th>
                <th className="p-3">Type</th>
                <th className="p-3 text-right">Moderations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 dark:divide-slate-800 text-xs">
              {students.map((std) => (
                <tr key={std.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/30 text-slate-850 dark:text-slate-200">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <img
                        src={std.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${std.name}`}
                        alt={std.name}
                        className="w-8 h-8 rounded-full border border-blue-500/10 bg-slate-100"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <p className="font-semibold">{std.name}</p>
                        <p className="text-[10px] text-slate-400">{std.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 font-medium">
                    {std.department} • <span className="font-sans font-normal text-[11px] text-slate-500">{std.semester} Sem</span>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                      {std.learningStyle}
                    </span>
                  </td>
                  <td className="p-3 font-mono font-bold text-orange-600 dark:text-orange-400 text-sm">
                    {std.streakDays}d
                  </td>
                  <td className="p-3">
                    {std.isAdmin ? (
                      <span className="px-1.5 py-0.5 text-[9px] uppercase font-bold text-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-300 rounded border border-indigo-200/20">
                        Admin
                      </span>
                    ) : (
                      <span className="text-[9px] opacity-75">Student</span>
                    )}
                  </td>
                  <td className="p-3 text-right space-x-1">
                    {!std.isAdmin && (
                      <button
                        onClick={() => handlePromoteStudent(std.id)}
                        className="p-1 px-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-semibold text-[10px] rounded border border-blue-200/20 cursor-pointer"
                        title="Promote to admin user"
                      >
                        Promote
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteStudent(std.id)}
                      className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded cursor-pointer"
                      title="Delete profile"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 3. CONTROL STUDY GROUPS */}
      {activeTab === 'groups' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map((g) => (
            <div
              key={g.id}
              className="p-4 bg-white/50 dark:bg-slate-850 rounded-2xl border border-slate-150 dark:border-slate-800/80 flex justify-between items-start gap-3 hover:shadow-lg transition-all duration-300"
            >
              <div className="space-y-1">
                <span className="text-[9px] font-mono tracking-wider text-blue-600 dark:text-blue-400 font-bold uppercase p-1 bg-blue-100/40 dark:bg-blue-900/20 rounded">
                  {g.subject}
                </span>
                <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-100 pt-1 leading-tight">{g.name}</h4>
                <p className="text-[11px] text-slate-400 line-clamp-2 max-w-sm pt-1 leading-snug">{g.description}</p>
                <div className="flex items-center gap-2.5 text-[10px] text-slate-500 mt-2 font-medium">
                  <span>Semester: <strong>{g.semester}</strong></span>
                  <span>•</span>
                  <span>Members: <strong>{g.memberCount || g.members.length}</strong></span>
                </div>
              </div>
              <button
                onClick={() => handleDeleteGroup(g.id)}
                className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-900/10 dark:text-rose-400 dark:hover:bg-rose-900/30 rounded-lg cursor-pointer"
                title="Moderate / Delete study group"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {groups.length === 0 && (
            <p className="text-center text-slate-500 py-6 col-span-2">No active study groups listed.</p>
          )}
        </div>
      )}
    </div>
  );
}
