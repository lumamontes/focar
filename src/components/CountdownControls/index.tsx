
import { useStore } from '@nanostores/react';
import './styles.css';
import FocoImg from '../../assets/foco.png';
import PausaImg from '../../assets/pausa.png';
import PausaLongaImg from '../../assets/pausa-longa.png';
import LampImg from '../../assets/lampada.png';
import LampGif from '../../assets/selected-mode.gif';
import IniciarImg from '../../assets/iniciar.png';
import EncerradoImg from '../../assets/encerrado.png';
import AbandonarImg from '../../assets/abandonar.png';
import { 
  $mode, 
  $isActive, 
  $hasFinished,
  $completedFocusSessions,
  setMode,
  startCountdown,
  resetCountdown,
  nextMode
} from '../../stores/pomodoroStore';
import { ArrowRight, RotateCcw } from 'lucide-react';

export function CountdownControls({children}: {children: React.ReactNode}) {

  const modeState = useStore($mode);
  const isActive = useStore($isActive);
  const hasFinished = useStore($hasFinished);
  const completedSessions = useStore($completedFocusSessions);

  const buttons = [
    {
      img: FocoImg,
      alt: "Foco",
      mode: "focus"
    },
    {
      img: PausaImg,
      alt: "Pausa",
      mode: "break"
    },
    {
      img: PausaLongaImg,
      alt: "Pausa longa",
      mode: "longBreak"
    }
  ];

  const getModeInfo = () => {
    switch(modeState) {
      case 'focus':
        return { 
          className: 'countdown-focus', 
          title: 'Foco',
          description: `Sequência de foco: ${completedSessions + 1} 🦭`,
        };
      case 'break':
        return { 
          className: 'countdown-break', 
          title: 'Pausa Curta',
          description: 'Relaxe um pouquinho 🫡',
        };
      case 'longBreak':
        return { 
          className: 'countdown-long-break', 
          title: 'Pausa Longa',
          description: 'Tempo para descansar 😴',
        };
      default:
        return { className: '', title: '', description: '' };
    }
  };

  const getNextModeInfo = () => {
    const currentMode = modeState;
    const sessions = completedSessions;
    
    if (currentMode === 'focus') {
      const nextSessions = sessions + 1;
      // Every 4 focus sessions, take a long break
      if (nextSessions % 4 === 0) {
        return {
          mode: 'longBreak',
          title: 'Pausa Longa',
          emoji: '😴',
          description: 'hora de fazer uma pausa longa!'
        };
      } else {
        return {
          mode: 'break', 
          title: 'Pausa curta',
          emoji: '☕',
          description: 'relaxe um pouquinho'
        };
      }
    } else {
      // After any break, go back to focus
      return {
        mode: 'focus',
        title: 'Foco',
        emoji: '🦭',
        description: `próxima sessão de foco (#${sessions + 1})`
      };
    }
  };
  const modeInfo = getModeInfo();
  const nextModeInfo = getNextModeInfo();
  
  return (
    <section className={modeInfo.className}>
            <section className='controlsContainer'>
        {buttons.map(({ img, alt, mode }) => {
          return (
            <button
              key={mode}
              type='button'
              className={`countdownButton ${mode === modeState ? 'isFocused' : ''}`}
              onClick={() => setMode(mode as any)}
              disabled={isActive}
            >
              <img role='button' src={img.src} alt={alt} />
            </button>
          )
        })}
      </section>

      <div className="mode-info">
        <p>{modeInfo.description}</p>
      </div>

      <div>
        {children}
      </div>

      {/* Timer action buttons */}
      {
        hasFinished ? (
          <>
          <div className="finished-controls">
            <button 
              disabled
              className='countdownButton'>
                <img role='button' src={EncerradoImg.src} alt="Ciclo encerrado" />
            </button>
            <button 
              type='button'
              className='resetCountdown'
              onClick={resetCountdown}>
                <RotateCcw size={42}/>
            </button>
          </div>
           <button 
              type='button'
              className='nextMode'
              onClick={nextMode}>
                <div className="next-mode-content">
                  <div className="next-mode-header">
                    <span className="next-mode-emoji">{nextModeInfo.emoji}</span>
                    <span className="next-mode-title">Iniciar {nextModeInfo.title}</span>
                    <ArrowRight size={24}/>
                  </div>
                  <span className="next-mode-description">{nextModeInfo.description}</span>
                </div>
            </button>
          </>

        ) : (
          <>
          <div className="timer-controls">
            {
              isActive ? (
                <button
                  type='button'
                  className='countdownButton countdownButtonActive'
                  onClick={resetCountdown}
                >
                  <img role='button' src={AbandonarImg.src} alt="Abandonar ciclo" />
                </button>
              ) : (
                <button
                  type='button'
                  className='countdownButton'
                  onClick={startCountdown}
                >
                  <img role='button' src={IniciarImg.src} alt="Iniciar ciclo" />
                </button>
              )
            }
          </div>
           
          </>
        )
      }
    </section>
  )

}