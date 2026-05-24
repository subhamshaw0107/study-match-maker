import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Flame, CheckCircle2, Award } from 'lucide-react';

interface PomodoroProps {
  token: string | null;
  onStreakUpdate: (newStreak: number) => void;
}

export function PomodoroTimer({ token, onStreakUpdate }: PomodoroProps) {
  const [mode, setMode] = useState<'work' | 'shortBreak' | 'longBreak'>('work');
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [isStreakCheckingIn, setIsStreakCheckingIn] = useState(false);
  const [streakSuccessMessage, setStreakSuccessMessage] = useState('');

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const presets = {
    work: 25 * 60,
    shortBreak: 5 * 60,
    longBreak: 15 * 60,
  };

  useEffect(() => {
    setSecondsLeft(presets[mode]);
    setIsRunning(false);
  }, [mode]);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsRunning(false);
            playSuccessSound();
            handleCycleCompletion();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, mode]);

  // Audio synther using Web Audio API (highly reliable, no audio imports)
  function playSuccessSound() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      // Arpeggiated C major chime (C5 -> E5 -> G5)
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.12); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.24); // G5
      osc.frequency.setValueAtTime(1046.50, now + 0.36); // C6
      
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.82);
      
      osc.start(now);
      osc.stop(now + 0.85);
    } catch (e) {
      console.warn('Synth beep failed: ', e);
    }
  }

  async function handleCycleCompletion() {
    if (mode === 'work') {
      setCompletedSessions((prev) => prev + 1);
      // Trigger API to increment study streak check-in
      if (token) {
        setIsStreakCheckingIn(true);
        try {
          const res = await fetch('/api/users/streak-checkin', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });
          const data = await res.json();
          if (res.ok && data.user) {
            onStreakUpdate(data.user.streakDays);
            setStreakSuccessMessage('Daily Study session logged! Your JIS Streak has increased! 🔥');
            setTimeout(() => setStreakSuccessMessage(''), 5000);
          }
        } catch (err) {
          console.error('Streak update failed:', err);
        } finally {
          setIsStreakCheckingIn(false);
        }
      } else {
        setStreakSuccessMessage('Excellent work! Log in to save streak progress! 🎓');
        setTimeout(() => setStreakSuccessMessage(''), 4000);
      }
    }
    // Toggle next reasonable mode
    if (mode === 'work') {
      if ((completedSessions + 1) % 4 === 0) {
        setMode('longBreak');
      } else {
        setMode('shortBreak');
      }
    } else {
      setMode('work');
    }
  }

  function toggleTimer() {
    setIsRunning(!isRunning);
  }

  function resetTimer() {
    setIsRunning(false);
    setSecondsLeft(presets[mode]);
  }

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${rSecs.toString().padStart(2, '0')}`;
  };

  const progressPercent = ((presets[mode] - secondsLeft) / presets[mode]) * 100;

  return (
    <div className="relative bg-white/75 dark:bg-slate-900/75 backdrop-blur-md rounded-2xl p-6 border border-white/40 dark:border-slate-800/40 shadow-xl transition-all duration-300 hover:shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-sans font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500 animate-pulse" />
          Focus Pomodoro
        </h3>
        <div className="flex gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg">
          {(['work', 'shortBreak', 'longBreak'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setMode(t)}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all duration-200 ${
                mode === t
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              {t === 'work' ? 'Study' : t === 'shortBreak' ? 'Short' : 'Long'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center justify-center py-6">
        <div className="relative w-44 h-44 flex items-center justify-center">
          {/* Circular progress bar SVG */}
          <svg className="absolute w-full h-full transform -rotate-90">
            <circle
              cx="88"
              cy="88"
              r="76"
              stroke="rgba(59, 130, 246, 0.12)"
              strokeWidth="6"
              fill="transparent"
            />
            <circle
              cx="88"
              cy="88"
              r="76"
              stroke="#3b82f6"
              strokeWidth="7"
              fill="transparent"
              strokeDasharray={`${2 * Math.PI * 76}`}
              strokeDashoffset={`${2 * Math.PI * 76 * (1 - progressPercent / 100)}`}
              strokeLinecap="round"
              className="transition-all duration-500 ease-linear"
            />
          </svg>

          {/* Time digits */}
          <div className="text-center z-10">
            <span className="text-4xl font-mono font-bold text-slate-800 dark:text-white tracking-widest">
              {formatTime(secondsLeft)}
            </span>
            <p className="text-[10px] font-sans font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-1">
              {mode === 'work' ? 'Deep Session' : 'Recharging'}
            </p>
          </div>
        </div>

        <div className="flex gap-4 mt-6 z-10">
          <button
            onClick={toggleTimer}
            className={`p-3 rounded-full flex items-center justify-center shadow-md transition-all duration-200 cursor-pointer ${
              isRunning
                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isRunning ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
          </button>
          <button
            onClick={resetTimer}
            className="p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-300 rounded-full transition-all duration-200 cursor-pointer"
            title="Reset"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {streakSuccessMessage && (
        <div className="mt-3 p-2 text-center text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg animate-bounce border border-emerald-100 dark:border-emerald-800">
          {streakSuccessMessage}
        </div>
      )}

      {completedSessions > 0 && (
        <div className="mt-2 text-center flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <Award className="w-4 h-4 text-yellow-500" />
          <span>Sessions Completed Today: <strong>{completedSessions}</strong></span>
        </div>
      )}
    </div>
  );
}
