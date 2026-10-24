import re, sys
# Strip debug markers from alley-fix source for preview builds. Idempotent.
s=open('src/vehicles.js').read()
# 1) pickLog debug block inside pickRoadPlacement
m=re.search(r"\n    if \(typeof window !== 'undefined'\) \{ // DEBUG: pop-in investigation.*?\n    \}\n", s, re.S)
if m: s=s[:m.start()]+"\n"+s[m.end():]
lines=s.split('\n'); out=[]
for ln in lines:
    if 'window.__trc = window.__trc' in ln: continue
    if 'window.__jumpLog' in ln: continue
    if 'window.__parkedSpots' in ln: continue
    if 'window.__rcLog' in ln: continue
    out.append(ln)
s='\n'.join(out)
s=re.sub(r" *tu\.__held = \(tu\.__held \|\| 0\) \+ 1; tu\.__why = [^\n]*\n", "\n", s)
for tag in [" tu.__site = 'trans';"," tu.__site = 'hold';"," tu.__site = 'pick';"," tu.__site = 'revert';"]:
    s=s.replace(tag,"")
left=re.findall(r"__trc|__held|__why|__site|__pickLog|__pickN|__rcLog|__jumpLog|__parkedSpots", s)
print("vehicles leftovers:", left)
open('src/vehicles.js','w').write(s)
m=open('src/main.js').read()
m=re.sub(r" window\.__pick = \(nx, ny\) => \{.*?\}\)\); \};","",m)
for g in [" window.__inDivider = inDivider;"," window.__spawnAt = spawnAt;"," Object.defineProperty(window, '__peds', { get: () => crowd && crowd.peds });"," window.__placeOnRoad = placeOnRoad;"," window.__traffic = () => traffic;"," window.__solid = solid;"]:
    m=m.replace(g,"")
m=m.replace("    const pr = window.__placeOnRoad ? window.__placeOnRoad(auto.x, auto.z) : null;\n","")
left=re.findall(r"__pick\b|__inDivider|__spawnAt|__peds|__placeOnRoad|__traffic\b|__solid", m)
print("main leftovers:", left)
open('src/main.js','w').write(m)
sys.exit(1 if (left) else 0)
