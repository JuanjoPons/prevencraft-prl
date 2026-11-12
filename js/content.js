/* =====================================================================
   PrevenCraft · CONTENIDO DIDÁCTICO (UT3 · Factors de risc i la seva prevenció)
   ---------------------------------------------------------------------
   En este archivo está TODO el texto del juego que ve el alumnado:
   zonas, peligros, opciones, feedback, señales, preguntas de los cofres
   y situaciones de la evaluación final con la matriz del INSST.

   CÓMO EDITAR SIN ROMPER NADA
   · Cambia solo lo que está entre comillas: "texto" o 'texto'.
   · Si un texto lleva un apóstrofo (d'una, l'empresa), enciérralo entre
     comillas dobles: "l'empresa". Si usas comillas simples, escribe \'
   · Respeta las comas entre elementos y los corchetes [ ] y llaves { }.
   · Las etiquetas <b>...</b> ponen el texto en negrita (solo en EVAL).
   · Después de guardar, abre el juego y comprueba que carga. Si la
     pantalla se queda en blanco, abre la consola del navegador (F12):
     te dirá la línea con el error (casi siempre, una coma o comilla).

   Los parámetros de nota, insignias y envío por correo están en
   js/config.js. El motor 3D está en js/game.js (no hace falta tocarlo).
   ===================================================================== */


/* ---------------------------------------------------------------------
   ZONES · Las 6 zonas del astillero (0 = muelle de entrada, 5 = evaluación).
   name = nombre visible · hex = color de la zona · place = descripción.
   NO cambies x0, x1 ni gate: son la posición de las paredes en el mundo 3D.
   --------------------------------------------------------------------- */
const ZONES=[
  {name:"Moll d'entrada",hex:'#cfd8e6',x0:0,x1:12},
  {name:'Condicions de seguretat',hex:'#f2b134',x0:12,x1:32,gate:32,place:'Taller i varador'},
  {name:'Condicions mediambientals',hex:'#3fb6a8',x0:32,x1:52,gate:52,place:'Pintura, soldadura i grada'},
  {name:'Càrrega de treball',hex:'#e46f4f',x0:52,x1:72,gate:72,place:'Magatzem i oficina'},
  {name:'Organització del treball',hex:'#9b7fe0',x0:72,x1:92,gate:92,place:'Oficines'},
  {name:'Avaluació de riscos',hex:'#4fa3e0',x0:92,x1:108,place:'Servei de prevenció'},
];

/* ---------------------------------------------------------------------
   SIGNS · Catálogo de señales (RD 485/1997) que se pueden ofrecer.
   Cada señal tiene un identificador (adv_caiguda, obl_oida…) que se usa
   en los peligros (campo sign). l = texto bajo la señal.
   c = categoría: adv (advertencia), obl (obligación), proh (prohibición),
       salv (salvamento), inc (lucha contra incendios).
   p = pictograma ya dibujado. Disponibles: fall, bolt, skull, flame,
       exclam, radio, ear, goggles, shield, glove, helmet, boot, cig, drop,
       ext, cross. Puedes crear señales nuevas combinando c + p.
   --------------------------------------------------------------------- */
const SIGNS={
  adv_caiguda:{c:'adv',p:'fall',l:'Caiguda a diferent nivell'},
  adv_elec:{c:'adv',p:'bolt',l:'Risc elèctric'},
  adv_toxic:{c:'adv',p:'skull',l:'Matèries tòxiques'},
  adv_inflam:{c:'adv',p:'flame',l:'Matèries inflamables'},
  adv_general:{c:'adv',p:'exclam',l:'Perill en general'},
  adv_radiacio:{c:'adv',p:'radio',l:'Radiacions no ionitzants'},
  obl_oida:{c:'obl',p:'ear',l:"Protecció obligatòria de l'oïda"},
  obl_vista:{c:'obl',p:'goggles',l:'Protecció obligatòria de la vista'},
  obl_cara:{c:'obl',p:'shield',l:'Protecció obligatòria de la cara'},
  obl_mans:{c:'obl',p:'glove',l:'Protecció obligatòria de les mans'},
  obl_cap:{c:'obl',p:'helmet',l:'Protecció obligatòria del cap'},
  obl_peus:{c:'obl',p:'boot',l:'Protecció obligatòria dels peus'},
  proh_fumar:{c:'proh',p:'cig',l:'Prohibit fumar'},
  proh_aigua:{c:'proh',p:'drop',l:'Prohibit apagar amb aigua'},
  proh_tocar:{c:'proh',p:'glove',l:'No tocar'},
  inc_extintor:{c:'inc',p:'ext',l:'Extintor'},
  salv_aux:{c:'salv',p:'cross',l:'Primers auxilis'},
};
const CAT_HELP="Recorda: advertència = triangle groc amb vora negra · obligació = cercle blau · prohibició = cercle amb vora i franja vermelles · salvament = verd · lluita contra incendis = vermell.";

/* ---------------------------------------------------------------------
   HZ · PELIGROS. Cada bloque { ... } es un peligro del mundo.

   id      identificador único, sin espacios (enlaza con el escenario 3D
           de js/game.js; un id nuevo usa un escenario genérico).
   zone    zona 1-4 donde aparece.
   at, r   posición [x, z] del punto de interacción y radio en metros.
   mk      posición [x, altura, z] del marcador «!» que flota encima.
           (Para editar textos, no hace falta tocar at, r ni mk.)
   factor  factor de riesgo (se muestra en la cabecera de la ventana).
   title   nombre corto del peligro (aparece en la lista de la zona).
   sit     situación que se plantea.
   danys   daños posibles.
   opts    opciones de respuesta (3 o 4). Cada una:
             t  = texto de la opción
             q  = calidad: 'best' (óptima, 100 punts), 'ok' (válida pero
                  mejorable, 60 punts) o 'bad' (incorrecta, resta salud).
                  Debe haber exactamente UNA opción 'best'.
             fb = feedback que se muestra al elegirla.
           El juego baraja el orden de las opciones automáticamente.
   sign    (opcional) paso de señalización después de resolver el peligro:
             ok   = id de la señal correcta (del catálogo SIGNS)
             opts = 4 ids de señales para elegir (incluida la correcta)
             q    = pregunta · fb = explicación si acierta
             at   = [x, z] donde se coloca la señal en el mundo
   drain   (opcional) zona que hace perder salud mientras no se resuelve:
             x, z, r = centro y radio · rate = salud por segundo · msg = aviso

   PARA AÑADIR UN PELIGRO NUEVO: copia un bloque entero (de { a },),
   pégalo detrás de otro de la misma zona, cámbiale el id y los textos y
   elige un at libre dentro de la zona (zona 1: x 13-31, zona 2: x 33-51,
   zona 3: x 53-71, zona 4: x 73-91; z entre 2 y 21, lejos de las puertas
   z 10-12 y de otros peligros). Aparecerá un bidón señalizado en ese punto.
   La puntuación máxima de la zona se recalcula sola.
   --------------------------------------------------------------------- */
const HZ=[

/* =================== Zona 1 · Condicions de seguretat =================== */
{id:'bastida',zone:1,at:[18.5,10],r:2.6,mk:[18.6,5.5,7.6],factor:'Llocs de treball',title:'Bastida sense barana',
 sit:"Un company repara el casc d'una embarcació des d'una plataforma a 3 metres d'alçada. La plataforma no té barana.",
 danys:"Caigudes de persones i d'objectes a diferent nivell, cops.",
 opts:[
  {t:'Instal·lar una barana de 90 cm amb protecció inferior (sòcol)',q:'best',fb:"Correcte. És protecció col·lectiva: protegeix tothom alhora. La normativa demana baranes d'almenys 90 cm amb protecció inferior. A més de 2 m ja parlem de treball en alçada."},
  {t:'Donar-li un arnès anticaigudes',q:'ok',fb:"L'arnès és un EPI i és útil, però la llei diu que la protecció col·lectiva té prioritat sobre la individual. Primer, barana."},
  {t:'Posar només un senyal de perill',q:'bad',fb:"La senyalització no elimina el risc: és una mesura complementària. Cal protegir el buit."},
  {t:'Demanar-li que vagi amb compte',q:'bad',fb:"Confiar en l'atenció del treballador no és una mesura preventiva. El risc continua aquí."}],
 sign:{ok:'adv_caiguda',opts:['adv_caiguda','obl_cap','adv_general','salv_aux'],q:'Quin senyal col·loques al peu de la bastida per advertir del perill?',at:[15.4,10.2],fb:"Senyal d'advertència de caiguda a diferent nivell."}
},
{id:'quadre',zone:1,at:[14.5,16.5],r:2.4,mk:[14.5,2.6,15.4],factor:'Risc elèctric',title:'Quadre elèctric obert',
 sit:"El quadre elèctric del taller té la porta oberta i un cable amb l'aïllament pelat. Salten espurnes.",
 danys:'Contacte elèctric, cremades, tetanització (a partir de 10 mA) i fibril·lació ventricular (60-75 mA).',
 opts:[
  {t:"Tallar el corrent, recobrir les parts actives amb aïllament i comprovar el diferencial de 30 mA",q:'best',fb:"Molt bé. Actues a l'origen: aïllament contra contactes directes i interruptor diferencial contra contactes indirectes. Abans de treballar-hi, verifica l'absència de tensió."},
  {t:'Posar-se guants i botes aïllants i continuar treballant',q:'ok',fb:"Els EPI aïllants són necessaris per manipular la instal·lació, però no arreglen el problema. Primer cal eliminar el risc a l'origen."},
  {t:'Tocar el cable amb un tornavís per veure si té corrent',q:'bad',fb:"Perillosíssim. L'electricitat no es veu ni s'olora. L'absència de tensió es verifica amb un aparell adequat, mai tocant."}],
 sign:{ok:'adv_elec',opts:['adv_elec','proh_aigua','adv_inflam','obl_mans'],q:'Quin senyal ha de dur la porta del quadre?',at:[15.6,15.6],fb:"Senyal d'advertència de risc elèctric."}
},
{id:'radial',zone:1,at:[23.6,17.4],r:2.4,mk:[25,2.7,15.5],factor:'Màquines i eines',title:'Radial sense resguard',
 sit:"La màquina de tallar del taller no té resguard i projecta partícules metàl·liques. L'operari porta les mànigues amples.",
 danys:'Talls, atrapaments, amputacions i projecció de partícules.',
 opts:[
  {t:'Col·locar el resguard i una pantalla contra projeccions, i treballar amb roba ajustada',q:'best',fb:"Correcte. Resguards i pantalles són protecció col·lectiva. Les peces folgades poden provocar enganxades: roba ajustada."},
  {t:'Donar-li ulleres de protecció',q:'ok',fb:"Les ulleres (EPI) són necessàries, però la màquina continua sense resguard. Primer protecció col·lectiva i després EPI."},
  {t:'Treure el marcat CE perquè la màquina és vella',q:'bad',fb:"Totes les màquines han de dur el marcat CE i el manual d'instruccions en castellà a disposició dels treballadors."}],
 sign:{ok:'obl_vista',opts:['obl_vista','obl_oida','adv_general','proh_tocar'],q:"Quin senyal d'obligació poses al costat de la màquina?",at:[23,15.2],fb:"Senyal d'obligació de protecció de la vista."}
},
{id:'foc',zone:1,at:[30,20.1],r:2.4,mk:[30,2.6,18.5],factor:"Risc d'incendi",title:'Foc en un equip elèctric',
 sit:"L'ordinador de diagnosi dels motors ha començat a cremar i encara està endollat.",
 danys:'Cremades, intoxicació per fums i asfíxia.',
 opts:[
  {t:'Extintor de CO₂ dirigit a la base de les flames',q:'best',fb:"Exacte. Amb presència d'electricitat s'usa CO₂: no condueix el corrent i no danya els equips electrònics. Doll a la base de les flames, en zig-zag."},
  {t:'Extintor de pols polivalent ABC',q:'ok',fb:"Apagaria el foc, però la pols pot danyar els components electrònics. Per a equips elèctrics i informàtics el més adequat és el CO₂."},
  {t:"Llançar-hi aigua",q:'bad',fb:"Mai aigua amb electricitat: l'aigua condueix el corrent i et pots electrocutar."}],
 sign:{ok:'inc_extintor',opts:['inc_extintor','salv_aux','adv_inflam','obl_mans'],q:"Senyalitza on queda l'extintor per a la propera vegada.",at:[28.4,19.4],fb:'Senyal de lluita contra incendis: quadrat vermell.'}
},

/* =================== Zona 2 · Condicions mediambientals =================== */
{id:'soroll',zone:2,at:[36,7.5],r:2.6,mk:[36,3,5],factor:'Agents físics · Soroll',title:'Compressor a 88 dB(A)',
 sit:"El compressor de la zona de pintura fa un soroll mitjà de 88 dB(A) tota la jornada. Mentre hi siguis a prop, perds salut laboral.",
 danys:'Sordera professional irreversible, fatiga auditiva, estrès, mal de cap i insomni.',
 drain:{x:36,z:5,r:5.2,rate:7,msg:'Soroll de 88 dB(A): perds salut laboral'},
 opts:[
  {t:"Tancar i insonoritzar el compressor i reduir el temps d'exposició",q:'best',fb:"Perfecte. Primer mesures tècniques i organitzatives: substituir, insonoritzar o tancar la màquina i reduir el temps d'exposició."},
  {t:'Repartir orelleres i continuar',q:'ok',fb:"A 88 dB l'ús d'EPI és obligatori (a partir de 85 dB), però abans cal reduir el soroll a l'origen: el límit de 87 dB no es pot superar mai."},
  {t:'Res: els protectors auditius són voluntaris',q:'bad',fb:"Fals. Entre 80 i 85 dB l'ús és voluntari. A partir de 85 dB és obligatori, i 87 dB és el límit que mai s'ha de superar."}],
 sign:{ok:'obl_oida',opts:['obl_oida','obl_vista','adv_general','proh_tocar'],q:"Quin senyal ha de veure qui entri a la zona del compressor?",at:[33.8,7.2],fb:"Senyal d'obligació de protecció de l'oïda."}
},
{id:'quimic',zone:2,at:[44.5,6.8],r:2.4,mk:[44.5,3.1,5.2],factor:'Agents químics',title:"Bidó d'antiincrustant sense etiqueta",
 sit:"Un bidó de pintura antiincrustant (biocida) està obert, sense etiqueta, i desprèn vapors en un racó sense ventilació.",
 danys:"Irritació, intoxicació, efectes anestèsics (mareig) i reaccions al·lèrgiques.",
 opts:[
  {t:"Tancar-lo, etiquetar-lo i instal·lar extracció localitzada; si es pot, substituir-lo per un producte menys perillós",q:'best',fb:"Excel·lent. Actues sobre el focus (substitució, extracció localitzada). L'etiqueta és la primera informació de seguretat que rep el treballador."},
  {t:'Posar-se una mascareta i seguir pintant',q:'ok',fb:"La mascareta (EPI) protegeix només qui la porta i no evita l'exposició dels altres. Primer: focus, ventilació i etiquetatge."},
  {t:'Olorar-lo per saber quin producte és',q:'bad',fb:"Mai. La via respiratòria és la principal via d'entrada dels contaminants químics. No manipulis cap producte sense llegir i entendre l'etiqueta."}],
 sign:{ok:'adv_toxic',opts:['adv_toxic','adv_radiacio','adv_elec','salv_aux'],q:"Quin senyal d'advertència correspon a aquest producte?",at:[42.6,5.4],fb:"Senyal d'advertència de matèries tòxiques."}
},
{id:'soldadura',zone:2,at:[45.8,17.7],r:2.4,mk:[48,2.9,16.4],factor:'Agents físics · Radiacions',title:'Soldadura sense protecció',
 sit:"Un company solda una peça d'acer al costat del pas de la gent. Tothom qui passa veu els flaixos.",
 danys:'Radiacions UV i IR: cremades a la pell, conjuntivitis i cataractes.',
 opts:[
  {t:'Mampares separadores al voltant i pantalla facial de soldador per a qui solda',q:'best',fb:"Correcte. Les mampares protegeixen els altres (protecció col·lectiva) i la pantalla facial és l'EPI obligatori del soldador. A més, senyalitzar i limitar el temps d'exposició."},
  {t:'Només una pantalla facial per al soldador',q:'ok',fb:"Protegeixes el soldador, però la resta de gent continua exposada als flaixos. Cal també protecció col·lectiva: mampares."},
  {t:'Ulleres de sol per a tothom',q:'bad',fb:"Les ulleres de sol no filtren les radiacions de la soldadura. Cal un EPI homologat."}],
 sign:{ok:'obl_cara',opts:['obl_cara','obl_oida','adv_toxic','proh_fumar'],q:"Quin senyal d'obligació poses a l'entrada del lloc de soldadura?",at:[50,17.8],fb:"Senyal d'obligació de protecció de la cara."}
},
{id:'calor',zone:2,at:[37.5,15.7],r:2.8,mk:[37.5,3.3,17.6],factor:'Agents físics · Temperatura',title:'Treball a la grada amb alerta taronja',
 sit:"Juliol, 14 h. L'AEMET ha activat l'alerta taronja per calor i l'equip neteja el casc al sol. Si et quedes dins la zona, perds salut laboral.",
 danys:'Cop de calor (febre, taquicàrdia, pèrdua de consciència), deshidratació, marejos i rampes.',
 drain:{x:37.5,z:17.6,r:3.3,rate:6,msg:'Calor extrema (alerta taronja): perds salut laboral'},
 opts:[
  {t:'Reprogramar la tasca a hores més fresques, amb ombra i aigua freqüent',q:'best',fb:"Correcte. Des de 2023, amb alerta taronja o vermella de l'AEMET es prohibeix fer determinades tasques a les hores de més calor. Reduir l'exposició, roba adequada i beure aigua."},
  {t:'Donar gorres i crema solar',q:'ok',fb:"Ajuda una mica, però no redueix l'exposició. Amb alerta taronja cal reorganitzar l'horari."},
  {t:'Accelerar per acabar abans',q:'bad',fb:"Augmentar l'esforç físic amb calor extrema dispara el risc de cop de calor."}]
},

/* =================== Zona 3 · Càrrega de treball =================== */
{id:'motor',zone:3,at:[56.5,8.2],r:2.4,mk:[56.5,2.6,5.5],factor:'Càrrega física',title:'Motor fora-borda de 35 kg',
 sit:"Has de traslladar un motor fora-borda de 35 kg del magatzem al pantalà. Un company ja s'ajup per agafar-lo.",
 danys:'Lumbàlgies, hèrnies, tendinitis i fatiga física.',
 opts:[
  {t:'Fer servir un transpalet o una grua (equip mecànic)',q:'best',fb:"Perfecte. Substituir la manipulació manual per equips mecànics és la primera mesura. El màxim general és 25 kg."},
  {t:"Aixecar-lo entre dues persones amb l'esquena recta i els genolls doblegats",q:'ok',fb:"Bona tècnica (peus separats, genolls doblegats, càrrega a prop del cos), però si hi ha mitjans mecànics s'han d'usar primer."},
  {t:"Aixecar-lo tot sol doblegant l'esquena",q:'bad',fb:"35 kg supera el màxim de 25 kg, i doblegar l'esquena és la causa típica de lumbàlgies i hèrnies."}],
 sign:{ok:'obl_peus',opts:['obl_peus','obl_oida','adv_elec','proh_fumar'],q:"Quin senyal d'obligació poses a l'entrada del magatzem?",at:[54.2,7.4],fb:"Senyal d'obligació de protecció dels peus (calçat de seguretat)."}
},
{id:'pvd',zone:3,at:[64.5,6.3],r:2.3,mk:[64.5,2.8,4.5],factor:'Pantalles de visualització de dades',title:"Lloc d'oficina de la drassana",
 sit:"A l'oficina, la pantalla està per sobre del nivell dels ulls i davant de la finestra, amb enlluernaments. L'administrativa fa 4 hores seguides sense pausa.",
 danys:'Fatiga visual, dolor de coll i esquena, mal de cap i estrès.',
 opts:[
  {t:'Pantalla a l\'altura dels ulls o per sota, a 90° de la finestra, i pauses de 10 minuts cada 2 hores',q:'best',fb:"Correcte. Pantalla mai per sobre dels ulls, en angle de 90° respecte a la llum natural, uns 300 lux i pauses."},
  {t:'Posar un filtre antireflex a la pantalla',q:'ok',fb:"Redueix els reflexos, però l'alçada de la pantalla i les pauses continuen malament."},
  {t:'Pujar més la pantalla perquè es vegi millor',q:'bad',fb:"La pantalla no ha d'estar per sobre del nivell dels ulls: obliga a flexionar el coll cap amunt."}]
},
{id:'polir',zone:3,at:[64,20],r:2.4,mk:[64,2.9,18.4],factor:'Moviments repetitius',title:'Polir el casc durant hores',
 sit:"Un company poleix el casc amb moviments repetitius del canell durant tota la jornada.",
 danys:'Síndrome del túnel carpià, tendinitis i epicondilitis (colze de tennista).',
 opts:[
  {t:'Rotació de tasques i pauses de recuperació',q:'best',fb:"Molt bé. La rotació de tasques i les pauses són les mesures clau contra els moviments repetitius."},
  {t:'Donar-li una canellera',q:'ok',fb:"Pot alleujar, però no redueix la repetició. Cal organitzar la tasca: rotació i pauses."},
  {t:'Que acceleri per acabar abans',q:'bad',fb:"Més ritme vol dir més repeticions i més risc de lesió."}]
},

/* =================== Zona 4 · Organització del treball =================== */
{id:'torns',zone:4,at:[77.5,8.6],r:2.4,mk:[77.5,2.75,6.6],factor:'Riscos psicosocials',title:'En Pau, desbordat',
 sit:"En Pau té torns que canvien cada setmana sense avís, fa jornades d'11 hores i el seu encarregat li crida per tot.",
 danys:'Estrès laboral, insomni, irritabilitat i insatisfacció laboral.',
 opts:[
  {t:'Planificar els torns amb antelació, garantir el descans entre torns i aplicar un lideratge participatiu',q:'best',fb:"Exacte. Els riscos psicosocials es prevenen actuant sobre l'organització: evitar jornades perllongades, conèixer els torns amb antelació i fomentar un clima laboral positiu."},
  {t:'Recomanar-li que prengui més cafè',q:'bad',fb:"No canvia la causa. Els riscos psicosocials es prevenen organitzant millor el treball."},
  {t:'Dir-li que és qüestió de caràcter',q:'bad',fb:"Les característiques personals influeixen, però l'empresa ha d'actuar sobre l'organització del treball."}]
},
{id:'mobbing',zone:4,at:[86.5,14.4],r:2.3,mk:[86.5,2.75,16.4],factor:'Riscos psicosocials',title:'La Marta, aïllada',
 sit:"Fa mesos que alguns companys no parlen a la Marta, escampen rumors sobre ella i li assignen tasques per sota de la seva capacitat.",
 danys:'Ansietat, depressió i trastorns del son i digestius.',
 opts:[
  {t:"Comunicar-ho a l'empresa i al delegat de prevenció perquè s'activi el protocol d'assetjament",q:'best',fb:"Correcte. Són conductes d'assetjament segons la NTP 476 de l'INSST. L'empresa ha d'actuar i protegir la víctima."},
  {t:'No ficar-se\'n, són coses seves',q:'bad',fb:"Ignorar-ho permet que l'assetjament continuï. Cal comunicar-ho."},
  {t:"Fer broma perquè es relaxi l'ambient",q:'bad',fb:"Riure's d'una persona també és una conducta d'assetjament."}]
},
];


/* ---------------------------------------------------------------------
   QUIZ · Preguntas de los COFRES DE CONOCIMIENTO, por zona (1-4).
   q = pregunta · a = respuestas · x = explicación.
   ¡IMPORTANTE! La PRIMERA respuesta de la lista (a[0]) es SIEMPRE la
   correcta. El juego las baraja al mostrarlas.
   Cada cofre saca una pregunta al azar; si se falla, pasa a otra.
   Puedes añadir tantas preguntas como quieras a cada zona.

   CHESTS · Posición [x, z] de cada cofre (no hace falta tocarla).
   --------------------------------------------------------------------- */
const QUIZ={
1:[
 {q:"A partir de quina alçada es considera que un treball és «en alçada»?",a:['Més de 2 metres',"Més d'1 metre",'Més de 5 metres','Només quan hi ha bastida'],x:"Els treballs en alçada són els que es fan a més de 2 metres: cal protecció col·lectiva (baranes, xarxes) i, si cal, arnès."},
 {q:'A partir de quina intensitat es produeix la tetanització (no et pots separar del contacte)?',a:['10 mA','1 mA','0,1 mA','5 A'],x:"D'1 a 3 mA: pessigolles. A partir de 10 mA: tetanització. 25 mA: parada cardiorespiratòria. 60-75 mA: fibril·lació ventricular."},
 {q:'Quins quatre elements formen el tetràedre del foc?',a:["Combustible, comburent, energia d'activació i reacció en cadena",'Combustible, aigua, fum i calor','Oxigen, nitrogen, CO₂ i flama','Brases, fum, gas i electricitat'],x:"Perquè hi hagi foc calen els quatre: combustible, comburent (oxigen), energia d'activació i reacció en cadena."},
 {q:"Quina amplada mínima han de tenir les portes d'un lloc de treball?",a:['80 cm','60 cm','1,5 m','No hi ha mínim'],x:"Portes: mínim 80 cm. Escales: mínim 1 m. Baranes: mínim 90 cm d'alçada."},
 {q:'Quin dispositiu talla el corrent quan detecta una derivació (contacte indirecte)?',a:["L'interruptor diferencial",'El comptador de la llum','Una catifa aïllant',"L'endoll"],x:"L'interruptor diferencial salta quan hi ha una derivació (els domèstics, amb 30 mA). Amb la presa de terra, protegeix dels contactes indirectes."}],
2:[
 {q:'A partir de quin nivell de soroll és OBLIGATORI fer servir protectors auditius?',a:['85 dB(A)','80 dB(A)','55 dB(A)','120 dB(A)'],x:"A partir de 80 dB l'empresa lliura EPI i l'ús és voluntari; a partir de 85 dB és obligatori. El límit de 87 dB no s'ha de superar mai."},
 {q:"Quin és el valor de soroll que no s'ha de superar mai?",a:['87 dB de mitjana o 140 dB de pic','80 dB de mitjana','100 dB de mitjana','55 dB de mitjana'],x:"El valor límit és 87 dB de mitjana diària o setmanal, o 140 dB de pic."},
 {q:"Quina és la principal via d'entrada dels contaminants químics?",a:['La via respiratòria','La via digestiva','Les ferides','Els cabells'],x:"Els contaminants entren sobretot per la via respiratòria, però també per la digestiva, la pell o les ferides."},
 {q:'Quants lux necessita un lloc amb exigències visuals altes?',a:['500 lux','100 lux','200 lux','50 lux'],x:"Baixes: 100 lux · Mitjanes: 200 lux · Altes: 500 lux · Molt altes: 1.000 lux."},
 {q:'Quina temperatura correspon a un treball sedentari, com una oficina?',a:['Entre 17 i 27 ºC','Entre 14 i 25 ºC','Entre 10 i 20 ºC','Entre 25 i 35 ºC'],x:"Treballs sedentaris: 17-27 ºC. Treballs lleugers: 14-25 ºC."}],
3:[
 {q:'Quin és el pes màxim general que es pot manipular manualment?',a:['25 kg','15 kg','40 kg','50 kg'],x:"Màxim general: 25 kg. Dones, joves o persones grans: es recomana 15 kg. Treballadors entrenats i de manera esporàdica: fins a 40 kg."},
 {q:'Quina és la postura correcta per aixecar una càrrega?',a:["Peus separats, genolls doblegats i esquena recta, amb la càrrega a prop del cos","Cames rectes i esquena doblegada","Braços estirats per allunyar la càrrega","Girar el tronc mentre l'aixeques"],x:"Recolza bé els peus, doblega els genolls (mai l'esquena), subjecta la càrrega a prop del cos i mantén l'esquena recta."},
 {q:'Treballant amb pantalles, cada quant cal fer pauses?',a:['10 minuts cada 2 hores','5 minuts cada 4 hores','30 minuts cada hora',"Només a l'hora de dinar"],x:"Pauses de 10 minuts cada 2 hores i alternar amb altres tasques."},
 {q:'Què és la síndrome del túnel carpià?',a:["Una lesió del nervi del canell per moviments repetitius","Una lesió d'esquena per carregar pes","Una fatiga visual per la pantalla","Una sordera per soroll"],x:"Apareix per moviments repetitius del canell que comprimeixen el nervi del carp. Abans es deia «malaltia de l'escrivent»."},
 {q:'A quina alçada han d\'estar el teclat i la taula?',a:['Entre 60 i 75 cm del terra','Entre 40 i 50 cm','Entre 90 i 110 cm','Per sobre de les espatlles'],x:"Teclat i taula: entre 60 i 75 cm del terra, amb espai per recolzar els avantbraços."}],
4:[
 {q:'Quins són els tres efectes del burnout?',a:["Esgotament emocional, baixa realització personal i actitud negativa cap als clients",'Mal de cap, insomni i febre','Sordera, fatiga visual i lumbàlgia','Alegria, motivació i energia'],x:"El burnout és una insatisfacció laboral que es perllonga: esgotament emocional, baixa realització personal i actitud negativa en el tracte."},
 {q:"Què és l'estrès laboral?",a:["Un desequilibri entre les exigències del treball i les capacitats o recursos del treballador","Una malaltia causada per agents biològics","Un tipus d'accident de treball","El cansament normal d'un dia de feina"],x:"És el desequilibri entre la demanda del treball i els recursos de la persona per afrontar-la."},
 {q:"Quina d'aquestes conductes és assetjament laboral segons la NTP 476?",a:['Escampar rumors sobre una persona','Comunicar els torns amb antelació',"Fer una reunió d'equip",'Donar instruccions clares'],x:"Escampar rumors, no dirigir la paraula, assignar tasques degradants o riure's d'algú són conductes d'assetjament."},
 {q:'De què depèn la insatisfacció laboral?',a:["De la diferència entre expectatives i realitat, i de la importància que el treballador hi dona","Només del salari","Només de l'horari","De la temperatura del lloc de treball"],x:"Hi influeixen alhora les expectatives, la realitat del lloc i la importància que se li dona a la diferència."},
 {q:'Quina mesura prevé els riscos psicosocials?',a:['Fomentar un estil de lideratge participatiu','Augmentar la supervisió autoritària','Allargar les jornades','Canviar els torns sense avisar'],x:"Lideratge participatiu, autonomia, torns coneguts amb antelació, pauses i un clima laboral positiu."}],
};
const CHESTS=[{zone:1,x:22,z:20},{zone:2,x:50,z:20},{zone:3,x:70,z:21},{zone:4,x:82,z:20}];


/* ---------------------------------------------------------------------
   EVAL · Situaciones de la EVALUACIÓN FINAL (método INSST, zona 5).
   q  = situación (las palabras en <b>negrita</b> son las pistas)
   ok = nivel correcto; debe ser EXACTAMENTE uno de LEVELS
   x  = explicación que se muestra al acertar.
   En cada partida se eligen al azar tantas situaciones como indique
   EVAL_N en js/config.js (por defecto 4). Debe haber al menos EVAL_N.

   MATRIX · Tabla de la matriz del INSST que se puede consultar.
   --------------------------------------------------------------------- */
const LEVELS=['Trivial','Tolerable','Moderat','Important','Intolerable'];
const EVAL=[
 {q:'Un petit tall, <b>lleugerament nociu</b>, amb probabilitat <b>baixa</b>.',ok:'Trivial',x:'Baixa × lleugerament nociu = <b>Trivial</b>: no requereix cap acció específica.'},
 {q:'Una cremada amb el foc de la cuina del vaixell, <b>nociva</b>, amb probabilitat <b>mitjana</b>.',ok:'Moderat',x:'Mitjana × nociu = <b>Moderat</b>: cal fer esforços per reduir el risc en un període determinat.'},
 {q:'Una intoxicació amb benzè, <b>extremadament nociva</b>, amb probabilitat <b>mitjana</b>.',ok:'Important',x:"Mitjana × extremadament nociu = <b>Important</b>: no s'ha de començar el treball fins que s'hagi reduït el risc."},
 {q:'Cremades per soldadura sense protecció: <b>nocives</b> i probabilitat <b>alta</b>.',ok:'Important',x:"Alta × nociu = <b>Important</b>: no s'ha de començar el treball fins que s'hagi reduït el risc."},
 {q:'Petits talls amb el cúter en obrir caixes: <b>lleugerament nocius</b> i probabilitat <b>alta</b>.',ok:'Moderat',x:'Alta × lleugerament nociu = <b>Moderat</b>: cal reduir el risc en un període determinat.'},
 {q:'Caiguda des d\'una bastida a 4 m sense barana: <b>extremadament nociva</b> i probabilitat <b>alta</b>.',ok:'Intolerable',x:"Alta × extremadament nociu = <b>Intolerable</b>: no es pot començar ni continuar el treball fins que es redueixi el risc."},
 {q:'Sordera per un compressor ben insonoritzat: <b>nociva</b> i probabilitat <b>baixa</b>.',ok:'Tolerable',x:'Baixa × nociu = <b>Tolerable</b>: no cal millorar l\'acció preventiva, però sí fer comprovacions periòdiques.'},
 {q:'Irritació d\'ulls pels vapors d\'una pintura: <b>lleugerament nociva</b> i probabilitat <b>mitjana</b>.',ok:'Tolerable',x:'Mitjana × lleugerament nociu = <b>Tolerable</b>: comprovacions periòdiques i millores que no suposin una càrrega econòmica important.'},
];

const MATRIX=`<table class="mx"><tr><th>Probabilitat</th><th>Lleugerament nociu</th><th>Nociu</th><th>Extremadament nociu</th></tr>
<tr><th>Baixa</th><td class="l1">Trivial</td><td class="l2">Tolerable</td><td class="l3">Moderat</td></tr>
<tr><th>Mitjana</th><td class="l2">Tolerable</td><td class="l3">Moderat</td><td class="l4">Important</td></tr>
<tr><th>Alta</th><td class="l3">Moderat</td><td class="l4">Important</td><td class="l5">Intolerable</td></tr></table>`;
