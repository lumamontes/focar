import { atom, computed } from 'nanostores';
import { celebrate } from '../utils/celebration';

// Types
export type PomodoroMode = 'focus' | 'break' | 'longBreak';

// Mode durations (in seconds)
const MODE_DURATIONS = {
  focus: 25 * 60,    // 25 minutes
  break: 5 * 60,       // 5 minutes
  longBreak: 15 * 60,  // 15 minutes
} as const;

// Current mode
export const $mode = atom<PomodoroMode>('focus');

// Timer state
export const $time = atom<number>(MODE_DURATIONS.focus);
export const $isActive = atom(false);
export const $hasFinished = atom(false);

// Computed values
export const $minutes = computed($time, (time) => Math.floor(time / 60));
export const $seconds = computed($time, (time) => time % 60);

// Current mode duration
export const $currentModeDuration = computed($mode, (mode) => MODE_DURATIONS[mode]);

// Session tracking
export const $completedFocusSessions = atom(0);

let countdownTimeout: NodeJS.Timeout;

export function startCountdown() {
  console.log('Iniciando contagem regressiva para:', $mode.get());
  $isActive.set(true);
}

export function resetCountdown() {
  clearTimeout(countdownTimeout);
  $isActive.set(false);
  $hasFinished.set(false);
  // Reset time to current mode duration
  $time.set($currentModeDuration.get());
}

export function setMode(newMode: PomodoroMode) {
  console.log('Changing mode to:', newMode);
  
  // Stop current timer
  clearTimeout(countdownTimeout);
  $isActive.set(false);
  $hasFinished.set(false);
  
  // Set new mode and reset time
  $mode.set(newMode);
  $time.set(MODE_DURATIONS[newMode]);
}

export function nextMode() {
  const currentMode = $mode.get();
  const completedSessions = $completedFocusSessions.get();
  
  if (currentMode === 'focus') {
    const newCompletedSessions = completedSessions + 1;
    $completedFocusSessions.set(newCompletedSessions);
    
    // Every 4 focus sessions, take a long break
    if (newCompletedSessions % 4 === 0) {
      setMode('longBreak');
    } else {
      setMode('break');
    }
  } else {
    // After any break, go back to focus
    setMode('focus');
  }
}

// Subscribe to timer changes
$isActive.subscribe((isActive) => {
  if (isActive) {
    const runTimer = () => {
      const currentTime = $time.get();
      if (currentTime > 0) {
        countdownTimeout = setTimeout(() => {
          $time.set(currentTime - 1);
          runTimer();
        }, 1000);
      } else {
        // Timer finished - celebrate!
        celebrate();
        $hasFinished.set(true);
        $isActive.set(false);
      }
    };
    runTimer();
  } else {
    clearTimeout(countdownTimeout);
  }
});
