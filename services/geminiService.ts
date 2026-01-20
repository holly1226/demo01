
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { GameState, GamePhase, AIResponse, Player } from "../types";
import { audioPlayer } from "./audioService";

// 兼容多种环境下的 API Key 获取
const getAPIKey = () => {
  // 1. 尝试从 process.env 获取 (Node/Vercel)
  if (typeof process !== 'undefined' && process.env?.API_KEY) return process.env.API_KEY;
  // 2. 尝试从 window 对象获取 (注入脚本)
  if ((window as any).process?.env?.API_KEY) return (window as any).process.env.API_KEY;
  // 3. 尝试从 Vite 默认变量名获取
  if ((import.meta as any).env?.VITE_API_KEY) return (import.meta as any).env.VITE_API_KEY;
  return null;
};

const getAIClient = () => {
  const apiKey = getAPIKey();
  if (!apiKey) {
    throw new Error("API_KEY_MISSING");
  }
  return new GoogleGenAI({ apiKey });
};

// 清洗 AI 返回的文本，确保它是合法的 JSON
const cleanJSON = (text: string) => {
  try {
    // 移除可能存在的 Markdown 代码块标记 ```json ... ```
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("JSON 解析失败，原始文本:", text);
    throw new Error("INVALID_AI_RESPONSE");
  }
};

export const generateScript = async (gameState: GameState): Promise<GameState> => {
  const ai = getAIClient();

  const prompt = `作为一个剧本杀创作专家，请为一个剧本杀游戏创作一个定制剧本。
  玩家人数：${gameState.players.length}。
  类型：${gameState.genre}。
  玩家配置：${JSON.stringify(gameState.players.map(p => ({ name: p.name, gender: p.gender })))}。
  
  要求：
  1. 提供剧本标题 (scriptTitle)。
  2. 设定一个充满神秘感的 DM 形象 (dmAvatar)。
  3. 为每位玩家分配：role(角色名), background(背景), secretTask(具体的冲突性秘密任务)。
  4. 创作开场 DM 背景介绍 (openingText)。
  5. 创作一段公共剧本 (sharedReadingText)。
  6. DM 语音 (dmVoice): 'Kore', 'Puck', 'Charon', 'Zephyr', 'Fenrir' 选一。
  
  请直接输出 JSON，不要包含任何解释性文字。`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            scriptTitle: { type: Type.STRING },
            dmAvatar: { type: Type.STRING },
            dmVoice: { type: Type.STRING },
            openingText: { type: Type.STRING },
            sharedReadingText: { type: Type.STRING },
            playersData: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  role: { type: Type.STRING },
                  background: { type: Type.STRING },
                  secretTask: { type: Type.STRING }
                }
              }
            }
          },
          required: ["scriptTitle", "dmAvatar", "dmVoice", "openingText", "playersData"]
        }
      }
    });

    const data = cleanJSON(response.text || '{}');
    
    const mergedPlayers = gameState.players.map((p, index) => ({
      ...p,
      ...(data.playersData?.[index] || {})
    }));

    return { 
      ...gameState, 
      ...data, 
      players: mergedPlayers, 
      currentPhase: GamePhase.INTRO, 
      stage: 1 
    };
  } catch (err: any) {
    console.error("AI 生成接口报错:", err);
    throw err;
  }
};

export const processTurn = async (gameState: GameState, playerAction?: string): Promise<AIResponse> => {
  const ai = getAIClient();
  const prompt = `你是剧本杀《${gameState.scriptTitle}》的 DM。
  当前阶段：${gameState.stage}/10。
  玩家行动：${playerAction || '无'}。
  
  请推进剧情并回复：
  - dmText: 你的反馈文字。
  - voicePrompt: 你的配音文字。
  - updatedStage: 当前剧情阶段（1-10）。
  - choices: 为下一位玩家提供 A, B, C 三个互动选项。
  直接输出 JSON。`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          dmText: { type: Type.STRING },
          voicePrompt: { type: Type.STRING },
          updatedStage: { type: Type.INTEGER },
          choices: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                text: { type: Type.STRING },
                description: { type: Type.STRING }
              }
            }
          }
        }
      }
    }
  });

  return cleanJSON(response.text || '{}');
};

export const speakText = async (text: string, voice: string) => {
  if (!text) return;
  const apiKey = getAPIKey();
  if (!apiKey) return;
  
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice || 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      await audioPlayer.enqueue(base64Audio);
    }
  } catch (e) {
    console.error("TTS 播放失败", e);
  }
};
