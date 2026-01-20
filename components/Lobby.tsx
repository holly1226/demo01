
import React, { useState } from 'react';
import { GameState, Player, GamePhase } from '../types';
import Manual from './Manual';

interface LobbyProps {
  onStart: (genre: string, players: Player[]) => void;
  roomID: string;
  onJoin: (targetRoomID: string) => void;
}

const Lobby: React.FC<LobbyProps> = ({ onStart, roomID, onJoin }) => {
  const [genre, setGenre] = useState('古风谋杀案');
  const [showManual, setShowManual] = useState(false);
  const [joinID, setJoinID] = useState('');
  const [players, setPlayers] = useState<Player[]>([
    { id: '1', name: '我 (房主)', gender: 'female', isHost: true }
  ]);

  const addPlayer = () => {
    if (players.length < 5) {
      setPlayers([...players, { id: Date.now().toString(), name: `宾客 ${players.length + 1}`, gender: 'male', isHost: false }]);
    }
  };

  const removePlayer = (id: string) => {
    if (players.length > 2) {
      setPlayers(players.filter(p => p.id !== id));
    }
  };

  const updatePlayer = (id: string, updates: Partial<Player>) => {
    setPlayers(players.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  return (
    <div className="max-w-4xl mx-auto p-8 glass-panel rounded-2xl border-2 border-slate-700 shadow-2xl relative">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-mystical bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent">
            迷 雾 公 馆 AI
          </h1>
          <p className="text-slate-500 text-sm mt-1">跨设备实时沉浸式剧本杀</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowManual(true)} className="p-2 text-amber-400 border border-amber-500/30 rounded-full px-4 text-xs hover:bg-amber-500/10 transition-all">使用手册</button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <section className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
            <h3 className="text-amber-200 font-mystical mb-3 text-sm">加入他人房间</h3>
            <div className="flex gap-2">
              <input 
                placeholder="输入房间 ID..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                value={joinID}
                onChange={(e) => setJoinID(e.target.value)}
              />
              <button 
                onClick={() => onJoin(joinID)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold"
              >
                加入
              </button>
            </div>
          </section>

          <section>
            <label className="block text-amber-100 font-mystical mb-2 text-sm">剧本类型设定</label>
            <input 
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:outline-none focus:border-amber-500"
              placeholder="例如：赛博朋克、中式恐怖..."
            />
          </section>

          <section>
            <div className="flex justify-between items-center mb-4">
               <h3 className="text-amber-100 font-mystical">宾客配置 ({players.length}/5)</h3>
            </div>
            <div className="space-y-2">
              {players.map((player) => (
                <div key={player.id} className="flex gap-2 items-center bg-slate-800/50 p-2 rounded-lg border border-slate-700 group">
                  <input 
                    value={player.name}
                    onChange={(e) => updatePlayer(player.id, { name: e.target.value })}
                    className="flex-1 bg-transparent border-b border-slate-600 text-sm focus:border-amber-400 focus:outline-none"
                  />
                  <select 
                    value={player.gender}
                    onChange={(e) => updatePlayer(player.id, { gender: e.target.value as any })}
                    className="bg-slate-700 rounded px-1 py-1 text-[10px]"
                  >
                    <option value="male">男</option>
                    <option value="female">女</option>
                  </select>
                  {!player.isHost && (
                    <button onClick={() => removePlayer(player.id)} className="text-slate-500 hover:text-red-400 p-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                  )}
                </div>
              ))}
              {players.length < 5 && (
                <button onClick={addPlayer} className="w-full py-2 border border-dashed border-slate-600 rounded-lg text-xs text-slate-400 hover:text-amber-200 transition-colors">+ 添加虚拟/占位宾客</button>
              )}
            </div>
          </section>
        </div>

        <div className="flex flex-col justify-center items-center text-center space-y-6 p-6 border-l border-slate-700">
          <div className="p-4 bg-slate-900/80 rounded-2xl border border-amber-500/20 w-full">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">您的专属房间 ID</p>
            <p className="text-2xl font-mono text-amber-500 select-all tracking-wider">{roomID}</p>
            <p className="text-[10px] text-amber-600/50 mt-2">分享此 ID 给好友，让他们加入公馆</p>
          </div>
          
          <button 
            onClick={() => onStart(genre, players)}
            className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold font-mystical rounded-xl shadow-lg transition-transform active:scale-95"
          >
            开启命运之门
          </button>
          
          <p className="text-[10px] text-slate-500 italic">只有房主点击开启后，剧本才会开始生成</p>
        </div>
      </div>

      {showManual && <Manual onClose={() => setShowManual(false)} />}
    </div>
  );
};

export default Lobby;
