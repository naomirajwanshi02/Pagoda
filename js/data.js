// The pagoda's parts, bottom to top, in the order they come apart, in plain English.
// Every fact is sourced in SOURCES.md. Written for ages 8–15.

export const PAGODA = {
  name: 'Five-storey pagoda',
  blurb: 'A Buddhist tower built from wood, with no nails holding the storeys together. Touch it to take it apart.',
};

export const QUAKE = {
  name: 'Earthquake!',
  blurb: 'The storeys are only stacked, not nailed, so each one slides a little the opposite way to its neighbours, a wiggle called the "snake dance". The free-hanging central pillar sways slowly and stops them swinging too far.',
};

const ORD = ['First', 'Second', 'Third', 'Fourth', 'Fifth'];

export const PARTS = [
  { id: 'kidan', name: 'Stone platform',
    blurb: 'A stone podium keeps the wooden pagoda off the damp ground, with steps on all four sides. Deep inside, the central pillar stands on a foundation stone that held relics of the Buddha.' },
];
for (let i = 0; i < 5; i++){
  PARTS.push({ id: `body${i}`, name: `${ORD[i]} storey`,
    blurb: i === 0
      ? 'The only storey you can see inside. Four Buddhas sit round the central pillar, facing north, south, east and west. Each side is three bays wide, so twelve vermilion pillars stand round the edge. On top, wooden brackets step out three times to carry the heavy eaves far out over the walls.'
      : i === 4
        ? 'The smallest storey is about half as wide as the first. Like the others above the ground, it has no floor to walk on: it is a box of crossing beams. Its railing is only there for looks.'
        : 'This storey sits loosely on the roof below it. Nothing nails it down! In an earthquake each storey slides a little the opposite way to its neighbours, a wiggle called the "snake dance". Inside there is no room, just crossing beams.' });
  PARTS.push({ id: `roof${i}`, name: `${ORD[i]} roof`,
    blurb: i === 0
      ? 'The widest roof. Two rows of rafters hold it up: base rafters inside and "flying" rafters out to the edge, their ends painted yellow. The five roofs shrink upward in the ratio 10 : 9 : 8 : 7 : 6.'
      : i === 4
        ? 'The top roof rises steeper to a point, where the bronze spire is fixed. The big eaves throw rain clear of the walls, which is why wooden pagodas can last over 1,300 years.'
        : 'Rows of round and flat clay tiles cover each roof. A bronze wind bell hangs from every corner: 20 bells in all, ringing in the wind to keep bad luck away.' });
}
PARTS.push(
  { id: 'shinbashira', name: 'Central pillar',
    blurb: 'One tall tree trunk runs up the middle, but it holds up none of the floors! It hangs free inside the storeys. In an earthquake it sways like an upside-down pendulum and stops them swinging too far. Tokyo Skytree copied this idea.' },
  { id: 'roban', name: 'Dew basin',
    blurb: 'The square base of the bronze spire. It caps the top of the roof so rain cannot leak in around the pillar.' },
  { id: 'fukubachi', name: 'Upturned bowl',
    blurb: 'A bowl turned upside down. It stands for the dome of a stupa, the round burial mound of the Buddha in ancient India.' },
  { id: 'ukebana', name: 'Lotus flower',
    blurb: 'A ring of eight lotus petals that holds up the rings above.' },
  { id: 'kurin', name: 'Nine rings',
    blurb: 'The biggest part of the spire. The nine rings come from the stack of umbrellas over a stupa, a sign of honour. Some pagodas have only seven or eight.' },
  { id: 'suien', name: 'Water flame',
    blurb: 'Four flame-shaped sheets of bronze. They look like fire, but they are called "water smoke": a charm to protect the wooden tower from fire.' },
  { id: 'ryusha', name: 'Dragon wheel',
    blurb: 'A small wheel near the very top. Stone pagodas usually leave it out.' },
  { id: 'hoju', name: 'Sacred jewel',
    blurb: 'The wish-granting jewel of Buddhism, the very tip of the pagoda. The whole spire is about a third of the pagoda\'s height.' },
);
