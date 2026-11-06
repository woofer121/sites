/* Vue complète permanente : conserve repères, parcours et sélection. */
(() => {
 'use strict';
 const stage=document.getElementById('map-stage');
 const world=document.getElementById('map-world');
 if(!stage||!world)return;
 function fit(){
  const w=stage.clientWidth,h=stage.clientHeight;
  if(!w||!h)return;
  const scale=Math.min(w/848,h/1264)*.94;
  world.style.setProperty('--overview-transform',`translate(${(w-848*scale)/2}px,${(h-1264*scale)/2}px) scale(${scale})`);
  world.style.setProperty('--overview-marker-scale',String(1/scale));
 }
 fit();
 new ResizeObserver(fit).observe(stage);
 window.addEventListener('orientationchange',()=>requestAnimationFrame(fit));
 stage.addEventListener('pointerdown',e=>e.stopImmediatePropagation(),{capture:true});
 stage.addEventListener('wheel',e=>e.stopImmediatePropagation(),{capture:true,passive:true});
 stage.addEventListener('keydown',e=>{
  if(e.target===stage&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','0'].includes(e.key))e.stopImmediatePropagation();
 },{capture:true});
})();
