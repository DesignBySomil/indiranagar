// Alley centreline repair: OSM centrelines of 7 narrow alley segments run through
// building footprints; these replace the segment with a routed lane that keeps
// 1.05 m clearance from the game's own collision raster. Buildings are untouched.
export const ALLEY_FIX = {"190":[[1,[[548,-564],[543.5,-567.5],[521.5,-568.5]]]],"251":[[0,[[380,49.5],[378,49],[376.5,47.5],[376.5,27.5],[378.5,23.5]]]],"315":[[0,[[520,-528],[522,-529.5],[523,-530.5],[522.5,-566.5],[521.5,-568.5]]]],"320":[[0,[[513.5,-503.5],[489.5,-503.5],[482,-500]]]],"356":[[3,[[315,-577],[311.5,-575],[295,-576],[293.5,-577.5],[287.5,-579]]]],"321":[[2,[[605.5,-541],[603,-562],[601.5,-563.5],[601,-563.5]],3]],"318":[[0,[[615,-562.5],[615,-564],[613.5,-565.5],[605,-565.5],[601,-563.5],[601,-564],[599.5,-565.5],[586,-565],[582,-563]],3]]};
export function applyAlleyFix(roads) {
  for (const [ri, reps] of Object.entries(ALLEY_FIX)) {
    const r = roads[+ri]; if (!r) continue;
    for (const [i, pts, n = 2] of reps.sort((a, b) => b[0] - a[0])) r.p.splice(i, n, ...pts);
  }
}
