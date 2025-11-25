import React, { useState, useEffect } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { generateMissionBriefing } from './services/geminiService';
import { GameStatus, MissionData } from './types';

export default function App() {
  const [status, setStatus] = useState<GameStatus>(GameStatus.MENU);
  const [score, setScore] = useState(0);
  const [mission, setMission] = useState<MissionData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const startGame = async () => {
    setIsLoading(true);
    setStatus(GameStatus.BRIEFING);
    try {
      const data = await generateMissionBriefing();
      setMission(data);
      // Wait a moment for user to read, or let them click start
    } catch (e) {
      console.error(e);
      setMission({
        codename: "ALPHA PROTOCOL",
        objective: "Survive the onslaught.",
        intel: "Communications down."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBriefingAccept = () => {
    setStatus(GameStatus.PLAYING);
  };

  const handleGameOver = (finalScore: number) => {
    setScore(finalScore);
    setStatus(GameStatus.GAME_OVER);
  };

  const resetGame = () => {
    setStatus(GameStatus.MENU);
    setMission(null);
  };

  return (
    <div className="w-full h-screen bg-slate-950 text-white relative overflow-hidden font-sans select-none">
      <div className="scanlines"></div>

      {status === GameStatus.MENU && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          <h1 className="text-6xl md:text-8xl text-transparent bg-clip-text bg-gradient-to-b from-blue-400 to-blue-700 font-black tracking-tighter mb-4 retro-font drop-shadow-[0_0_15px_rgba(59,130,246,0.5)] text-center">
            GEMINI<br/>COMMANDO
          </h1>
          <p className="text-blue-300/60 tracking-[0.5em] mb-12 text-sm md:text-base font-bold">TACTICAL COMBAT SIMULATION</p>
          
          <button 
            onClick={startGame}
            className="group relative px-8 py-4 bg-slate-800 border-2 border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white transition-all duration-300 font-bold tracking-widest uppercase retro-font text-sm md:text-lg"
          >
            <span className="absolute inset-0 w-full h-full bg-blue-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></span>
            Initialize Mission
          </button>
          
          <div className="mt-16 text-xs text-slate-600 font-mono">
            POWERED BY GOOGLE GEMINI 2.5
          </div>
        </div>
      )}

      {status === GameStatus.BRIEFING && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/95 backdrop-blur-sm p-8">
          <div className="max-w-2xl w-full border border-blue-900 bg-slate-950/80 p-8 shadow-2xl relative overflow-hidden">
            {/* Decor */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-pulse"></div>
            
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-blue-400 font-mono animate-pulse">DECRYPTING MISSION DATA...</p>
              </div>
            ) : (
              <div className="space-y-6">
                 <div className="flex justify-between items-end border-b border-blue-900 pb-2">
                    <h2 className="text-2xl text-yellow-400 retro-font">TOP SECRET</h2>
                    <span className="text-blue-500 font-mono text-sm">{new Date().toLocaleDateString()}</span>
                 </div>
                 
                 <div className="space-y-4 font-mono text-lg">
                    <div>
                        <span className="text-slate-500 block text-xs tracking-widest uppercase">Codename</span>
                        <p className="text-white text-xl font-bold tracking-wide">{mission?.codename}</p>
                    </div>
                    <div>
                        <span className="text-slate-500 block text-xs tracking-widest uppercase">Objective</span>
                        <p className="text-emerald-400 leading-relaxed">{mission?.objective}</p>
                    </div>
                    <div>
                        <span className="text-slate-500 block text-xs tracking-widest uppercase">Intel</span>
                        <p className="text-red-400 italic">{mission?.intel}</p>
                    </div>
                 </div>

                 <div className="pt-8 flex justify-center">
                    <button 
                        onClick={handleBriefingAccept}
                        className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold tracking-widest uppercase retro-font text-xs shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] transition-all"
                    >
                        Accept Mission
                    </button>
                 </div>
              </div>
            )}
          </div>
        </div>
      )}

      {status === GameStatus.GAME_OVER && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md">
           <h2 className="text-6xl text-red-600 retro-font mb-4 animate-bounce">MISSION FAILED</h2>
           <p className="text-white font-mono text-xl mb-8">FINAL SCORE: <span className="text-yellow-400">{score}</span></p>
           
           <button 
            onClick={resetGame}
            className="px-6 py-3 border border-white hover:bg-white hover:text-black transition-colors font-bold uppercase retro-font text-sm"
           >
            Return to Base
           </button>
        </div>
      )}

      {/* The Game Layer - always mounted but active state controls render loop */}
      <GameCanvas onGameOver={handleGameOver} gameStatus={status} />
    </div>
  );
}