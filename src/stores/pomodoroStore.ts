import { atom, computed } from 'nanostores';
import { celebrate } from '../utils/celebration';

export type PomodoroMode = 'focus' | 'break' | 'longBreak';

const MODE_DURATIONS = {
  focus: 25 * 60,    // 25 minutes
  break: 5 * 60,       // 5 minutes
  longBreak: 15 * 60,  // 15 minutes
} as const;

export const $mode = atom<PomodoroMode>('focus');

export const $time = atom<number>(MODE_DURATIONS.focus);
export const $isActive = atom(false);
export const $hasFinished = atom(false);

export const $minutes = computed($time, (time) => Math.floor(time / 60));
export const $seconds = computed($time, (time) => time % 60);

export const $currentModeDuration = computed($mode, (mode) => MODE_DURATIONS[mode]);

export const $completedFocusSessions = atom(0);

let countdownTimeout: NodeJS.Timeout;
let startTimestamp: number | null = null;
let initialDuration: number = 0;
let timerWorker: Worker | null = null;
let workerSupported = false;

// Storage keys
const STORAGE_KEYS = {
  START_TIMESTAMP: 'pomodoro-start-timestamp',
  INITIAL_DURATION: 'pomodoro-initial-duration',
  MODE: 'pomodoro-mode',
  IS_ACTIVE: 'pomodoro-is-active',
  COMPLETED_SESSIONS: 'pomodoro-completed-sessions',
} as const;

// Utility functions for localStorage
function saveToStorage(key: string, value: any) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('Failed to save to localStorage:', error);
  }
}

function loadFromStorage(key: string, defaultValue: any = null) {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.warn('Failed to load from localStorage:', error);
    return defaultValue;
  }
}

function clearStorage() {
  if (typeof window === 'undefined') return;
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.warn('Failed to clear localStorage:', error);
  }
}

// Initialize Web Worker
function initializeWorker() {
  if (typeof Worker !== 'undefined') {
    try {
      timerWorker = new Worker('/timer-worker.js');
      workerSupported = true;
      
      timerWorker.onmessage = (e) => {
        const { type, payload } = e.data;
        
        switch (type) {
          case 'TIMER_TICK':
            $time.set(payload.remainingSeconds);
            break;
            
          case 'TIMER_FINISHED':
            $time.set(0);
            $hasFinished.set(true);
            $isActive.set(false);
            clearStorage();
            celebrate();
            break;
            
          case 'TIMER_STOPPED':
            // Worker confirmou que parou
            break;
            
          case 'HEARTBEAT':
            // Worker está vivo
            break;
            
          case 'PONG':
            break;
        }
      };
      
      timerWorker.onerror = (error) => {
        console.error('Timer worker error:', error);
        workerSupported = false;
        timerWorker = null;
      };
      
    } catch (error) {
      console.warn('Failed to initialize timer worker:', error);
      workerSupported = false;
      timerWorker = null;
    }
  }
}

// Calculate remaining time based on timestamp (fallback)
function calculateRemainingTime(): number {
  if (!startTimestamp || !initialDuration) return 0;
  
  const elapsed = Math.floor((Date.now() - startTimestamp) / 1000);
  const remaining = Math.max(0, initialDuration - elapsed);
  return remaining;
}

// Update timer display
function updateTimerDisplay() {
  if (!$isActive.get()) return;
  
  const remaining = calculateRemainingTime();
  $time.set(remaining);
  
  if (remaining <= 0) {
    // Timer finished - celebrate!
    celebrate();
    $hasFinished.set(true);
    $isActive.set(false);
    clearStorage();
    return;
  }
  
  // Continue updating
  countdownTimeout = setTimeout(updateTimerDisplay, 1000);
}

export function startCountdown() {
  
  initialDuration = $time.get();
  
  saveToStorage(STORAGE_KEYS.START_TIMESTAMP, startTimestamp);
  saveToStorage(STORAGE_KEYS.INITIAL_DURATION, initialDuration);
  saveToStorage(STORAGE_KEYS.MODE, $mode.get());
  saveToStorage(STORAGE_KEYS.IS_ACTIVE, true);
  saveToStorage(STORAGE_KEYS.COMPLETED_SESSIONS, $completedFocusSessions.get());
  
  $isActive.set(true);
  
  if (workerSupported && timerWorker) {
    timerWorker.postMessage({
      type: 'START_TIMER',
      payload: { duration: initialDuration }
    });
  } else {
    updateTimerDisplay();
  }
}

export function resetCountdown() {
  clearTimeout(countdownTimeout);
  startTimestamp = null;
  initialDuration = 0;
  clearStorage();
  
  // Stop Web Worker if active
  if (workerSupported && timerWorker) {
    timerWorker.postMessage({ type: 'STOP_TIMER' });
  }
  
  $isActive.set(false);
  $hasFinished.set(false);
  // Reset time to current mode duration
  $time.set($currentModeDuration.get());
}

export function setMode(newMode: PomodoroMode) {
  clearTimeout(countdownTimeout);
  startTimestamp = null;
  initialDuration = 0;
  clearStorage();
  
  if (workerSupported && timerWorker) {
    timerWorker.postMessage({ type: 'STOP_TIMER' });
  }
  
  $isActive.set(false);
  $hasFinished.set(false);
  
  $mode.set(newMode);
  $time.set(MODE_DURATIONS[newMode]);
}

export function initializeFromStorage() {
  if (typeof window !== 'undefined') {
    initializeWorker();
  }
  
  const savedMode = loadFromStorage(STORAGE_KEYS.MODE);
  const savedIsActive = loadFromStorage(STORAGE_KEYS.IS_ACTIVE);
  const savedStartTimestamp = loadFromStorage(STORAGE_KEYS.START_TIMESTAMP);
  const savedInitialDuration = loadFromStorage(STORAGE_KEYS.INITIAL_DURATION);
  const savedCompletedSessions = loadFromStorage(STORAGE_KEYS.COMPLETED_SESSIONS, 0);
  
  $completedFocusSessions.set(savedCompletedSessions);
  
  if (savedIsActive && savedStartTimestamp && savedInitialDuration) {
    startTimestamp = savedStartTimestamp;
    initialDuration = savedInitialDuration;
    
    if (savedMode && (savedMode === 'focus' || savedMode === 'break' || savedMode === 'longBreak')) {
      $mode.set(savedMode as PomodoroMode);
    }
    
    const remaining = calculateRemainingTime();
    
    if (remaining > 0) {
      $time.set(remaining);
      $isActive.set(true);
      
      if (workerSupported && timerWorker) {
        timerWorker.postMessage({
          type: 'START_TIMER',
          payload: { duration: remaining }
        });
      } else {
        updateTimerDisplay();
      }
    } else {
      $time.set(0);
      $hasFinished.set(true);
      $isActive.set(false);
      clearStorage();
      celebrate();
    }
  } else {
    if (savedMode && (savedMode === 'focus' || savedMode === 'break' || savedMode === 'longBreak')) {
      $mode.set(savedMode as PomodoroMode);
      $time.set(MODE_DURATIONS[savedMode as PomodoroMode]);
    }
  }
}

export function handleVisibilityChange() {
  if (!document.hidden && $isActive.get()) {
    if (workerSupported && timerWorker) {
      timerWorker.postMessage({ type: 'GET_STATUS' });
    } else {
      const remaining = calculateRemainingTime();
      $time.set(remaining);
      
      if (remaining <= 0) {
        celebrate();
        $hasFinished.set(true);
        $isActive.set(false);
        clearStorage();
      }
    }
  }
}

export function nextMode() {
  const currentMode = $mode.get();
  const completedSessions = $completedFocusSessions.get();
  
  if (currentMode === 'focus') {
    const newCompletedSessions = completedSessions + 1;
    $completedFocusSessions.set(newCompletedSessions);
    
    if (newCompletedSessions % 4 === 0) {
      setMode('longBreak');
    } else {
      setMode('break');
    }
  } else {
    setMode('focus');
  }
}

let isInitialized = false;

export function initializeStore() {
  if (isInitialized || typeof window === 'undefined') return;
  
  isInitialized = true;
  initializeFromStorage();
  
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  window.addEventListener('beforeunload', () => {
    if ($isActive.get()) {
      saveToStorage(STORAGE_KEYS.START_TIMESTAMP, startTimestamp);
      saveToStorage(STORAGE_KEYS.INITIAL_DURATION, initialDuration);
      saveToStorage(STORAGE_KEYS.MODE, $mode.get());
      saveToStorage(STORAGE_KEYS.IS_ACTIVE, true);
      saveToStorage(STORAGE_KEYS.COMPLETED_SESSIONS, $completedFocusSessions.get());
    }
  });
}
