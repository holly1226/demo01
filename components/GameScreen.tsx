
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GameState, GamePhase, Choice, Player } from '../types';
import { processTurn, speakText } from '../services/geminiService';

interface GameScreenProps {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  peer: any; // PeerJS 实例
}

const GameScreen: React.FC<GameScreenProps> = ({ gameState, setGameState, peer }) => {
  const [timer, setTimer] = useState(30);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [connections, setConnections] = useState<any[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 初始化 P2P 连接逻辑
  useEffect(() => {
    if (gameState.isHostMode) {
      // 房主：监听他人加入
      peer.on('connection', (conn: any) => {
        setConnections(prev => [...prev, conn]);
        conn.on('open', () => {
          // 发送当前全局状态给新加入的人
          conn.send({ type: 'SYNC_STATE', payload: gameState });
        });
        conn.on('data', (data: any) => {
          if (data.type === 'PLAYER_ACTION') {
            handleChoice(data.payload.choiceId, data.payload.playerIndex);
          }
        });
      });
    } else {
      // 客端：监听房主同步过来的状态
      const conn = peer.connect(gameState.roomID);
      conn.on('data', (data: any) => {
        if (data.type === 'SYNC_STATE') {
          setGameState(data.payload);
        }
        if (data.type === 'UPDATE_TURN') {
           setActivePlayerIndex(data.payload.index);
           setTimer(30);
        }
        if (data.type === 'DM_SPEAK') {
           speakText(data.payload.text, data.payload.voice);
        }
      });
      setConnections([conn]);
    }
  }, []);

  // 房主专用：广播状态给所有客端
  const broadcast = (type: string, payload: any) => {
    connections.forEach(conn => {
      if (conn.open) {
        conn.send({ type, payload });
      }
    });
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameState.history]);

  useEffect(() => {
    if (gameState.currentPhase === GamePhase.INTRO && gameState.isHostMode) {
      handleInitialSequence();
    }
  }, [gameState.currentPhase]);

  const handleInitialSequence = async () => {
    const text = gameState.openingText;
    setGameState(prev => ({
      ...prev,
      history: [...prev.history, { sender: 'DM', text }]
    }));
    broadcast('DM_SPEAK', { text, voice: gameState.dmVoice });
    await speakText(text, gameState.dmVoice);
    
    setTimeout(() => {
       const nextState = { ...gameState, currentPhase: GamePhase.GAME_LOOP };
       setGameState(nextState);
       broadcast('SYNC_STATE', nextState);
    }, 5000);
  };

  useEffect(() => {
    if (gameState.currentPhase === GamePhase.GAME_LOOP && !isProcessing) {
      const interval = setInterval(() => {
        setTimer((t) => {
          if (t <= 1) {
            if (gameState.isHostMode) handleChoice('E', activePlayerIndex);
            return 30;
          }
          return t - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameState.currentPhase, isProcessing, activePlayerIndex]);

  const handleChoice = async (choiceId: string, playerIdx: number) => {
    if (!gameState.isHostMode) {
      // 客端只能发送请求给房主
      connections[0]?.send({ type: 'PLAYER_ACTION', payload: { choiceId, playerIndex: playerIdx } });
      return;
    }

    // 房主处理逻辑
    const currentPlayer = gameState.players[playerIdx];
    const actionText = `${currentPlayer.name} 决定了：${choiceId === 'E' ? '静观其变' : choiceId}`;
    
    const newStateWithAction = {
      ...gameState,
      history: [...gameState.history, { sender: currentPlayer.name, text: actionText }]
    };
    setGameState(newStateWithAction);
    broadcast('SYNC_STATE', newStateWithAction);

    setIsProcessing(true);
    const response = await processTurn(newStateWithAction, actionText);
    
    const finalState = {
      ...newStateWithAction,
      stage: response.updatedStage || newStateWithAction.stage,
      history: [...newStateWithAction.history, { sender: 'DM', text: response.dmText }]
    };
    
    setGameState(finalState);
    setChoices(response.choices || []);
    setIsProcessing(false);
    
    // 广播更新和语音
    broadcast('SYNC_STATE', finalState);
    const nextIdx = (playerIdx + 1) % gameState.players.length;
    setActivePlayerIndex(nextIdx);
    broadcast('UPDATE_TURN', { index: nextIdx });

    if (response.voicePrompt) {
      broadcast('DM_SPEAK', { text: response.voicePrompt, voice: gameState.dmVoice });
      speakText(response.voicePrompt, gameState.dmVoice);
    }
    setTimer(30);
  };

  const currentPlayer = gameState.players[activePlayerIndex];

  return (
    <div className="flex flex-col md:flex-row h-[90vh] gap-4 max-w-7xl mx-auto w-full">
      {/* 侧边栏 */}
      <div className="w-full md:w-64 space-y-4">
        <div className="glass-panel p-4 rounded-xl border border-amber-500/20">
          <h2 className="text-sm font-mystical text-amber-200 mb-2 uppercase tracking-widest">公馆宾客</h2>
          <div className="space-y-1">
            {gameState.players.map((p, i) => (
              <div key={p.id} className={`p-2 rounded-lg text-xs ${i === activePlayerIndex ? 'bg-amber-600/30 border border-amber-500/50' : 'bg-slate-800/40 opacity-60'}`}>
                <div className="flex justify-between items-center">
                  <span>{p.name}</span>
                  <span className="text-[8px] opacity-50">{p.role || "客席"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="glass-panel p-4 rounded-xl bg-black/40 border border-slate-700">
           <h2 className="text-xs font-mystical text-amber-500 mb-2">房内绝密</h2>
           <div className="text-[10px] text-slate-400 font-typewriter leading-relaxed italic">
             {gameState.players.find(p => p.isHost)?.secretTask || "你的过去是一片空白，直到真相敲响房门。"}
           </div>
        </div>

        <div className="text-center p-2">
           <span className="text-[10px] text-slate-600 uppercase tracking-widest block">Story Progress</span>
           <span className="text-2xl font-mystical text-amber-600">{gameState.stage} <small className="text-xs text-slate-700">/ 10</small></span>
        </div>
      </div>

      {/* 对话主屏 */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 glass-panel rounded-2xl p-4 overflow-y-auto space-y-3 border border-slate-800 relative shadow-2xl">
          <div className="sticky top-0 bg-slate-950/60 backdrop-blur-md p-2 -mx-4 -mt-4 border-b border-slate-800 text-center z-10">
             <h1 className="text-sm font-mystical text-amber-500 tracking-[0.3em]">《 {gameState.scriptTitle || "等待迷雾散去"} 》</h1>
          </div>
          
          {gameState.history.map((msg, i) => (
            <div key={i} className={`flex ${msg.sender === 'DM' ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[85%] p-3 rounded-xl text-sm ${msg.sender === 'DM' ? 'bg-slate-800/80 border-l-2 border-amber-600' : 'bg-amber-900/20 border-r-2 border-amber-700'}`}>
                <div className="text-[9px] font-mystical text-amber-500/60 mb-1 uppercase">{msg.sender === 'DM' ? '馆主' : msg.sender}</div>
                <div className="leading-relaxed">{msg.text}</div>
              </div>
            </div>
          ))}

          {isProcessing && <div className="text-[10px] text-amber-500/50 italic animate-pulse">命运正在被改写...</div>}
          <div ref={chatEndRef} />
        </div>

        {/* 交互控件 */}
        <div className="mt-4 glass-panel p-4 rounded-2xl border border-amber-500/20 bg-slate-900/90">
          <div className="flex justify-between items-center mb-3">
             <div className="text-xs font-mystical text-amber-200">
               {gameState.currentPhase === GamePhase.GAME_LOOP ? `轮到你了：${currentPlayer.name}` : "听从公馆的引导"}
             </div>
             <div className={`font-mono text-sm ${timer < 10 ? 'text-red-500 animate-pulse' : 'text-amber-600'}`}>
               {timer}S
             </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {choices.map((choice) => (
              <button 
                key={choice.id}
                onClick={() => handleChoice(choice.id, activePlayerIndex)}
                disabled={isProcessing}
                className="bg-slate-800/40 hover:bg-amber-600 hover:text-slate-950 border border-slate-700 p-2 rounded-lg text-left text-xs transition-all disabled:opacity-20"
              >
                <span className="text-amber-500 font-bold mr-1">{choice.id}</span>
                {choice.text}
              </button>
            ))}
            <button 
              onClick={() => handleChoice('D', activePlayerIndex)}
              disabled={isProcessing}
              className="bg-amber-900/30 border border-amber-600/30 p-2 rounded-lg text-xs flex items-center justify-center gap-1 hover:bg-amber-600 transition-all disabled:opacity-20"
            >
              🎤 自由/语音
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameScreen;
