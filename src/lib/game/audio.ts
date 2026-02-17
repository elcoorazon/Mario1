export interface AudioSettings {
  muted: boolean;
  volume: number;
}

class ChipAudio {
  private ctx: AudioContext | null = null;
  private unlocked = false;
  private settings: AudioSettings = { muted: false, volume: 0.4 };

  updateSettings(settings: AudioSettings) {
    this.settings = settings;
  }

  unlock = async () => {
    if (typeof window === 'undefined') return;
    if (!this.ctx) this.ctx = new window.AudioContext();
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    this.unlocked = true;
  };

  private beep(freq: number, duration: number, type: OscillatorType = 'square', when = 0) {
    if (!this.ctx || !this.unlocked || this.settings.muted) return;
    const t = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = this.settings.volume * 0.12;
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + duration);
  }

  jump() {
    this.beep(420, 0.12);
    this.beep(590, 0.1, 'triangle', 0.04);
  }

  collect() {
    this.beep(780, 0.09, 'square');
    this.beep(940, 0.08, 'square', 0.05);
  }

  hit() {
    this.beep(180, 0.16, 'sawtooth');
  }

  enemyDefeat() {
    this.beep(330, 0.08, 'square');
    this.beep(220, 0.1, 'square', 0.06);
  }

  levelComplete() {
    [440, 560, 700, 880].forEach((f, i) => this.beep(f, 0.1, 'triangle', i * 0.08));
  }

  gameOver() {
    [360, 280, 210, 130].forEach((f, i) => this.beep(f, 0.16, 'sawtooth', i * 0.1));
  }
}

export const chipAudio = new ChipAudio();
