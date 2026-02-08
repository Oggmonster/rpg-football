import Phaser from "phaser";

type ToneType = OscillatorType;

export class AudioBus {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private crowdGain: GainNode | null = null;
  private crowdOscA: OscillatorNode | null = null;
  private crowdOscB: OscillatorNode | null = null;

  constructor(scene: Phaser.Scene) {
    const soundManager = scene.sound as Phaser.Sound.WebAudioSoundManager;
    if (!soundManager || !soundManager.context) return;
    this.context = soundManager.context;

    this.master = this.context.createGain();
    this.master.gain.value = 0.28;
    this.master.connect(this.context.destination);

    this.createCrowdBed();
  }

  destroy() {
    this.crowdOscA?.stop();
    this.crowdOscB?.stop();
    this.crowdOscA?.disconnect();
    this.crowdOscB?.disconnect();
    this.crowdGain?.disconnect();
    this.master?.disconnect();
    this.crowdOscA = null;
    this.crowdOscB = null;
    this.crowdGain = null;
    this.master = null;
  }

  setCrowdIntensity(intensity: number) {
    if (!this.context || !this.crowdGain) return;
    const t = this.context.currentTime;
    const target = Phaser.Math.Clamp(0.012 + intensity * 0.06, 0.01, 0.09);
    this.crowdGain.gain.cancelScheduledValues(t);
    this.crowdGain.gain.linearRampToValueAtTime(target, t + 0.16);
  }

  playCardSelect() {
    this.tone(680, 0.05, "square", 0.04);
  }

  playCardExecute(kind: string) {
    if (kind === "SHOOT") {
      this.tone(170, 0.08, "triangle", 0.07);
      this.tone(360, 0.09, "square", 0.03);
      return;
    }
    if (kind === "TACKLE") {
      this.tone(130, 0.07, "square", 0.07);
      this.noise(0.08, 0.035);
      return;
    }
    if (["PASS", "THROUGH_PASS", "LONG_BALL", "CROSS"].includes(kind)) {
      this.tone(420, 0.07, "triangle", 0.05);
      return;
    }
    this.tone(360, 0.07, "square", 0.045);
  }

  playInvalid() {
    this.tone(780, 0.045, "square", 0.05);
    this.tone(620, 0.055, "square", 0.045, 0.03);
  }

  playTeamCommand() {
    this.tone(110, 0.12, "triangle", 0.07);
    this.tone(520, 0.1, "sawtooth", 0.035, 0.02);
  }

  playMomentum(delta: number) {
    if (delta > 0) {
      this.tone(420, 0.05, "triangle", 0.04);
      this.tone(560, 0.06, "triangle", 0.03, 0.02);
    } else {
      this.tone(390, 0.05, "triangle", 0.035);
      this.tone(260, 0.06, "triangle", 0.03, 0.02);
    }
  }

  playKeeperSave() {
    this.tone(300, 0.08, "square", 0.05);
    this.tone(190, 0.08, "triangle", 0.04, 0.01);
  }

  playGoal() {
    this.tone(520, 0.1, "triangle", 0.06);
    this.tone(660, 0.12, "triangle", 0.05, 0.06);
    this.noise(0.12, 0.035, 0.03);
  }

  private tone(freq: number, durationSec: number, type: ToneType, gainValue: number, delaySec = 0) {
    if (!this.context || !this.master) return;

    const t0 = this.context.currentTime + delaySec;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();

    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = 0;

    osc.connect(gain);
    gain.connect(this.master);

    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(gainValue, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durationSec);

    osc.start(t0);
    osc.stop(t0 + durationSec + 0.02);
  }

  private noise(durationSec: number, gainValue: number, delaySec = 0) {
    if (!this.context || !this.master) return;
    const sampleRate = this.context.sampleRate;
    const frameCount = Math.max(1, Math.floor(sampleRate * durationSec));
    const buffer = this.context.createBuffer(1, frameCount, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / frameCount);
    }

    const src = this.context.createBufferSource();
    const gain = this.context.createGain();
    src.buffer = buffer;
    src.connect(gain);
    gain.connect(this.master);

    const t0 = this.context.currentTime + delaySec;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(gainValue, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durationSec);

    src.start(t0);
    src.stop(t0 + durationSec + 0.02);
  }

  private createCrowdBed() {
    if (!this.context || !this.master) return;

    this.crowdGain = this.context.createGain();
    this.crowdGain.gain.value = 0.014;
    this.crowdGain.connect(this.master);

    const lp = this.context.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 360;
    lp.Q.value = 0.7;
    lp.connect(this.crowdGain);

    this.crowdOscA = this.context.createOscillator();
    this.crowdOscA.type = "sawtooth";
    this.crowdOscA.frequency.value = 78;
    this.crowdOscA.connect(lp);
    this.crowdOscA.start();

    this.crowdOscB = this.context.createOscillator();
    this.crowdOscB.type = "triangle";
    this.crowdOscB.frequency.value = 104;
    this.crowdOscB.connect(lp);
    this.crowdOscB.start();
  }
}
