# ⛩ Pagoda — a scan-to-explore WebAR five-storey pagoda

Point your phone at the printed **pagoda illustration**. A realistic 3D Japanese five-storey
pagoda (五重塔, gojū-no-tō) appears standing on it, like a model on the table. Walk or turn the
phone round it to see every side. **Touch the pagoda and it comes apart** into its 19 parts,
storey by storey, so you can see how it is built. Touch any part to learn what it is. Made for ages 8–15.

**Play:** https://naomirajwanshi02.github.io/Pagoda/
**Without the picture:** https://naomirajwanshi02.github.io/Pagoda/?demo=1 (the pagoda over the live camera, drag to turn it)
**The picture to scan:** [`target.png`](target.png), the painted pagoda illustration (`assets/illustration.jpg`)

## How it works

1. The page opens straight into the camera viewfinder. MindAR *image tracking* looks for the illustration.
2. When it's found, the pagoda is **anchored on it** like a real model on the table: nothing of the picture is
   drawn, only the pagoda and its shadow. Walk round it, tilt or turn the phone, and you see it from every side.
   A one-finger drag also turns it on its base.
3. If the picture slips out of view, the phone's **gyroscope holds the pagoda where it was in the room** (a small
   cue says so). Point back at the picture and it eases back onto it. On iPhone, the first touch asks for motion access.
4. **Touch the pagoda** and it comes apart from the top down: each roof lifts off its body, each body lifts off the
   roof below, the bronze spire splits into its seven pieces and the central pillar slides out to the side.
5. **Touch a part** to pick it: it keeps its colour and glows softly, everything else fades, and the card at the top says
   what it is and what it does. The ‹ › arrows step through all 19 parts.
6. **Touch empty space** to let go of a part; touch empty space again to put the pagoda back together.
7. **Earthquake!** shakes the ground. Each storey sways the opposite way to its neighbours (the "snake dance")
   while the free-hanging pillar sways slowly. The explanation shows in the top card while it shakes, so no text
   ever covers the pagoda. It works assembled or apart.

## The model

Built in code from the real construction, no 3D files ([`js/pagoda.js`](js/pagoda.js)). **The illustration is
used only for image tracking**: the model's shape comes from published measurements of Hōryū-ji's pagoda, and its
colours from the reference photos in `assets/refs/` (Kiyomizu-dera). Every fact is in [SOURCES.md](SOURCES.md).

| # | Part | | What's modelled |
|---|---|---|---|
| 01 | Stone platform | 基壇 kidan | stone podium with coping, plinth, steps on all four sides, the foundation stone (shinso) that holds the relics, under the pillar |
| 02–10 | Five storeys | 初重…五重 | sill, 12 pillars on a 3 × 3-bay plan, plaster walls, studded double doors, green renji-mado windows (ground floor), three nageshi tie-beams; **mitesaki** three-step brackets: daito blocks, stepped tōmono beams with plaster boards, hijiki arms each carrying three makito bearing blocks, slanting **odaruki** tail rafters through the second step, the round **gangyō** purlin on the top step, diagonal corner sets, yellow-painted ends; balcony and kōran railing with giboshi caps (upper storeys). Ground floor inside: altar, four inner pillars, four Buddhas facing the four directions. Upper storeys inside: just crossing beams |
| 03–11 | Five roofs | 屋根 yane | parallel double rafters (jidaruki + flying hiendaruki) with yellow ends, the great hip rafter (sumigi), plastered soffit, vermilion fascia, concave tiled sweep with up-curled corners (hongawara tiles with relief), round tile ends along the eave, hip ridges (sumimune) with demon tiles, a bronze wind bell at each corner (20 bells) |
| 12 | Central pillar | 心柱 shinbashira | an eight-sided cypress trunk with iron splice bands, standing free up the middle on the foundation stone |
| 13–19 | The spire | 相輪 sōrin | dew basin, upturned bowl, eight-petal lotus, nine rings on the mast, four openwork water-flame fins, dragon wheel, sacred jewel |

## Architecture cross-check

Measured from the built model against the sources:

| Feature | Real pagoda | Model | |
|---|---|---|---|
| Total height | Hōryū-ji 32.45 m | 32.6 m | ✓ |
| First storey width | 6.42 m | 6.42 m | ✓ |
| Fifth storey / first storey width | 0.503 | 0.502 | ✓ |
| Main part height / first storey width | 3.57 | 3.54 | ✓ |
| Spire : total height | about 1 : 3.4 | 1 : 3.75 | slightly short |
| Roof sizes, bottom to top | 10 : 9 : 8 : 7 : 6 | 10 : 9 : 8 : 7 : 6 | ✓ |
| First eave / first body width | 2.2 | 2.2 | ✓ |
| Bracket type | mitesaki: 3 projecting steps, 3 makito per arm, odaruki through the 2nd step carrying the 3rd, gangyō purlin on top | as described | ✓ (odaruki, makito trios and gangyō added in this check) |
| Rafters | parallel, two tiers | parallel, two tiers | ✓ |
| Storeys | stacked loosely, upper ones with no usable floor | separate parts, upper ones hold only beams | ✓ |
| Central pillar | carries no floors, stands on the relic stone | free-standing on the shinso | ✓ |
| Spire parts in order | roban, fukubachi, ukebana, kurin (9), suien (4 fins at 90°), ryūsha, hōju | same | ✓ |
| Hip ridge term | sumimune (隅棟) | was mislabelled *kudarimune*, fixed | ✓ |

Not modelled: details specific to Hōryū-ji that the sources found did not confirm (the bay count of each upper
storey, the exact form of its podium), and the clay figure groups inside its first storey.
The model is a general five-storey pagoda in Hōryū-ji's proportions, with four Buddhas on the altar as in many
later pagodas.

## The look: a realistic scale model

The same recipe as sushi-ar and Noh_Masks ([`js/look.js`](js/look.js)):

- **Physically based materials painted in code**, nothing downloaded: brushed vermilion lacquer, mottled lime
  plaster, cypress grain, fired-clay roof tiles with real relief (round cover tiles, laps and per-tile colour),
  granite blocks, bronze with verdigris, gilt.
- **A studio environment** for the lacquer, tiles and bronze to reflect, and **filmic tone mapping**.
- **A warm key light with soft shadows** that fall on the real table or paper, a fill and a rim. The lights live in
  the pagoda's own space, so as you walk round it the sun stays put, like light in a real room.
- **Room light matching**: twice a second the camera image is sampled, and the exposure and fill ease toward its
  brightness and tint.
- **Calm motion**: every part rides a critically damped spring (no bounce) to its exploded offset, staggered top-down.
- The UI keeps the Anatomy sepia style of the other repos, pared down to one card at the top and the controls at the bottom. The skill is
  installed for this workspace at `../.claude/skills/anatomy`; the kit's CSS is in [`vendor/anatomy/`](vendor/anatomy).

## The tracking picture

The illustration (`assets/illustration.jpg`, 1149 × 2000) is copied to `target.png` at 804 × 1400 and compiled to
`targets.mind`. It scores **2,086 detection points over 10 scales and 74 tracking points** (Ramen_Builder: 3,847 / 58,
sushi-ar: 1,877 / 52). The white background has no features, so the tracker locks onto the pagoda itself: keep the
whole painting in view, in even light.

- Print it about **12 cm wide** (about 12 × 21 cm), on matte paper, or show it on a screen.
- The 3D pagoda stands at the picture's centre. Its first roof spans 60% of the picture's width
  (`ROOF_ON_CARD` in [`js/stage.js`](js/stage.js)). The picture is only what the camera recognises: the model does not copy it.
- To change the picture: `http://localhost:8124/tools/make-target.html?src=../assets/illustration.jpg&build=1`
  (keep the browser window in view while it compiles: MindAR's compiler pauses in a background tab).

## Files

| File | What it is |
|---|---|
| `index.html` | Viewfinder, found badge, HUD (one info card, hint, part arrows, earthquake, held cue), errors. |
| `js/app.js` | The flow: scan → found → touch to take apart → pick parts → touch empty space to rebuild → quake. |
| `js/stage.js` | MindAR anchoring with the gyroscope hold (or the `?demo=1` orbit view), touch picking and drag-to-turn, the springs, the fit, the quake. |
| `js/pagoda.js` | The model: platform, storey bodies, roofs, pillar, spire, and each part's exploded offset. |
| `js/look.js` | Renderer, environment, lights and shadows, room-light matching, painted PBR textures and materials. |
| `js/data.js` | The 19 parts' names and blurbs in plain English, and the earthquake card. |
| `tools/make-target.html` | Makes `target.png` (placeholder or your illustration) and compiles `targets.mind`. |
| `tools/serve.ps1` | Local dev server on port 8124, no Node or Python needed. |
| `assets/refs/` | The reference photos. |

## Run locally

```bash
powershell -ExecutionPolicy Bypass -File tools/serve.ps1
```

Then open http://localhost:8124/?demo=1. A phone needs HTTPS for the camera (for example GitHub Pages, like the
other repos). `?target=./other.mind` swaps the target; `?beta=` and `?mincf=` tune MindAR's
smoothing filter.

Version pins: `mind-ar@1.2.5` needs `three@0.160.0`, because three r162 removed `sRGBEncoding`. These are the
same pins as Ramen_Builder, Noh_Masks and sushi-ar.
