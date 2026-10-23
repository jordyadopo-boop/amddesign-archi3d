# AMD Design · site officiel

Site d'AMD Design, cabinet d'architecture en Côte d'Ivoire : **Architecture • Bâtiment • Urbanisme • 3D**.
Adresse visée : **https://www.amddesign-archi3d.com**

- **Accueil** : un seul monde 3D (Three.js) vu à travers la caméra d'un drone. Intro : le plan 2D d'un duplex se trace, les murs montent, le drone décolle ;
  il survole les croquis, contourne le grand bâtiment à la croix dorée, entre dans la **Tour AMD** (forme vrillée, ascenseurs visibles) par le dernier étage
  et descend en spirale le long de sa façade (il ressort et rentre à chaque étage), une section par étage, jusqu'aux fondations.
  Style « plans transparents argentiques » : volumes en verre fantôme, traits argent et or, espaces verts, voirie, grain de pellicule.
- **Fiche projet** (`projet.html`) : 4 étapes, esquisse 2D/3D générée en direct, cartouche d'architecte, PDF et envoi WhatsApp.
- Mentions légales, page 404 « plan introuvable ».

## Modifier les textes, numéros, réalisations
Tout est dans **`src/js/config.js`** (coordonnées, services, réalisations, options de la fiche projet).
Les images à remplacer sont listées dans **`public/img/README.md`**.

## Développer
```bash
npm install
npm run dev       # http://127.0.0.1:5173
npm run build     # génère dist/
npm run preview   # sert dist/
```
Astuce : `?snap` dans l'URL fait arriver la caméra instantanément (captures, tests).

## Architecture
- `index.html`, `projet.html`… composés au build depuis `src/partials/` (`<!-- @include … -->`, plugin dans `vite.config.js`).
- `src/js/main.js` charge à la demande `src/js/modules/<nom>.js` pour chaque `data-module="nom"`.
- Le monde 3D : `src/js/world/` (`world.js` vol du drone et ambiance, `outside.js` décor extérieur, `tower.js` la tour et ses pièces,
  `kit.js` matières et constructeurs, `film.js` rendu argentique). Plans partagés 2D/3D : `src/js/plan/`.
- Animations déclaratives : `data-reveal`, `data-split`, `data-draw`, `data-reveal-stagger` (`src/js/core/reveal.js`).

## Mise en ligne (GitHub Pages)
Chaque `git push` sur `main` construit le site et le publie sur la branche `gh-pages` (`.github/workflows/deploy.yml`).
Un commit contenant `[wip]` est sauvegardé sans être publié.
Réglage unique : *Settings → Pages → Source : Deploy from a branch → `gh-pages` / root*.
Domaine personnalisé : créer `public/CNAME` contenant `www.amddesign-archi3d.com`, puis configurer le DNS (CNAME `www` → `jordyadopo-boop.github.io`).
