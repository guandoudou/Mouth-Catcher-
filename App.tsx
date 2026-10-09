import React, { useState, useEffect } from 'react';
import FaceGame from './components/FaceGame';
import { GameState } from './types';
import { generateEncouragement } from './services/geminiService';
import { initAudio } from './utils/audio';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.LOADING_MODEL);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [aiMessage, setAiMessage] = useState<string>("");
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  const handleGameEnd = async () => {
    setGameState(GameState.GAME_OVER);
    setIsLoadingAi(true);
    // Fetch AI feedback
    const message = await generateEncouragement(score);
    setAiMessage(message);
    setIsLoadingAi(false);
  };

  const startGame = () => {
    initAudio(); // Initialize audio context on user interaction
    setGameState(GameState.PLAYING);
    setScore(0);
    setTimeLeft(30);
    setAiMessage("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col items-center p-4 relative">
      
      {/* Top Left Score Display */}
      <div className="absolute top-6 left-6 z-50 bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/20 shadow-xl flex items-center gap-4 transition-transform hover:scale-105">
        <div className="text-4xl filter drop-shadow-md">🏆</div>
        <div className="flex flex-col">
           <span className="text-[10px] uppercase text-gray-300 font-bold tracking-wider mb-1">Total Score</span>
           <span className="text-yellow-400 text-4xl font-black leading-none drop-shadow-lg">{score}</span>
        </div>
      </div>

      {/* Header - Adjusted width to 55vw to fit standard laptop screens vertically */}
      <header className="w-full max-w-[55vw] flex justify-between items-center mb-6 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
        <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-blue-500">
          🤖 AI Mouth Catcher
        </h1>
        <div className="flex gap-6 text-xl font-bold">
          {/* Removed duplicate score from header since it's now in top-left, keeping Time */}
          <div className="flex flex-col items-center w-24">
            <span className="text-xs uppercase text-gray-300">Time</span>
            <span className={`${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-cyan-400'} text-3xl`}>
              {Math.ceil(timeLeft)}s
            </span>
          </div>
        </div>
      </header>

      {/* Main Game Area - Adjusted width to 55vw */}
      <div className="relative w-full max-w-[55vw]">
        <FaceGame 
          gameState={gameState} 
          setGameState={setGameState}
          onScoreUpdate={setScore}
          onTimeUpdate={setTimeLeft}
          onGameEnd={handleGameEnd}
        />

        {/* Intro Overlay */}
        {gameState === GameState.INTRO && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center rounded-3xl z-40 p-8 text-center">
            <h2 className="text-4xl font-bold mb-4 text-white drop-shadow-lg">Ready to Eat? 🍎</h2>
            <p className="text-lg text-gray-200 mb-6 max-w-lg">
              Use your webcam. Move your mouth to catch the falling food!
              <br/>
              Open your mouth wide!
            </p>
            <button 
              onClick={startGame}
              className="px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xl rounded-full shadow-lg transform transition hover:scale-105 active:scale-95"
            >
              START GAME ▶
            </button>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameState === GameState.GAME_OVER && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center rounded-3xl z-40 p-8 text-center animate-fadeIn">
            <h2 className="text-5xl font-bold mb-2 text-yellow-400 drop-shadow-lg">TIME'S UP!</h2>
            <div className="text-7xl font-black text-white mb-4 drop-shadow-2xl">{score} <span className="text-2xl text-gray-400 font-normal">pts</span></div>
            
            <div className="bg-white/10 p-4 rounded-2xl max-w-md w-full mb-6 border border-white/20 min-h-[100px] flex items-center justify-center">
              {isLoadingAi ? (
                <div className="flex flex-col items-center gap-2">
                   <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                   <span className="text-blue-300 text-xs">Asking the AI Judge...</span>
                </div>
              ) : (
                <p className="text-lg md:text-xl text-cyan-300 italic font-medium leading-relaxed">
                  "{aiMessage}"
                </p>
              )}
            </div>

            <button 
              onClick={startGame}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-bold text-lg rounded-full shadow-lg transform transition hover:scale-105"
            >
              PLAY AGAIN 🔄
            </button>
          </div>
        )}
      </div>

      <footer className="mt-4 text-gray-400 text-xs text-center">
        Powered by <span className="text-blue-400 font-semibold">Gemini</span> & <span className="text-teal-400 font-semibold">MediaPipe</span>
        <br/>
        Made for the Science Fair 🧪
      </footer>
    </div>
  );
};

export default App;