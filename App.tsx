
import React, { useState, useEffect, useMemo } from 'react';
import { GamePhase, GameState, Player } from './types';
import Lobby from './components/Lobby';
import GameScreen from './components/GameScreen';
import { generateScript } from './services/geminiService';

const App: React.FC = () => {
  const [peer, setPeer] = useState<any>(null);
  const [myRoomID, setMyRoomID] = useState('');
  const [gameState, setGameState] = useState<GameState>({
    roomID: '',
    isHostMode: true,
    players: [],
    genre: '',
    currentPhase: GamePhase.LOBBY,
    stage: 0,
    scriptTitle: '',
    openingText: '',
    sharedReadingText: '',
    dmAvatar: '',
    dmVoice: 'Kore',
    history: []
  });

  // 初始化 PeerJS
  useEffect(() => {
    // @ts-ignore
    const newPeer = new Peer();
    newPeer.on('open', (id: string) => {
      setPeer(newPeer);
      setMyRoomID(id);
      setGameState(prev => ({ ...prev, roomID: id }));
    });
    return () => newPeer.destroy();
  }, []);

  const handleJoinGame = (targetRoomID: string) => {
    if (!targetRoomID) return;
    setGameState(prev => ({
      ...prev,
      roomID: targetRoomID,
      isHostMode: false,
      currentPhase: GamePhase.JOINING
    }));
  };

  const handleStartGame = async (genre: string, players: Player[]) => {
    setGameState(prev => ({ 
      ...prev, 
      genre, 
      players, 
      currentPhase: GamePhase.GENERATING 
    }));

    try {
      const initializedState = await generateScript({ 
        ...gameState, 
        genre, 
        players 
      });
      setGameState(initializedState);
    } catch (error) {
      console.error("生成失败", error);
      alert("迷雾太浓，AI 迷路了。请重试。");
      setGameState(prev => ({ ...prev, currentPhase: GamePhase.LOBBY }));
    }
  };

  return (
    <main className="min-h-screen p-4 flex flex-col items-center justify-center bg-slate-950 text-slate-100 overflow-hidden relative">
      {/* 动态背景背景 */}
      <div className="fixed inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')]"></div>
      </div>

      <div className="w-full max-w-7xl z-10">
        {gameState.currentPhase === GamePhase.LOBBY && (
          <Lobby onStart={handleStartGame} roomID={myRoomID} onJoin={handleJoinGame} />
        )}

        {gameState.currentPhase === GamePhase.JOINING && (
          <div className="text-center glass-panel p-10 rounded-3xl">
            <h2 className="text-2xl font-mystical text-amber-500 mb-4 animate-pulse">正在进入公馆...</h2>
            <p className="text-xs text-slate-500 italic">连接至房间：{gameState.roomID}</p>
            {/* 这个状态下 GameScreen 的连接 useEffect 会触发 */}
            <GameScreen gameState={gameState} setGameState={setGameState} peer={peer} />
          </div>
        )}

        {gameState.currentPhase === GamePhase.GENERATING && (
          <div className="text-center p-12 glass-panel rounded-3xl animate-pulse">
            <h2 className="text-2xl font-mystical text-amber-400 mb-4">AI 正在编织独家剧本...</h2>
            <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        )}

        {(gameState.currentPhase === GamePhase.INTRO || 
          gameState.currentPhase === GamePhase.GAME_LOOP) && (
          <GameScreen gameState={gameState} setGameState={setGameState} peer={peer} />
        )}
      </div>

      <div className="fixed bottom-4 left-4 text-[8px] text-slate-700 font-mono">
        SESSION_ID: {myRoomID} | MODE: {gameState.isHostMode ? 'HOST' : 'GUEST'}
      </div>
    </main>
  );
};

export default App;
