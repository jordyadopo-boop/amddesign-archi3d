# Vidéo de présentation AMD Design (60 s, 1920×1080)

Composition déterministe : le monde 3D du site (mode « tournage ») + typographie animée (GSAP) + sous-titres anglais.
`window.__render(t)` cale chaque image sur le temps `t` : le rendu est parfaitement fluide, quelle que soit la machine.

## Régénérer la vidéo
```bash
# 1. Captures du site pour la séquence « navigateur » (site construit et servi sur :4173)
npm run build && npx vite preview --port 4173 &
#    → enregistrer site-hero / site-services / site-realisations / site-rendu-3d / site-fiche.png dans tools/video/shots/
# 2. Images (serveur de dev sur :5190)
npx vite --port 5190 &
node tools/video/render.mjs frames 30 0 60
# 3. Voix off (edge-tts, voix fr-FR-HenriNeural) : un fichier par phrase, calés dans video.js (SUBS)
# 4. Musique originale
python3 tools/video/music.py music.wav
# 5. Mixage (la musique se baisse sous la voix) puis montage
ffmpeg -i music.wav -i voice.wav -filter_complex "[0:a]volume=0.55[m];[1:a]asplit=2[vk][vo];[m][vk]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=400[md];[md][vo]amix=inputs=2:normalize=0,loudnorm=I=-15:TP=-1.5:LRA=9[a]" -map "[a]" soundtrack.wav
ffmpeg -framerate 30 -i frames/%05d.jpg -i soundtrack.wav -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart AMD-Design-presentation.mp4
```

## Modifier
- Textes, ordre des plans, caméra : `video.js` (`shots`, `SVC_TIMES`, `SUBS`).
- Mise en page : `video.css` · Structure : `index.html`.
