# Indiranagar Island

Drive an auto-rickshaw through a 3D Indiranagar, Bengaluru, built from OpenStreetMap data. Three.js + Vite.

- Run: `npm install && npx vite`
- Rebuild map data: `node scripts/prep.mjs`

Live: https://indiranagar.vercel.app

## Map data

Roads, buildings and place names come from OpenStreetMap, which is open data under the Open Database Licence (ODbL). Copyright OpenStreetMap contributors: https://www.openstreetmap.org/copyright

- `public/data/world.json`, `extras.json`: Indiranagar, from `scripts/prep.mjs`.
- `public/data/domlur.json`: the Domlur flyover area and HAL Old Airport Road, from the Overpass API via `scripts/build-domlur.mjs`.

The flyover is a simplified model: the two main carriageways only, with approximate deck height and ramp lengths. It is not an exact replica.
