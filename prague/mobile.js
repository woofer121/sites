/* Frise mobile, sans carte ; données partagées avec le carnet principal. */
(() => {
 'use strict';
 const root=document.getElementById('days');
 if(typeof PRAGUE_DAYS==='undefined'){root.textContent='Le programme n’a pas pu se charger. Rechargez la page pour réessayer.';return;}
 const brief={j0_1:'On pose les valises au Kafka Prague rooms.',j0_2:'Horloge, Notre-Dame du Týn et marché de Noël.',j0_3:'Premier dîner végétarien dans la Vieille-Ville.',j0_4:'Quelques lumières au bord de l’eau, selon notre énergie.',j1_1:'Sortie du métro, fontaine couverte et parapluie orange.',j1_2:'Saint-Guy, palais, Saint-Georges et ruelle d’Or.',j1_3:'Pause déjeuner en descendant du château.',j1_4:'Façades de Nerudova et église Saint-Nicolas.',j1_5:'Mur Lennon, petit canal et promenade sur l’île.',j1_6:'Statues, tours et vues sur le château.',j1_7:'Dîner tôt avant notre soirée musicale.',j1_8:'Salle Smetana · rang 16 · sièges 15 et 16.',j2_1:'Un grand petit-déjeuner, avec options sans viande.',j2_2:'La tête métallique qui tourne derrière Quadrio.',j2_3:'Accueil dans Štěpánská pasáž ; pièce d’identité.',j2_4:'Prague en trike électrique, avec guide en français.',j2_p1:'Rejoindre Újezd et monter sur la colline.',j2_p2:'La petite tour Eiffel : visite rapide si la marge le permet.',j2_p3:'Marge de transfert, pas un temps de trajet vérifié.',j2_5:'Jetée 4 · rendez-vous 17 h 45 · départ 18 h.',j2_6:'Dîner italien sur un bateau à quai, après la croisière.',j3_1:'Libérer la chambre et organiser les bagages.',j3_2:'Synagogues et ancien cimetière : sélection de visites.',j3_3:'Déjeuner dans le centre avant de récupérer les valises.',j3_4:'Viser le terminal 2 vers 14 h 30 ; vol à 16 h 45.'};
 const extra={castle:[['Infos du château','https://www.hrad.cz/en/prague-castle-for-visitors/opening-hours']],smetana:[['La salle Smetana','https://prague.eu/en/objevujte/municipal-house-smetana-hall-obecni-dum-smetanova-sin/']],ujezd:[['Infos funiculaire','https://prague.eu/en/objevujte/petrin-funicular-lanova-draha-na-petrin/']],petrin:[['Infos de la tour','https://prague.eu/en/objevujte/petrin-tower-petrinska-rozhledna']],josefov:[['Horaires du Musée juif','https://www.jewishmuseum.cz/en/info/visit/opening-hours/']],airport:[['Transport aéroport','https://www.prg.aero/en/public-transport-buses']]};
 const booked=new Set(['j1_2','j1_8','j2_4','j2_5']);
 const meeting=new Set(['j1_1','j2_3']);
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 function anchor(label,url){const a=el('a','',label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;}
 function card(step){const li=el('li'),d=el('details'),sum=el('summary'),meta=el('span','meta');d.id='etape-'+step.id;
 meta.append(el('span','time',step.time));
 let label='Proposé',warn=false;if(booked.has(step.id))label='Réservé';else if(meeting.has(step.id))label='Rendez-vous';else if(step.id==='j0_1')label='Logement réservé';else if(step.id.startsWith('j2_p')){label='Créneau serré';warn=true;}else if(step.title.includes('facultatif'))label='Facultatif';
 meta.append(el('span','badge'+(warn?' warn':''),label));
 sum.append(meta,el('span','step-title',step.title),el('span','brief',brief[step.id]||step.desc.split('. ')[0]));
 const drawer=el('div','drawer');drawer.append(el('p','detail-label','Les petits détails'),el('p','',step.desc));
 if(step.restoInfo)drawer.append(el('p','',step.restoInfo.name+' — '+step.restoInfo.menu));
 if(step.id==='j2_p2')drawer.append(el('p','notice','Le créneau de 30 minutes est optimiste et non réservé. Il ne garantit pas une visite complète. Ne montez que si l’attente et les transferts permettent de rejoindre la jetée à 17 h 45 ; sinon, priorité au bateau.'));
 if(step.id==='j2_p3')drawer.append(el('p','','L’heure prévue comprend une marge : elle ne signifie pas qu’un trajet vérifié dure une heure. Vérifiez l’itinéraire au moment de partir.'));
 const actions=el('div','actions');actions.append(anchor('Itinéraire ↗','https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(step.mapQuery||step.title)));
 if(step.restoInfo)actions.append(anchor('Menu et réservation ↗',step.restoInfo.link));
 for(const [label,url] of extra[step.place]||[])actions.append(anchor(label+' ↗',url));
 drawer.append(actions);d.append(sum,drawer);li.append(d);return li;}
 root.replaceChildren();
 PRAGUE_DAYS.forEach((day,i)=>{const sec=el('section');sec.id='jour-'+i;sec.setAttribute('aria-labelledby','titre-'+i);const h=el('h2','day-title',day.theme);h.id='titre-'+i;sec.append(el('p','day-label',day.day+' · 2026'),h,el('p','day-intro',day.summary));
 const list=el('ol','steps');
 if(i===0)list.append(card({id:'vol-aller',time:'13:00 → 14:45',title:'Nice → Prague',desc:'Vol EJU1781, jeudi 10 décembre. Arrivée au terminal 2 à Prague, selon les billets fournis. Vérifier les informations de la compagnie avant le départ.',mapQuery:'Nice Cote d Azur Airport'}));
 day.steps.forEach(step=>list.append(card(step)));
 if(i===3)list.append(card({id:'vol-retour',time:'16:45 → 18:35',title:'Prague → Nice',desc:'Vol EJU1782, dimanche 13 décembre. Départ terminal 2 à Prague, arrivée à Nice à 18 h 35 selon les billets. Fin du séjour le 13 et non le 14.',mapQuery:'Vaclav Havel Airport Prague Terminal 2'}));
 sec.append(list);root.append(sec);});
 const links=[...document.querySelectorAll('.tabs a')];
 function active(id){links.forEach(a=>{if(a.hash==='#'+id)a.setAttribute('aria-current','true');else a.removeAttribute('aria-current');});}
 active('jour-0');
 if('IntersectionObserver' in window){const obs=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting)active(e.target.id);},{rootMargin:'-90px 0px -60% 0px',threshold:0});document.querySelectorAll('#days section').forEach(sec=>obs.observe(sec));}
 links.forEach(a=>a.addEventListener('click',()=>active(a.hash.slice(1))));
})();
