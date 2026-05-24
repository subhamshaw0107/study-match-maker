import React, { useState } from 'react';
import { Calendar as CalendarIcon, Users, Clock, AlertCircle, Plus, Sparkles, Check } from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  groupName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  location: string; // 'Online Meet' or classroom
}

export function CalendarWidget({ currentGroupName }: { currentGroupName?: string }) {
  const [events, setEvents] = useState<CalendarEvent[]>([
    {
      id: 'e1',
      title: 'M1 Exam Mock Solution',
      groupName: 'Discrete Maths Doubts Crackers',
      date: new Date().toISOString().split('T')[0], // Today
      time: '11:00 AM',
      location: 'Online Classroom (Google Meet)'
    },
    {
      id: 'e2',
      title: 'Web Tech Lab Project Sync',
      groupName: 'JIS Web Dev Titans',
      date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // In 2 days
      time: '04:30 PM',
      location: 'Main Building Lab 3C'
    },
    {
      id: 'e3',
      title: 'Operating Systems Chapter 4 Doubts',
      groupName: 'JIS Web Dev Titans',
      date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // In 5 days
      time: '06:00 PM',
      location: 'Online Classroom (Slack Audio)'
    }
  ]);

  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventTime, setNewEventTime] = useState('04:00 PM');
  const [newEventLocation, setNewEventLocation] = useState('Online Classroom');
  const [eventAdded, setEventAdded] = useState(false);
  const [gSyncActive, setGSyncActive] = useState(false);

  const activeGroupEvents = currentGroupName 
    ? events.filter(e => e.groupName.toLowerCase() === currentGroupName.toLowerCase())
    : events;

  function handleAddMeeting() {
    if (!newEventTitle || !currentGroupName) return;

    const newEv: CalendarEvent = {
      id: 'e_' + Math.random().toString(36).substr(2, 9),
      title: newEventTitle,
      groupName: currentGroupName,
      date: new Date().toISOString().split('T')[0], // scheduled for today
      time: newEventTime,
      location: newEventLocation
    };

    setEvents([newEv, ...events]);
    setNewEventTitle('');
    setEventAdded(true);
    setTimeout(() => setEventAdded(false), 3000);
  }

  return (
    <div className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md rounded-2xl p-6 border border-white/40 dark:border-slate-800/40 shadow-xl">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="font-sans font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-600" />
            Study Meetups Calendar
          </h3>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-sans mt-0.5">
            Coordinated slots for university academic semesters
          </p>
        </div>
        <button
          onClick={() => {
            setGSyncActive(!gSyncActive);
          }}
          className={`text-[10px] px-2 py-1 rounded-md font-medium tracking-wide border transition-all duration-300 flex items-center gap-1 cursor-pointer ${
            gSyncActive
              ? 'bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/40'
              : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-350 dark:hover:bg-slate-750'
          }`}
        >
          {gSyncActive ? (
            <>
              <Check className="w-3 h-3 text-emerald-500" />
              Calendar Synced
            </>
          ) : (
            'Sync Google Cal'
          )}
        </button>
      </div>

      {currentGroupName && (
        <div className="mb-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl p-3 border border-blue-100/35 dark:border-blue-950/20">
          <p className="text-xs font-semibold text-slate-750 dark:text-slate-300 mb-2">
            ✏️ Schedule a new session for <strong className="text-blue-600 dark:text-blue-400">{currentGroupName}</strong>
          </p>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              placeholder="Topic (e.g., Doubts on Normal Forms)"
              value={newEventTitle}
              onChange={(e) => setNewEventTitle(e.target.value)}
              className="flex-1 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs px-3 py-1.5 rounded-lg border border-slate-250 dark:border-slate-800 focus:outline-none focus:border-blue-500 text-ellipsis overflow-hidden"
            />
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="04:30 PM"
                value={newEventTime}
                onChange={(e) => setNewEventTime(e.target.value)}
                className="w-20 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs px-2 py-1.5 rounded-lg border border-slate-250 dark:border-slate-800 focus:outline-none text-center"
              />
              <button
                onClick={handleAddMeeting}
                disabled={!newEventTitle}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium text-xs rounded-lg flex items-center gap-1 shadow-sm hover:shadow-md cursor-pointer transition-all duration-200"
              >
                <Plus className="w-3.5 h-3.5" />
                Schedule
              </button>
            </div>
          </div>
          {eventAdded && (
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
              ✓ Study slot published successfully to board!
            </p>
          )}
        </div>
      )}

      {activeGroupEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-6 text-center text-slate-450 dark:text-slate-500">
          <AlertCircle className="w-10 h-10 text-slate-300 dark:text-slate-700 stroke-1 mb-2" />
          <p className="text-xs font-sans">No events scheduled yet for this group.</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Use the scheduler above to add a meeting.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {activeGroupEvents.map((ev) => (
            <div
              key={ev.id}
              className="flex items-start gap-3 p-3 bg-slate-55 dark:bg-slate-850 hover:bg-slate-100/60 dark:hover:bg-slate-800/80 rounded-xl transition-all duration-200 border border-slate-100 dark:border-slate-800/60"
            >
              <div className="p-2 bg-blue-100/60 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                <Users className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-150 truncate leading-tight">
                  {ev.title}
                </p>
                <p className="text-[10px] text-blue-500 font-semibold truncate mt-0.5">
                  {ev.groupName}
                </p>
                <div className="flex items-center gap-2.5 text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                  <span className="flex items-center gap-1 font-mono font-medium">
                    <Clock className="w-3 h-3 text-slate-300" />
                    {ev.date} @ {ev.time}
                  </span>
                  <span>•</span>
                  <span className="truncate">{ev.location}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
