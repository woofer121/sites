// Nearest-example text classifier. Training phrases and illustrative HT catalogue.
const catalogue = [
  ['Peinture des murs et plafonds', 'm²', 26, ['repeindre les murs', 'peinture de plafond', 'peindre une pièce', 'mise en peinture des cloisons']],
  ['Pose de parquet flottant', 'm²', 47, ['poser un parquet flottant', 'pose de sol stratifié', 'installer du parquet', 'lames de parquet au sol']],
  ['Pose de carrelage', 'm²', 64, ['carreler une cuisine', 'pose de carrelage au sol', 'poser de la faïence', 'installation de carreaux']],
  ['Pose de plinthes', 'ml', 12, ['poser des plinthes', 'installation de plinthes en bois', 'fixer les plinthes']],
  ['Cloison en plaques de plâtre', 'm²', 55, ['monter une cloison en placo', 'poser des plaques de plâtre', 'création de cloison sèche']],
  ['Pose de bloc-porte', 'u', 290, ['installer des portes', 'pose de bloc porte', 'remplacer une porte intérieure']]
];
function normalise(text) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
}
function features(text) {
  const words = normalise(text).match(/[a-z]+/g) || [];
  const grams = new Set();
  for (const word of words.filter(w => w.length > 3 && !['avec','dans','pour','poser','pose','installer','installation','mettre','remplacer','fixer'].includes(w))) {
    const padded = '^' + word + '$';
    for (let i=0; i<padded.length-2; i++) grams.add(padded.slice(i,i+3));
  }
  return grams;
}
const examples = catalogue.flatMap(([name,unit,price,phrases]) =>
  phrases.map(phrase => ({name,unit,price,vector:features(phrase)})));
function classify(phrase) {
  const vector=features(phrase);
  let best=null, score=0;
  for (const example of examples) {
    const overlap=[...vector].filter(g=>example.vector.has(g)).length;
    const similarity=overlap/Math.sqrt(vector.size*example.vector.size);
    if (similarity>score) {score=similarity; best=example;}
  }
  return score>=0.35 ? best : null;
}
function estimate(text) {
  const items=[], notes=[];
  const clauses=text.split(/\s+(?:et|puis|ainsi que|sans)\s+(?!demande)|[;\n]|,(?!\d)|\.(?!\d)/i);
  // Ask for review when a negated scope is present.
  if (/\b(?:sans|sauf|pas|hors)\b/i.test(text)) return {items,notes:['Reformulez en indiquant seulement les travaux à réaliser.']};
  for (const raw of clauses.filter(s=>s.trim())) {
    const match=classify(raw);
    if (!match) {notes.push('À chiffrer séparément : '+raw.trim());continue;}
    const numbers=[...raw.replace(/m2\b/gi,'m²').matchAll(/\d+(?:[.,]\d+)?/g)];
    const quantity=Number(numbers[0]?.[0].replace(',','.'));
    if (numbers.length!==1 || !(quantity>0 && quantity<=10000)) {
      notes.push('Quantité à préciser en '+match.unit+' : '+raw.trim());continue;
    }
    const unit=normalise(raw).match(/\d\s*(m²|m2|mètres? carrés?|metres? carres?|ml|metres? lineaires?|metres?\b|m\b)/);
    if (unit && (match.unit==='u' || (match.unit==='m²')!==/²|2|carre/.test(unit[1]))) {
      notes.push('Unité attendue : '+match.unit+' pour '+match.name);continue;
    }
    items.push({label:match.name+' ('+match.unit+')',qty:quantity,price:match.price});
  }
  return {items,notes};
}

async function draftEstimate(text) {
  const model=globalThis.LanguageModel;
  const options={expectedInputs:[{type:'text',languages:['fr']}],expectedOutputs:[{type:'text',languages:['fr']}]};
  let session;
  try {
    if (model && await model.availability(options)==='available') {
      const signal=AbortSignal.timeout(18000);
      session=await model.create({...options,signal});
      const menu=catalogue.map(([name,unit],index)=>index+' : '+name+' en '+unit).join('\n');
      const prompt='Extrais les travaux explicitement demandés et leurs quantités dans le catalogue suivant. Ignore les travaux exclus. Recopie les travaux hors catalogue ou sans quantité dans notes. Ne suppose aucune quantité. Réponds en JSON avec items (liste de {index,qty}) et notes (liste de textes). Catalogue :\n'+menu+'\nDescription :\n'+text;
      const parsed=JSON.parse(await session.prompt(prompt,{signal}));
      if (!Array.isArray(parsed.items)||!Array.isArray(parsed.notes)) throw Error();
      const items=parsed.items.map(({index,qty})=>{
        if (!Number.isInteger(index)||!catalogue[index]||!Number.isFinite(qty)||qty<=0||qty>10000) throw Error();
        const [name,unit,price]=catalogue[index];return {label:name+' ('+unit+')',qty,price};
      });
      return {items,notes:parsed.notes.filter(n=>typeof n==='string'),engine:'IA générative du navigateur'};
    }
  } catch { /* Use the local catalogue model when the browser model cannot respond. */ }
  finally {session?.destroy();}
  return {...estimate(text),engine:'Modèle local de classement'};
}
