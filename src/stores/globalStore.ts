import { atom } from "nanostores";

export const $mode = atom('focus'); // 'focus', 'break', 'longBreak' 

export function setMode(newMode: 'focus' | 'break' | 'longBreak') {
  $mode.set(newMode);
};