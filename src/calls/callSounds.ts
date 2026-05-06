/**
 * callSounds — sons UI pour les actions d'appel, générés via Web Audio API.
 * Aucun fichier audio externe requis.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx || ctx.state === "closed") {
    ctx = new AudioContext();
  }
  return ctx;
}

function resume(ac: AudioContext): Promise<void> {
  return ac.state === "suspended" ? ac.resume() : Promise.resolve();
}

/** Joue une séquence de bips définie par des notes { freq, duration, gap } */
function playTones(notes: { freq: number; dur: number; gap?: number }[], volume = 0.18): void {
  try {
    const ac = getCtx();
    resume(ac).then(() => {
      let t = ac.currentTime + 0.01;
      for (const note of notes) {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.connect(gain);
        gain.connect(ac.destination);

        osc.type = "sine";
        osc.frequency.setValueAtTime(note.freq, t);

        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(volume, t + 0.01);
        gain.gain.setValueAtTime(volume, t + note.dur - 0.02);
        gain.gain.linearRampToValueAtTime(0, t + note.dur);

        osc.start(t);
        osc.stop(t + note.dur);

        t += note.dur + (note.gap ?? 0.04);
      }
    }).catch(() => {});
  } catch {
    // AudioContext non disponible (SSR, test, etc.)
  }
}

/** Mute — bip sourd court */
export function playMuteSound(): void {
  playTones([
    { freq: 300, dur: 0.1 }
  ], 0.12);
}

/** Unmute — bip clair court */
export function playUnmuteSound(): void {
  playTones([
    { freq: 600, dur: 0.1 }
  ], 0.12);
}

/** Join vocal — deux bips montants doux */
export function playJoinSound(): void {
  playTones([
    { freq: 440, dur: 0.08, gap: 0.03 },
    { freq: 660, dur: 0.12 }
  ], 0.16);
}

/** Leave vocal — deux bips descendants */
export function playLeaveSound(): void {
  playTones([
    { freq: 520, dur: 0.08, gap: 0.03 },
    { freq: 340, dur: 0.14 }
  ], 0.16);
}

/** Caméra activée — bip court montant */
export function playCameraOnSound(): void {
  playTones([
    { freq: 880, dur: 0.06, gap: 0.02 },
    { freq: 1100, dur: 0.08 }
  ], 0.13);
}

/** Caméra désactivée — bip court descendant */
export function playCameraOffSound(): void {
  playTones([
    { freq: 660, dur: 0.08, gap: 0.02 },
    { freq: 440, dur: 0.1 }
  ], 0.13);
}

/** Partage d'écran activé — bip triple montant */
export function playScreenOnSound(): void {
  playTones([
    { freq: 520, dur: 0.06, gap: 0.02 },
    { freq: 660, dur: 0.06, gap: 0.02 },
    { freq: 880, dur: 0.1 }
  ], 0.13);
}

/** Partage d'écran désactivé — bip triple descendant */
export function playScreenOffSound(): void {
  playTones([
    { freq: 880, dur: 0.06, gap: 0.02 },
    { freq: 660, dur: 0.06, gap: 0.02 },
    { freq: 440, dur: 0.1 }
  ], 0.13);
}