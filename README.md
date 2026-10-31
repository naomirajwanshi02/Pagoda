# ⛩ Pagoda — a scan-to-explore WebAR five-storey pagoda

Point your phone at the printed **pagoda illustration**. A 3D Japanese five-storey
pagoda (五重塔, gojū-no-tō) stands on the picture and stays on it while you walk
round. **Tap it and it comes apart** into its 19 parts, storey by storey, so you can
see how it is built. Tap any part to learn what it is. Made for ages 8–15.

**Play locally:** `http://localhost:8124/`
**Without the picture:** `?demo=1`
**The picture to scan:** [`target.png`](target.png), the painted pagoda illustration (`assets/illustration.jpg`)

## How it works

1. The page opens straight into the camera viewfinder. MindAR *image tracking* looks for the illustration.
2. When it's found, the pagoda stands on it. It is **anchored to the picture** the whole time: tilt the
   picture or walk round it and the pagoda moves with it. Lose the picture and a cue asks you to point back at it.
3. **Tap the pagoda** (anywhere on screen) and it comes apart from the top down: each roof lifts off its body,
   each body lifts off the roof below, the bronze spire splits into its seven pieces and the central pillar
   slides out to the side. The whole thing shrinks a little so it still fits on screen.
4. **Tap a part** to pick it: it keeps its colour, everything else fades to paper, and the name card says what it
   is (English, kanji and romaji) and what it does. The ‹ › arrows step through all 19 parts.
5. **Earthquake!** shakes the ground. Each storey sways the opposite way to its neighbours (the "snake dance")
   while the free-hanging pillar sways slowly. It works assembled or apart.
6. **Put it back** closes it from the bottom up.

## The model

Built in code from the real construction, no 3D files ([`js/pagoda.js`](js/pagoda.js)). **The illustration is
used only for image tracking**: the model's shape comes from published measurements of Hōryū-ji's pagoda, and its
colours from the reference photos in `assets/refs/` (Kiyomizu-dera). Every fact is in [SOURCES.md](SOURCES.md).

| # | Part | | What's modelled |
|---|---|---|---|
| 01 | Stone platform | 基壇 kidan | stone podium with coping, plinth, steps on all four sides, the foundation stone (shinso) that holds the relics, under the pillar |
| 02–10 | Five storeys | 初重…五重 | sill, 12 pillars on a 3 × 3-bay plan, plaster walls, studded double doors, green renji-mado windows (ground floor), three nageshi tie-beams; **mitesaki** three-step brackets: daito blocks, stepped tōmono beams with plaster boards, hijiki arms each carrying three makito bearing blocks, slanting **odaruki** tail rafters through the second step, the round **gangyō** purlin on the top step, diagonal corner sets, yellow-painted ends; balcony and kōran railing with giboshi caps (upper storeys). Ground floor inside: altar, four inner pillars, four Buddhas facing the four directions. Upper storeys inside: just crossing beams |
| 03–11 | Five roofs | 屋根 yane | parallel double rafters (jidaruki + flying hiendaruki) with yellow ends, the great hip rafter (sumigi), plastered soffit, vermilion fascia, concave tiled sweep with up-curled corners (hongawara texture), hip ridges (sumimune) with demon tiles, a bronze wind bell at each corner (20 bells) |
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

## The Anatomy look

Drawn with the [Anatomy](https://github.com/wheresryan22/anatomy) skill's rules (MIT), the same way as Ramen_Builder
and Noh_Masks, in the shared sepia theme:

- **Four-tone flat shading** with the light fixed in view space: a part's lit top is its exact colour and the sides
  step down toward walnut ([`js/look.js`](js/look.js)). Colours are raw sRGB.
- **Ink outlines** on every solid, as an inverted hull pushed out a fixed number of *screen pixels*. MindAR measures
  the anchor in target-image pixels, so a world-space outline would change weight with distance.
- **A soft halo** under the platform so the pagoda sits on the paper.
- **Calm, sprung motion**: every part rides its own spring to its exploded offset, staggered top-down, sub-stepped
  so slow phones still move in real time.
- **Plates**: the name card is an Anatomy plate with `Fig. nn` top-left, the group top-right, the state bottom-left
  and a live `nn / 19` readout bottom-right.
- The skill itself is installed for this workspace at `../.claude/skills/anatomy`. The kit is in [`vendor/anatomy/`](vendor/anatomy).

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
| `index.html` | Viewfinder, found badge, HUD (name card, hint, controls), toast, errors. |
| `js/app.js` | The flow: scan → found → tap to take apart → pick parts → quake. |
| `js/stage.js` | MindAR tracking (or the `?demo=1` orbit view), taps and picking, the springs, the fit, the quake. |
| `js/pagoda.js` | The model: platform, storey bodies, roofs, pillar, spire, and each part's exploded offset. |
| `js/look.js` | The Anatomy shader, ink, pigments, tile and stone textures, halo. |
| `js/data.js` | The 19 parts' names, kanji, romaji and blurbs, and the facts. |
| `tools/make-target.html` | Makes `target.png` (placeholder or your illustration) and compiles `targets.mind`. |
| `tools/serve.ps1` | Local dev server on port 8124, no Node or Python needed. |
| `assets/refs/` | The reference photos. |

## Run locally

```bash
powershell -ExecutionPolicy Bypass -File tools/serve.ps1
```

Then open http://localhost:8124/?demo=1. A phone needs HTTPS for the camera (for example GitHub Pages, like the
other repos). `?target=./other.mind&card=./other.png` swaps the target; `?beta=` and `?mincf=` tune MindAR's
smoothing filter.

Version pins: `mind-ar@1.2.5` needs `three@0.160.0`, because three r162 removed `sRGBEncoding`. These are the
same pins as Ramen_Builder, Noh_Masks and sushi-ar.
