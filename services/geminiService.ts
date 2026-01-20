
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { GameState, GamePhase, AIResponse } from "../types";
import { audioPlayer } from "./audioService";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateScript = async (gameState: GameState): Promise<GameState> => {
  const prompt = `为一个剧本杀游戏创作一个定制剧本。
  玩家人数：${gameState.players.length}。类型：${gameState.genre}。
  
  要求：
  1. 剧本标题。
  2. 一个设定独特的 DM 身份。
  3. 为每位玩家分配角色名、背景和具体的秘密任务。
  4. 创作开场 DM 背景介绍。
  5. 创作一段玩家轮流朗读的公共剧本。
  6. DM 语音：'Kore', 'Puck', 'Charon', 'Zephyr', 'Fenrir'。
  全中文输出 JSON。`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
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
          players: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                role: { type: Type.STRING },
                background: { type: Type.STRING },
                secretTask: { type: Type.STRING }
              }
            }
          }
        }
      }
    }
  });

  const data = JSON.parse(response.text);
  return { ...gameState, ...data, currentPhase: GamePhase.INTRO, stage: 1 };
};

export const processTurn = async (gameState: GameState, playerAction?: string): Promise<AIResponse> => {
  const prompt = `你是剧本《${gameState.scriptTitle}》的 DM。
  当前阶段：${gameState.stage}/10。玩家行动：${playerAction || '无'}。
  
  请回复：
  - dmText: 对话文字。
  - voicePrompt: 语音文字（更有代入感）。
  - updatedStage: 进度。
  - choices: 三个行动选项。
  全中文 JSON。`;

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

  return JSON.parse(response.text);
};

export const speakText = async (text: string, voice: string) => {
  if (!text) return;
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
    // 使用单例队列播放，防止重叠
    await audioPlayer.enqueue(base64Audio);
  }
};
