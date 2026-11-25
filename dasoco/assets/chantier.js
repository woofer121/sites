'use strict';
const el=id=>document.getElementById(id);
const stages=['Brouillon','Envoyé','Accepté','À facturer','Facturé','Refusé'];
const nextLabels=['Marquer envoyé','Marquer accepté','Mettre à facturer','Marquer facturé'];
const jobs=[
  {id:1,job:'Rénovation du séjour',customer:'Maison des Amandiers',stage:0,lines:[{label:'Peinture des murs (m²)',qty:48,price:26},{label:'Pose de parquet (m²)',qty:24,price:47}]},
  {id:2,job:'Réfection du hall',customer:'Résidence des Pins',stage:1,lines:[{label:'Pose de carrelage (m²)',qty:35,price:64}]},
  {id:3,job:'Aménagement de bureaux',customer:'Atelier du Levant',stage:2,lines:[{label:'Cloison en plaques de plâtre (m²)',qty:32,price:55}]}
];
let current=jobs[0], serial=3;
const ref=j=>'DEV-'+String(j.id).padStart(3,'0');
const currency=new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'});
const amount=cents=>currency.format(cents/100);
const lineSum=l=>Math.round(l.qty*Math.round(l.price*100));
function node(tag,text) {const n=document.createElement(tag); n.textContent=text; return n;}
function render(message='') {
  el('form').hidden=true; el('detail').hidden=false;
  el('list').replaceChildren();
  for (const j of jobs) {
    const b=node('button',''); b.className='job'; b.setAttribute('aria-current',String(j===current));
    b.append(node('strong',j.job),node('small',ref(j)+' · '+stages[j.stage]));
    b.onclick=()=>{current=j;render();el('title').focus();}; el('list').append(b);
  }
  el('ref').textContent=ref(current);el('title').textContent=current.job;el('client').textContent=current.customer;
  el('badge').textContent=stages[current.stage];el('state').value=current.stage;
  el('advance').hidden=current.stage>=nextLabels.length;el('advance').textContent=nextLabels[current.stage]||'';
  el('lines').replaceChildren();let ht=0;
  for (const l of current.lines) {
    const row=node('tr',''),sum=lineSum(l);ht+=sum;
    for (const val of [l.label,l.qty.toLocaleString('fr-FR'),amount(Math.round(l.price*100)),amount(sum)]) row.append(node('td',val));
    el('lines').append(row);
  }
  const vat=Math.round(ht*.2);
  el('ht').textContent=amount(ht);el('vat').textContent=amount(vat);el('ttc').textContent=amount(ht+vat);
  el('notice').textContent=message;
}
function editLine(line) {
  const row=node('fieldset','');row.className='editrow';row.append(node('legend','Prestation'));
  for (const [name,label] of [['label','Désignation'],['qty','Quantité'],['price','Prix unitaire HT (€)']]) {
    const wrap=node('label',label),input=node('input','');input.name=name;input.required=true;
    if(name==='label') input.maxLength=160;
    else {input.type='number';input.step='0.01';input.min=name==='qty'?'0.01':'0';input.max=name==='qty'?'10000':'1000000';}
    input.value=line[name];wrap.append(input);row.append(wrap);
  }
  const remove=node('button','Retirer la ligne');remove.className='secondary';remove.type='button';
  remove.onclick=()=>{if(el('editlines').children.length>1) row.remove();else el('notice').textContent='Conservez au moins une prestation.';};
  row.append(remove);el('editlines').append(row);
}
function startEdit() {
  el('detail').hidden=true;el('form').hidden=false;
  const fields=el('form').elements;
  fields.job.value=current.job;fields.customer.value=current.customer;el('editlines').replaceChildren();
  current.lines.forEach(editLine);fields.job.focus();
}
stages.forEach((s,i)=>el('state').add(new Option(s,i)));
el('advance').onclick=()=>{current.stage++;render('Devis mis à jour.');};
el('state').onchange=e=>{current.stage=Number(e.target.value);render('Statut mis à jour.');};
el('edit').onclick=startEdit;el('cancel').onclick=()=>render();
el('add').onclick=()=>editLine({label:'',qty:1,price:0});
el('print').onclick=()=>window.print();
el('copy').onclick=()=>{current={...structuredClone(current),id:++serial,job:current.job+' (copie)',stage:0};jobs.unshift(current);render('Copie créée en brouillon.');};
el('form').onsubmit=e=>{
  e.preventDefault();const fields=e.target.elements;
  current.job=fields.job.value.trim()||'Chantier';current.customer=fields.customer.value.trim()||'Client fictif';
  current.lines=Array.from(el('editlines').children,row=>({label:row.elements.label.value.trim()||'Travaux',qty:Number(row.elements.qty.value),price:Number(row.elements.price.value)}));
  render('Modifications enregistrées.');
};
el('generate').onclick=async ()=>{
  el('generate').disabled=true;el('feedback').textContent='Analyse du chantier…';
  const result=await draftEstimate(el('brief').value);
  el('generate').disabled=false;
  el('feedback').textContent=result.engine+' · '+(result.notes.join(' · ') || 'Analyse terminée.');
  if (!result.items.length) {
    el('feedback').textContent+=' Indiquez une quantité et une prestation parmi peinture, parquet, carrelage, plinthes, cloison ou porte.';return;
  }
  current={id:++serial,job:'Travaux de '+result.items[0].label.split(' (')[0].toLocaleLowerCase('fr'),customer:'Client de démonstration',stage:0,lines:result.items};
  jobs.unshift(current);render('Brouillon généré. Vérifiez les lignes proposées.');
  if(result.notes.length) el('notice').textContent+=' '+result.notes.join(' · ');
  el('title').focus();
};
render();
