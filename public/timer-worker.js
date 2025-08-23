// Web Worker para manter o timer funcionando em background
// Este worker roda independentemente do estado da aba principal

let timerId = null;
let startTime = null;
let duration = null;
let isRunning = false;

self.onmessage = function(e) {
  const { type, payload } = e.data;
  
  switch (type) {
    case 'START_TIMER':
      startTimer(payload.duration);
      break;
      
    case 'STOP_TIMER':
      stopTimer();
      break;
      
    case 'GET_STATUS':
      sendStatus();
      break;
      
    case 'PING':
      // Responder para verificar se worker está vivo
      self.postMessage({ type: 'PONG' });
      break;
  }
};

function startTimer(timerDuration) {
  // Limpar timer anterior se existir
  if (timerId) {
    clearInterval(timerId);
  }
  
  startTime = Date.now();
  duration = timerDuration * 1000; // converter para milliseconds
  isRunning = true;
  
  // Enviar status inicial
  sendStatus();
  
  // Atualizar a cada segundo
  timerId = setInterval(() => {
    if (isRunning) {
      sendStatus();
    }
  }, 1000);
}

function stopTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  isRunning = false;
  startTime = null;
  duration = null;
  
  self.postMessage({ 
    type: 'TIMER_STOPPED'
  });
}

function sendStatus() {
  if (!isRunning || !startTime || !duration) {
    return;
  }
  
  const elapsed = Date.now() - startTime;
  const remaining = Math.max(0, duration - elapsed);
  const remainingSeconds = Math.ceil(remaining / 1000);
  
  if (remaining <= 0) {
    // Timer finished
    stopTimer();
    self.postMessage({ 
      type: 'TIMER_FINISHED',
      payload: { remainingSeconds: 0 }
    });
  } else {
    // Timer still running
    self.postMessage({ 
      type: 'TIMER_TICK',
      payload: { remainingSeconds }
    });
  }
}

// Manter o worker ativo enviando heartbeat
setInterval(() => {
  if (isRunning) {
    self.postMessage({ type: 'HEARTBEAT' });
  }
}, 30000); // a cada 30 segundos
