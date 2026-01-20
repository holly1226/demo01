
import React from 'react';

const Manual: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="max-w-2xl w-full glass-panel p-8 rounded-3xl border border-amber-500/30 overflow-y-auto max-h-[80vh]">
        <h2 className="text-3xl font-mystical text-amber-400 mb-6 text-center underline decoration-amber-600/50">—— 游玩指南 ——</h2>
        
        <div className="space-y-6 text-slate-200">
          <section>
            <h3 className="text-xl font-bold text-amber-200 mb-2">1. 创世阶段 (Lobby)</h3>
            <p>由主持人设置剧本的**类型**（如：古风、科幻、克苏鲁等）并确认玩家人数（2-5人）。AI 会根据设定实时生成专属剧本。</p>
          </section>

          <section>
            <h3 className="text-xl font-bold text-amber-200 mb-2">2. 沉浸开场 (Intro)</h3>
            <p>AI 扮演的 DM 会进行背景介绍。随后是一段**公共剧本朗读**，请各位玩家按顺序配合氛围进行阅读，这将开启你们的故事。</p>
          </section>

          <section>
            <h3 className="text-xl font-bold text-amber-200 mb-2">3. 秘密任务 (Secret Task)</h3>
            <p>每位玩家都有专属的角色背景和**秘密任务**。请务必保密，并在后续互动中尝试完成它。秘密任务是推动剧情的关键。</p>
          </section>

          <section>
            <h3 className="text-xl font-bold text-amber-200 mb-2">4. 核心交互 (Gameplay)</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>**轮流行动**：每人每轮有 30 秒思考时间。</li>
              <li>**选项 A/B/C**：由 AI 根据剧情提供的预设剧情分支。</li>
              <li>**选项 D (语音)**：直接语音输入你的对话或特殊行动。</li>
              <li>**选项 E (静观其变)**：不做任何动作，时间耗尽默认执行此项。</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-bold text-amber-200 mb-2">5. 节奏控制</h3>
            <p>游戏固定在 **10 个阶段**内结束。第 6 阶段通常是剧情的高潮点。最后阶段 DM 将揭开所有真相。</p>
          </section>
        </div>

        <button 
          onClick={onClose}
          className="mt-8 w-full py-3 bg-amber-600 hover:bg-amber-500 text-slate-900 font-bold rounded-xl transition-all"
        >
          我已准备好开启命运
        </button>
      </div>
    </div>
  );
};

export default Manual;
