
import React, { useState, useEffect } from 'react';
import { GamePhase, GameState, Player } from './types';
import Lobby from './components/Lobby';
import GameScreen from './components/GameScreen';
import { generateScript } from './services/geminiService';

const App: React.FC = () => {
  const [peer, setPeer] = useState<any>(null);
  const [myRoomID, setMyRoomID] = useState('');
  const [errorInfo, setErrorInfo] = useState<string | null>(null);
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

  useEffect(() => {
    // @ts-ignore
    const newPeer = new Peer();
    newPeer.on('open', (id: string) => {
      setPeer(newPeer);
      setMyRoomID(id);
      setGameState(prev => ({ ...prev, roomID: id }));
    });
    newPeer.on('error', (err: any) => {
      console.error('P2P 连接错误:', err);
      setErrorInfo('通信频道建立失败');
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
    setErrorInfo(null);
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
    } catch (error: any) {
      console.error("剧本生成失败详细信息:", error);
      let msg = "生成失败：AI 暂时无法响应";
      
      if (error.message === "API_KEY_MISSING") {
        msg = "未发现 API Key。请在 Vercel 中设置 API_KEY 并 Redeploy。";
      } else if (error.message === "INVALID_AI_RESPONSE") {
        msg = "AI 返回了无法解析的剧本，请重试。";
      } else if (error.message?.includes("403")) {
        msg = "API Key 权限不足（请确认是否开启了 Gemini 3 权限）。";
      } else if (error.message?.includes("429")) {
        msg = "请求过于频繁，请稍后再试。";
      }
      
      setErrorInfo(msg);
      alert(msg);
      setGameState(prev => ({ ...prev, currentPhase: GamePhase.LOBBY }));
    }
  };

  return (
    <main className="min-h-screen p-4 flex flex-col items-center justify-center bg-slate-950 text-slate-100 overflow-hidden relative">
      <div className="fixed inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')]"></div>
      </div>

      <div className="w-full max-w-7xl z-10">
        {gameState.currentPhase === GamePhase.LOBBY && (
          <Lobby onStart={handleStartGame} roomID={myRoomID} onJoin={handleJoinGame} />
        )}

        {(gameState.currentPhase === GamePhase.JOINING || 
          gameState.currentPhase === GamePhase.INTRO || 
          gameState.currentPhase === GamePhase.GAME_LOOP) && (
          <GameScreen gameState={gameState} setGameState={setGameState} peer={peer} />
        )}

        {gameState.currentPhase === GamePhase.GENERATING && (
          <div className="text-center p-12 glass-panel rounded-3xl border border-amber-500/20">
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 border-4 border-amber-500/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h2 className="text-2xl font-mystical text-amber-400 mb-4">正在推演因果，编织命途...</h2>
            <p className="text-sm text-slate-500 italic">正在为您创作专属剧本，这可能需要几秒钟</p>
          </div>
        )}
      </div>

      <div className="fixed bottom-4 left-4 flex gap-4 text-[8px] text-slate-700 font-mono">
        <span>SESSION: {myRoomID || 'CONNECTING...'}</span>
        <span>ROLE: {gameState.isHostMode ? 'HOST' : 'GUEST'}</span>
        {errorInfo && <span className="text-red-900 font-bold uppercase underline">ERROR: {errorInfo}</span>}
      </div>
    </main>
  );
};

export default App;
