const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/fx-tilt-Bmc7jJzH.js","assets/main-CtItffR2.js","assets/main-B3Ii9pTa.css"])))=>i.map(i=>d[i]);
import{t as e}from"./main-CtItffR2.js";import{a as t}from"./config-CULqrPoe.js";var n={etude:`M6 42h36M10 42V18l14-10 14 10v24M18 42V28h12v14`,chantier:`M8 42h32M12 42V14h10v28M22 20h14v22M6 14h20M16 6v8`,renovation:`M8 40l14-14M20 12l16 16M28 6l14 14-6 6-14-14zM6 42l4-8 4 4z`,urbanisme:`M6 10l12-4 12 4 12-4v32l-12 4-12-4-12 4zM18 6v32M30 10v32`,permis:`M12 4h18l8 8v32H12zM30 4v8h8M18 22h14M18 30h14M18 38h8`,"3d":`M24 4l18 10v20L24 44 6 34V14zM6 14l18 10 18-10M24 24v20`};function r(r){r.innerHTML=t.map((e,t)=>`
    <article class="svc panel" data-module="fx-tilt">
      <span class="svc__n">${String(t+1).padStart(2,`0`)}</span>
      <svg class="svc__ico" viewBox="0 0 48 48" aria-hidden="true" data-draw><path d="${n[e.id]}"/></svg>
      <h3>${e.title}</h3>
      <p>${e.text}</p>
    </article>`).join(``);let i=Object.assign({"./fx-tilt.js":()=>e(()=>import(`./fx-tilt-Bmc7jJzH.js`),__vite__mapDeps([0,1,2]))});r.querySelectorAll(`[data-module="fx-tilt"]`).forEach(e=>i[`./fx-tilt.js`]().then(t=>t.default(e)))}export{r as default};