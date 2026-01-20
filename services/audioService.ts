
// 单例音频播放服务，解决重叠问题
class AudioQueuePlayer {
  private static instance: AudioQueuePlayer;
  private ctx: AudioContext | null = null;
  private nextStartTime: number = 0;

  private constructor() {}

  static getInstance() {
    if (!AudioQueuePlayer.instance) {
      AudioQueuePlayer.instance = new AudioQueuePlayer();
    }
    return AudioQueuePlayer.instance;
  }

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private async decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  }

  async enqueue(base64Audio: string) {
    const ctx = this.initCtx();
    const binary = atob(base64Audio);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const audioBuffer = await this.decodeAudioData(bytes, ctx, 24000, 1);
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    // 关键逻辑：确保播放时间轴不重叠
    this.nextStartTime = Math.max(this.nextStartTime, ctx.currentTime);
    source.start(this.nextStartTime);
    this.nextStartTime += audioBuffer.duration;
  }
}

export const audioPlayer = AudioQueuePlayer.getInstance();
