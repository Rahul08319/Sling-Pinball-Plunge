// Web Audio API Retro Arcade Synthesizer for Sling-Pinball Plunge
import { SoundTheme } from '../types';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private currentOctaveOffset: number = 0;
  private masterVolume: number = 0.5; // Default to 50%
  private masterGainNode: GainNode | null = null;
  private activeTheme: SoundTheme = 'RETRO_ARCADE';

  // Harmonious Pentatonic major scale to guarantee beautiful chiming chords!
  private pentatonicScale = [261.63, 293.66, 329.63, 392.00, 440.00]; // C4, D4, E4, G4, A4

  constructor() {
    // Lazy initialisation on user click/interaction
  }

  private initContext() {
    if (!this.ctx) {
      // Standard browser context
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGainNode = this.ctx.createGain();
      this.masterGainNode.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
      this.masterGainNode.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (!this.isMuted) {
      this.initContext();
    }
    return this.isMuted;
  }

  public getMuteStatus(): boolean {
    return this.isMuted;
  }

  public setVolume(vol: number) {
    this.masterVolume = Math.min(1, Math.max(0, vol));
    if (this.ctx && this.masterGainNode) {
      this.masterGainNode.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
    }
  }

  public getVolume(): number {
    return this.masterVolume;
  }

  public setSoundTheme(theme: SoundTheme) {
    this.activeTheme = theme;
  }

  public getSoundTheme(): SoundTheme {
    return this.activeTheme;
  }

  private getDestinationNode(): AudioNode {
    this.initContext();
    return this.masterGainNode || this.ctx!.destination;
  }

  // Play ascending electronic chime chord
  public playPegChime(hitStreak: number) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const time = this.ctx.currentTime;
    const dest = this.getDestinationNode();
    
    // Scale step based on streak
    const noteCount = this.pentatonicScale.length;
    const baseIndex = hitStreak % noteCount;
    const octave = Math.floor(hitStreak / noteCount);
    
    const baseFreq = this.pentatonicScale[baseIndex] * Math.pow(2, octave);
    const frequencies = [baseFreq, baseFreq * 1.25, baseFreq * 1.5]; // Root, Major 3rd, Perfect 5th

    if (this.activeTheme === 'MINIMALIST_ZEN') {
      const masterGain = this.ctx.createGain();
      masterGain.gain.setValueAtTime(0.08, time);
      masterGain.gain.exponentialRampToValueAtTime(0.0001, time + 1.8);
      masterGain.connect(dest);

      frequencies.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const waveGain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        
        waveGain.gain.setValueAtTime(0.25 - idx * 0.06, time);
        waveGain.connect(masterGain);
        osc.connect(waveGain);
        osc.start(time);
        osc.stop(time + 1.9);
      });
      return;
    }

    if (this.activeTheme === 'CYBER_SYNTH') {
      const masterGain = this.ctx.createGain();
      masterGain.gain.setValueAtTime(0.14, time);
      masterGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.61);
      masterGain.connect(dest);

      frequencies.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const waveGain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = idx === 0 ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(freq, time);
        
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(freq * 2.0, time);
        filter.frequency.exponentialRampToValueAtTime(freq * 0.5, time + 0.5);
        filter.Q.setValueAtTime(5, time);

        waveGain.gain.setValueAtTime(0.35 - idx * 0.1, time);
        osc.connect(filter);
        filter.connect(waveGain);
        waveGain.connect(masterGain);
        osc.start(time);
        osc.stop(time + 0.65);
      });
      return;
    }

    // Default: RETRO_ARCADE
    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(0.12, time);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.82);
    masterGain.connect(dest);

    frequencies.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const waveGain = this.ctx.createGain();
      
      osc.type = idx === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, time);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.98, time + 0.6);

      waveGain.gain.setValueAtTime(0.4 - idx * 0.1, time);
      waveGain.connect(masterGain);
      osc.connect(waveGain);
      
      osc.start(time);
      osc.stop(time + 0.9);
    });
  }

  // Play retro springy / deep glowing bounce sound for high value bumpers
  public playBumperHit() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const time = this.ctx.currentTime;
    const dest = this.getDestinationNode();

    if (this.activeTheme === 'MINIMALIST_ZEN') {
      // Warm sine bass thump + crystalline bell tone
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(100, time);
      osc.frequency.exponentialRampToValueAtTime(45, time + 0.35);

      gainNode.gain.setValueAtTime(0.22, time);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.38);

      osc.connect(gainNode);
      gainNode.connect(dest);
      osc.start(time);
      osc.stop(time + 0.4);

      const bell = this.ctx.createOscillator();
      const bellGain = this.ctx.createGain();
      bell.type = 'sine';
      bell.frequency.setValueAtTime(1200, time);
      bellGain.gain.setValueAtTime(0.06, time);
      bellGain.gain.exponentialRampToValueAtTime(0.001, time + 1.2);
      bell.connect(bellGain);
      bellGain.connect(dest);
      bell.start(time);
      bell.stop(time + 1.25);
      return;
    }

    if (this.activeTheme === 'CYBER_SYNTH') {
      // High-resonance detuned sweep
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc1.type = 'square';
      osc1.frequency.setValueAtTime(240, time);
      osc1.frequency.exponentialRampToValueAtTime(60, time + 0.32);

      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(244, time);
      osc2.frequency.exponentialRampToValueAtTime(61, time + 0.32);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1500, time);
      filter.frequency.exponentialRampToValueAtTime(150, time + 0.25);
      filter.Q.setValueAtTime(14, time);

      gain.gain.setValueAtTime(0.20, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      osc1.start(time);
      osc2.start(time);
      osc1.stop(time + 0.36);
      osc2.stop(time + 0.36);
      return;
    }

    // Default: RETRO_ARCADE
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gainNode = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, time); // A3
    osc.frequency.exponentialRampToValueAtTime(55, time + 0.28); // Slide down to A1

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, time);
    filter.frequency.exponentialRampToValueAtTime(120, time + 0.2);
    filter.Q.setValueAtTime(8, time);

    gainNode.gain.setValueAtTime(0.24, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(dest);

    osc.start(time);
    osc.stop(time + 0.4);

    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(880, time);
    subGain.gain.setValueAtTime(0.08, time);
    subGain.gain.exponentialRampToValueAtTime(0.001, time + 0.6);
    subOsc.connect(subGain);
    subGain.connect(dest);
    
    subOsc.start(time);
    subOsc.stop(time + 0.65);
  }

  // Laser frequency sweep indicating launch power
  public playSlingLaunch(powerRatio: number) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const time = this.ctx.currentTime;
    const duration = 0.35;
    const dest = this.getDestinationNode();

    if (this.activeTheme === 'MINIMALIST_ZEN') {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = 'sine';
      const startFreq = 200 + powerRatio * 100;
      const endFreq = 400 + powerRatio * 200;

      osc.frequency.setValueAtTime(startFreq, time);
      osc.frequency.exponentialRampToValueAtTime(endFreq, time + duration);

      gainNode.gain.setValueAtTime(0.12, time);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(gainNode);
      gainNode.connect(dest);
      osc.start(time);
      osc.stop(time + duration + 0.1);
      return;
    }

    if (this.activeTheme === 'CYBER_SYNTH') {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gainNode = this.ctx.createGain();

      osc.type = 'sawtooth';
      const startFreq = 160 + powerRatio * 300;
      const endFreq = 900 + powerRatio * 1200;

      osc.frequency.setValueAtTime(startFreq, time);
      osc.frequency.exponentialRampToValueAtTime(endFreq, time + duration);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, time);
      filter.frequency.exponentialRampToValueAtTime(3000, time + duration);

      gainNode.gain.setValueAtTime(0.15, time);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(dest);
      osc.start(time);
      osc.stop(time + duration + 0.1);
      return;
    }

    // Default: RETRO_ARCADE
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'sine';
    const startFreq = 120 + powerRatio * 180;
    const endFreq = 520 + powerRatio * 600;

    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(endFreq, time + duration);

    gainNode.gain.setValueAtTime(0.18, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(gainNode);
    gainNode.connect(dest);

    osc.start(time);
    osc.stop(time + duration + 0.1);
  }

  // Retro multi-pitch alert when multiplier increases
  public playMultiplierUp(multiplierValue: number) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const time = this.ctx.currentTime;
    const scale = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 chord arpeggio
    const dest = this.getDestinationNode();
    
    scale.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, time + idx * 0.08);

      gainNode.gain.setValueAtTime(0.0, time);
      gainNode.gain.setValueAtTime(0.08, time + idx * 0.08);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + idx * 0.08 + 0.2);

      osc.connect(gainNode);
      gainNode.connect(dest);

      osc.start(time + idx * 0.08);
      osc.stop(time + idx * 0.08 + 0.25);
    });
  }

  // Descending fail melody
  public playBallLost() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const time = this.ctx.currentTime;
    const pitches = [392.00, 349.23, 311.13, 261.63]; // G4, F4, Eb4, C4 sliding warning
    const dest = this.getDestinationNode();

    pitches.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time + idx * 0.12);

      gainNode.gain.setValueAtTime(0.0, time);
      gainNode.gain.setValueAtTime(0.1, time + idx * 0.12);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + idx * 0.12 + 0.2);

      osc.connect(gainNode);
      gainNode.connect(dest);

      osc.start(time + idx * 0.12);
      osc.stop(time + idx * 0.12 + 0.25);
    });
  }

  public playHighScoreSound() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const time = this.ctx.currentTime;
    const dest = this.getDestinationNode();
    
    // Play a delightful synth flourish (ascending chirps)
    for (let i = 0; i < 6; i++) {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      osc.type = 'sawtooth';
      
      const pitch = 440 * Math.pow(1.2, i);
      osc.frequency.setValueAtTime(pitch, time + i * 0.07);
      osc.frequency.linearRampToValueAtTime(pitch * 1.5, time + i * 0.07 + 0.06);
      
      const bandpass = this.ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(pitch * 1.2, time);
      
      gainNode.gain.setValueAtTime(0.0, time);
      gainNode.gain.setValueAtTime(0.05, time + i * 0.07);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, time + i * 0.07 + 0.12);
      
      osc.connect(bandpass);
      bandpass.connect(gainNode);
      gainNode.connect(dest);
      
      osc.start(time + i * 0.07);
      osc.stop(time + i * 0.07 + 0.15);
    }
  }

  // Flipper sound (snap sound on activation)
  public playFlipperSnap() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    const dest = this.getDestinationNode();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.linearRampToValueAtTime(250, time + 0.03);

    gainNode.gain.setValueAtTime(0.08, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    osc.connect(gainNode);
    gainNode.connect(dest);

    osc.start(time);
    osc.stop(time + 0.06);
  }
}

// Singleton export
export const audio = new AudioEngine();
