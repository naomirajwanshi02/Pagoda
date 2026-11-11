// The pagoda's parts, bottom to top, in the order they come apart.
// Every fact is sourced in SOURCES.md. Written for ages 8–15.

export const PAGODA = {
  name: 'Five-storey pagoda',
  jp: '五重塔 · gojū-no-tō',
  blurb: 'A Buddhist tower built from wood, with no nails holding the storeys together. Touch it to take it apart.',
};

const ORD = ['First', 'Second', 'Third', 'Fourth', 'Fifth'];
const KANJI = ['初重', '二重', '三重', '四重', '五重'];

export const PARTS = [
  { id: 'kidan', name: 'Stone platform', jp: '基壇 · kidan', group: 'Base',
    blurb: 'A stone podium keeps the wooden pagoda off the damp ground, with steps on all four sides. Deep inside, the central pillar stands on a foundation stone that held relics of the Buddha.' },
];
for (let i = 0; i < 5; i++){
  PARTS.push({ id: `body${i}`, name: `${ORD[i]} storey`, jp: `${KANJI[i]} · ${['shojū', 'nijū', 'sanjū', 'shijū', 'gojū'][i]}`, group: `Storey ${i + 1}`,
    blurb: i === 0
      ? 'The only storey you can see inside. Four Buddhas sit round the central pillar, facing north, south, east and west. Each side is three bays wide, so twelve vermilion pillars stand round the edge. On top, kumimono brackets step out three times (mitesaki) to carry the heavy eaves far out over the walls.'
      : i === 4
        ? 'The smallest storey is about half as wide as the first. Like the others above the ground, it has no floor to walk on: it is a box of crossing beams. Its railing is only there for looks.'
        : 'This storey sits loosely on the roof below it. Nothing nails it down! In an earthquake each storey slides a little the opposite way to its neighbours, a wiggle called the "snake dance". Inside there is no room, just crossing beams.' });
  PARTS.push({ id: `roof${i}`, name: `${ORD[i]} roof`, jp: `${['一', '二', '三', '四', '五'][i]}重目の屋根 · yane`, group: `Storey ${i + 1}`,
    blurb: i === 0
      ? 'The widest roof. Two rows of rafters hold it up: round base rafters (jidaruki) and square flying rafters (hiendaruki), their ends painted white. The five roofs shrink upward in the ratio 10 : 9 : 8 : 7 : 6.'
      : i === 4
        ? 'The top roof rises steeper to a point, where the bronze spire is fixed. The big eaves throw rain clear of the walls, which is why wooden pagodas can last over 1,300 years.'
        : 'Rows of round and flat clay tiles (hongawara) cover each roof. A bronze wind bell (fūtaku) hangs from every corner: 20 bells in all, ringing in the wind to keep bad luck away.' });
}
PARTS.push(
  { id: 'shinbashira', name: 'Central pillar', jp: '心柱 · shinbashira', group: 'Core',
    blurb: 'One tall tree trunk runs up the middle, but it holds up none of the floors! It hangs free inside the storeys. In an earthquake it sways like an upside-down pendulum and stops them swinging too far. Tokyo Skytree copied this idea.' },
  { id: 'roban', name: 'Dew basin', jp: '露盤 · roban', group: 'Spire',
    blurb: 'The square base of the bronze spire. It caps the top of the roof so rain cannot leak in around the pillar.' },
  { id: 'fukubachi', name: 'Upturned bowl', jp: '伏鉢 · fukubachi', group: 'Spire',
    blurb: 'A bowl turned upside down. It stands for the dome of a stupa, the round burial mound of the Buddha in ancient India.' },
  { id: 'ukebana', name: 'Lotus flower', jp: '請花 · ukebana', group: 'Spire',
    blurb: '"Receiving flower": a ring of eight lotus petals that holds up the rings above.' },
  { id: 'kurin', name: 'Nine rings', jp: '九輪 · kurin', group: 'Spire',
    blurb: 'The biggest part of the spire. The nine rings come from the stack of umbrellas over a stupa, a sign of honour. Some pagodas have only seven or eight.' },
  { id: 'suien', name: 'Water flame', jp: '水煙 · suien', group: 'Spire',
    blurb: 'Four flame-shaped sheets of bronze. They look like fire, but they are called "water smoke": a charm to protect the wooden tower from fire.' },
  { id: 'ryusha', name: 'Dragon wheel', jp: '竜車 · ryūsha', group: 'Spire',
    blurb: 'A small wheel near the very top. Stone pagodas usually leave it out.' },
  { id: 'hoju', name: 'Sacred jewel', jp: '宝珠 · hōju', group: 'Spire',
    blurb: 'The wish-granting jewel of Buddhism, the very tip of the pagoda. The whole spire is about a third of the pagoda\'s height.' },
);

export const FACTS = [
  'Japan has 25 wooden five-storey pagodas that are national treasures or important cultural properties.',
  'Hōryū-ji\'s pagoda, in Nara, is about 1,300 years old: one of the oldest wooden buildings in the world.',
  'Tō-ji\'s pagoda in Kyoto is the tallest wooden pagoda in Japan: about 55 m, rebuilt in 1644.',
  'Of Japan\'s many wooden pagodas, almost none have ever been knocked down by an earthquake.',
  'The upper storeys have no floors: pagodas were made to be looked at, not climbed.',
];
