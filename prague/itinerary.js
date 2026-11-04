/* Programme existant conservé. Positions sur l’illustration, et non coordonnées GPS.
   Horaires et propositions de restaurants à vérifier avant le voyage. */
const PRAGUE_DAYS = [
 {day:'Jeudi 10 décembre',short:'Premiers pas',theme:'Arrivée & première magie de Noël',summary:'La Vieille-Ville, un premier dîner et le pont illuminé.',steps:[
  {id:'j0_1',title:'Arrivée à Kaprova',time:'16:00',desc:'Installation au Kafka Prague rooms (Kaprova 13).',x:69.5,y:35.5,place:'kaprova',mapQuery:'Kaprova 13 Prague'},
  {id:'j0_2',title:'Place de la Vieille-Ville',time:'17:00',desc:'Marché de Noël et découverte de l’horloge astronomique illuminée. Dates et horaires du marché à confirmer avant le séjour.',x:73,y:52.8,place:'oldtown',mapQuery:'Old Town Square Prague'},
  {id:'j0_3',title:'Dîner chez Maitrea',time:'19:00',desc:'Premier dîner dans la Vieille-Ville, autour de la cuisine végétarienne.',x:83,y:38,place:'maitrea',isResto:true,restoInfo:{name:'Maitrea',menu:'Cuisine végétarienne ; consulter la carte officielle pour les plats et tarifs.',link:'https://restaurace-maitrea.cz/en/'},mapQuery:'Maitrea Prague'},
  {id:'j0_4',title:'Pont Charles de nuit',time:'20:30',desc:'Balade au fil de l’eau avec vue sur le château éclairé.',x:44.5,y:48.7,place:'bridge',mapQuery:'Charles Bridge Prague'}
 ]},
 {day:'Vendredi 11 décembre',short:'Le château',theme:'Château impérial, ruelles & Kampa',summary:'Du château aux ruelles, puis les rives et les lumières de Noël.',steps:[
  {id:'j1_1',title:'Le Château de Prague',time:'09:30',desc:'Cathédrale Saint-Guy, palais royal et panorama sur la ville aux cent clochers.',x:35,y:18,place:'castle',mapQuery:'Prague Castle'},
  {id:'j1_2',title:'Ruelle de Nový Svět',time:'12:00',desc:'Une promenade dans les petites ruelles et les maisonnettes du quartier.',x:9,y:16,place:'novy',mapQuery:'Novy Svet Prague'},
  {id:'j1_3',title:'Déjeuner Nerudova / Malá Strana',time:'13:00',desc:'Pause en descendant vers Malá Strana : Vegan’s Prague ou bistro local.',x:20,y:30,place:'nerudova',isResto:true,restoInfo:{name:'Vegan’s Prague',menu:'Cuisine végétale ; consulter la carte et les disponibilités.',link:'https://vegansprague.cz/'},mapQuery:'Nerudova 36 Prague'},
  {id:'j1_4',title:'Île de Kampa & bord de Vltava',time:'14:30',desc:'Promenade au bord de l’eau et passage sous le pont Charles.',x:29,y:64,place:'kampa',mapQuery:'Kampa Island Prague'},
  {id:'j1_5',title:'Dîner Lehká Hlava',time:'19:00',desc:'Dîner sous le plafond étoilé dans une ruelle intime.',x:62,y:60,place:'lehka',isResto:true,restoInfo:{name:'Lehká Hlava',menu:'Cuisine végétarienne ; consulter la carte officielle.',link:'https://lehkahlava.cz/en/'},mapQuery:'Lehka Hlava Prague'},
  {id:'j1_6',title:'Marché Place Venceslas',time:'20:30',desc:'Illuminations et grande avenue au pied du Musée National. Programme de Noël à confirmer avant le séjour.',x:86,y:72,place:'wenceslas',mapQuery:'Wenceslas Square Prague'}
 ]},
 {day:'Samedi 12 décembre',short:'Au fil de l’eau',theme:'Douceur, quartier de paix & dîner sur l’eau',summary:'Une journée plus douce, jusqu’à notre dîner sur la Vltava.',steps:[
  {id:'j2_1',title:'Brunch au Café Louvre',time:'09:30',desc:'Une pause Belle Époque sur Národní, avec un choix végétarien à composer sur la carte.',x:56,y:77,place:'louvre',isResto:true,restoInfo:{name:'Café Louvre',menu:'Choisir une formule végétarienne à la carte ; confirmer les ingrédients.',link:'https://www.cafelouvre.cz/en/'},mapQuery:'Cafe Louvre Prague'},
  {id:'j2_2',title:'Marché de Náměstí Míru',time:'14:00',desc:'Balade autour de Sainte-Ludmila et de ses chalets de Noël. Dates et horaires du marché à confirmer avant le séjour.',x:84,y:93,place:'miru',mapQuery:'Namesti Miru Prague'},
  {id:'j2_3',title:'Dîner spécial au Marina Ristorante',time:'19:00',desc:'Notre soirée sur le bateau avec vue sur le château.',x:62,y:21,place:'marina',isResto:true,restoInfo:{name:'Marina Ristorante',menu:'Cuisine italienne ; sélectionner une option végétarienne et confirmer les ingrédients.',link:'https://www.marinaristorante.cz/en/'},mapQuery:'Marina Ristorante Prague'}
 ]},
 {day:'Dimanche 13 décembre',short:'À bientôt',theme:'Derniers instants & retour',summary:'Un dernier café, les valises, puis le retour.',steps:[
  {id:'j3_1',title:'Dernier café dans la Vieille-Ville',time:'10:30',desc:'Flânerie dans les ruelles pavées avant de récupérer les valises.',x:69.5,y:35.5,place:'kaprova',mapQuery:'Kaprova 13 Prague'},
  {id:'j3_2',title:'Départ pour l’aéroport',time:'13:30',desc:'Départ pour le terminal 2 ; vol vers Nice prévu à 16:45 dans notre carnet. Vérifier l’horaire et le temps de trajet avant le départ.',place:'airport',offMap:true,mapQuery:'Vaclav Havel Airport Prague'}
 ]}
];
