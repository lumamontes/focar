import { atom } from "nanostores";

export const $mode = atom('focus'); // 'focus', 'break', 'longBreak' 

export function setMode(newMode: 'focus' | 'break' | 'longBreak') {
  console.log('changing mode to:', newMode);
  $mode.set(newMode);
};