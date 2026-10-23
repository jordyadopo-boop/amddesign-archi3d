"""Bande-son originale de la vidéo AMD Design (60 s) : nappe d'accords, pulsation, souffles aux coupes, impacts.
Synthèse additive en numpy, réverbération par convolution. Usage : python3 music.py sortie.wav
"""
import sys
import wave
import numpy as np

SR = 48000
DUR = 60.0
N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(7)
out = np.zeros((N, 2))

def note(f):
    return 440.0 * 2 ** ((f - 69) / 12)

def env(start, length, attack, release):
    e = np.zeros(N)
    i0, i1 = int(start * SR), min(N, int((start + length) * SR))
    if i1 <= max(0, i0):
        return e
    x = np.arange(i1 - i0) / SR
    if i0 < 0:
        x, i0 = x[-i0:], 0
    a = np.clip(x / attack, 0, 1)
    r = np.clip((length - x) / release, 0, 1)
    e[i0:i1] = np.minimum(a, r) ** 1.5
    return e

def add(sig, gain=1.0, pan=0.0):
    out[:, 0] += sig * gain * (1 - pan) * 0.5 ** 0.5 * 1.4
    out[:, 1] += sig * gain * (1 + pan) * 0.5 ** 0.5 * 1.4

# ---------- Nappe : Am9 – Fmaj7 – Cmaj7 – G6, 5 s par accord ----------
chords = [[57, 60, 64, 67, 71], [53, 57, 60, 64, 69], [48, 55, 59, 64, 67], [55, 59, 62, 64, 71]]
for k in range(12):
    start = k * 5.0
    ch = chords[k % 4]
    e = env(start - 0.3, 5.9, 1.6, 1.8)
    for j, m in enumerate(ch):
        f = note(m)
        for det, pan in ((-0.12, -0.6), (0.12, 0.6)):
            ph = rng.uniform(0, 2 * np.pi)
            s = np.sin(2 * np.pi * (f + det) * t + ph) + 0.35 * np.sin(2 * np.pi * 2 * (f + det) * t + ph) + 0.12 * np.sin(2 * np.pi * 3 * (f + det) * t)
            add(s * e, 0.022, pan)
    # basse
    add(np.sin(2 * np.pi * note(ch[0] - 12) * t) * e, 0.05)

# ---------- Pulsation (services) et ticks ----------
bpm, beat = 96, 60 / 96
for i in range(int((45.4 - 17.9) / beat)):
    b0 = 17.9 + i * beat
    i0 = int(b0 * SR); L = int(0.45 * SR)
    if i0 + L > N:
        break
    x = np.arange(L) / SR
    kick = np.sin(2 * np.pi * (48 + 70 * np.exp(-x * 30)) * x) * np.exp(-x * 9)
    out[i0:i0 + L, :] += (kick * 0.16)[:, None]
    if i % 2 == 1:
        Lh = int(0.06 * SR)
        hat = rng.normal(0, 1, Lh) * np.exp(-np.arange(Lh) / SR * 70)
        hat = np.diff(hat, prepend=0)
        out[i0:i0 + Lh, 0] += hat * 0.02; out[i0:i0 + Lh, 1] += hat * 0.025

# ---------- Souffles aux coupes ----------
def whoosh(c, length=0.9, gain=0.09):
    i0 = int((c - length * 0.6) * SR); L = int(length * SR)
    if i0 < 0 or i0 + L > N:
        return
    x = np.arange(L) / L
    noise = rng.normal(0, 1, L)
    # filtre passe-bande glissant (moyenne mobile variable ≈ passe-bas qui s'ouvre puis se referme)
    k = (40 - 34 * np.sin(np.pi * x)).astype(int)
    cs = np.cumsum(noise)
    lp = np.array([(cs[i] - cs[max(0, i - k[i])]) / k[i] for i in range(L)])
    hp = noise - lp * 0.6
    e = np.sin(np.pi * x) ** 2
    s = hp * e * gain
    out[i0:i0 + L, 0] += s * (1 - x); out[i0:i0 + L, 1] += s * x

for c in [7.9, 18.0, 24.5, 28.7, 32.7, 35.9, 39.8, 45.4, 53.3]:
    whoosh(c)

# ---------- Impacts graves (logo, fin) et montée ----------
def boom(c, gain=0.35):
    i0 = int(c * SR); L = int(2.5 * SR)
    x = np.arange(min(L, N - i0)) / SR
    s = np.sin(2 * np.pi * (38 + 30 * np.exp(-x * 6)) * x) * np.exp(-x * 1.6)
    out[i0:i0 + len(x), :] += (s * gain)[:, None]

boom(0.35); boom(53.3, 0.3)
r0, r1 = int(1.0 * SR), int(3.0 * SR)
x = np.arange(r1 - r0) / (r1 - r0)
riser = rng.normal(0, 1, r1 - r0) * x ** 2 * 0.03
out[r0:r1, 0] += riser; out[r0:r1, 1] += np.roll(riser, 40)

# ---------- Réverbération (convolution, queue de 2 s) ----------
L = int(2.0 * SR)
ir = rng.normal(0, 1, (L, 2)) * np.exp(-np.arange(L) / SR * 3.2)[:, None]
ir[:, 0] /= np.abs(ir[:, 0]).sum(); ir[:, 1] /= np.abs(ir[:, 1]).sum()
nfft = 1 << int(np.ceil(np.log2(N + L)))
wet = np.stack([np.fft.irfft(np.fft.rfft(out[:, c], nfft) * np.fft.rfft(ir[:, c], nfft), nfft)[:N] for c in range(2)], axis=1)
mix = out * 0.75 + wet * 18

# Fondu final et normalisation
fade = np.clip((DUR - t) / 2.5, 0, 1) * np.clip(t / 0.05, 0, 1)
mix *= fade[:, None]
mix /= np.abs(mix).max() + 1e-9
mix *= 0.89
pcm = (mix * 32767).astype(np.int16)
with wave.open(sys.argv[1] if len(sys.argv) > 1 else 'music.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('ok')
