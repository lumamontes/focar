import confetti from 'canvas-confetti';

let finishAudio: HTMLAudioElement | null = null;

export function initializeCelebration() {
  try {
    finishAudio = new Audio('/assets/sounds/finish.mp3');
    finishAudio.preload = 'auto';
  } catch (error) {
    console.warn('Could not load finish sound:', error);
  }
}

export function playFinishSound() {
  if (finishAudio) {
    try {
      finishAudio.currentTime = 0; // Reset to beginning
      finishAudio.play().catch((error) => {
        console.warn('Could not play finish sound:', error);
      });
    } catch (error) {
      console.warn('Error playing finish sound:', error);
    }
  }
}

export function triggerConfetti() {
  const count = 200;
  const defaults = {
    origin: { y: 0.7 }
  };

  function fire(particleRatio: number, opts: any) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio)
    });
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
  });
}

export function celebrate() {
  // Play sound and show confetti
  playFinishSound();
  triggerConfetti();
  
  console.log('🎉 Session completed! Great job!');
}
