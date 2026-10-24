import polygonClipping from 'polygon-clipping';
export const ROAD_WIDTH_SCALE = 2;
export const W100 = 10.4;
export const WCMH = 9.6;
export const WIDTHS = {5:15.2,4:14.4,3:14,2:13.2,1:11};
export const isMetroRoad = r => Boolean(r.n && /Chinmaya|CMH|Old Madras/.test(r.n));
export const roadWidth = r => r.n?.includes('100 Feet') ? W100 : isMetroRoad(r) ? WCMH : (WIDTHS[r.k] || 14);
// Expand divided carriageway separation before city, collision raster and roadside placement.
export function prepareWideRoads(world) {
  if(world.__widePrepared)return;
  for(const metro of [false,true]){
    const segs=[];
    world.roads.forEach((r,ri)=>{if(metro?!isMetroRoad(r):!r.n?.includes('100 Feet'))return;for(let i=0;i<r.p.length-1;i++){const a=r.p[i],b=r.p[i+1],L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(L>.2)segs.push({ri,i,a,b,L,ux:(b[0]-a[0])/L,uz:(b[1]-a[1])/L});}});
    const shifts=new Map();
    for(const a of segs){let best=null;for(const b of segs){if(a.ri===b.ri||Math.abs(a.ux*b.ux+a.uz*b.uz)<.9)continue;const rx=(b.a[0]+b.b[0]-a.a[0]-a.b[0])/2,rz=(b.a[1]+b.b[1]-a.a[1]-a.b[1])/2,perp=-a.uz*rx+a.ux*rz,along=a.ux*rx+a.uz*rz;if(Math.abs(perp)<5||Math.abs(perp)>35||Math.abs(along)>(a.L+b.L)/2)continue;if(!best||Math.abs(perp)<Math.abs(best))best=perp;}
      if(best===null)continue;
      const gap=metro?Math.max(1.2,Math.abs(best)-4.8):2.4;
      const target=(metro?WCMH:W100)+gap;
      const shift=(Math.abs(best)-target)/2*Math.sign(best);
      for(const pi of [a.i,a.i+1]){const k=a.ri+':'+pi;if(!shifts.has(k))shifts.set(k,[-a.uz*shift,a.ux*shift]);}
    }
    for(const [k,v]of shifts){const [ri,pi]=k.split(':').map(Number);world.roads[ri].p[pi][0]+=v[0];world.roads[ri].p[pi][1]+=v[1];}
  }
  world.__widePrepared=true;
}
// Clip the actual footprints, shared by visuals and occupancy, outside the widened carriageway + pavement.
export function clearWideRoadBuildings(world){
  const segs=[];const grid=new Map(),G=32;
  for(const r of world.roads){const hw=roadWidth(r)/2+2.8;for(let i=0;i<r.p.length-1;i++){const a=r.p[i],b=r.p[i+1],dx=b[0]-a[0],dz=b[1]-a[1],L=Math.hypot(dx,dz);if(L<.2)continue;const nx=-dz/L*hw,nz=dx/L*hw,ex=dx/L*hw,ez=dz/L*hw;const p=[[a[0]-ex+nx,a[1]-ez+nz],[b[0]+ex+nx,b[1]+ez+nz],[b[0]+ex-nx,b[1]+ez-nz],[a[0]-ex-nx,a[1]-ez-nz]];for(const q of p){q[0]=Math.round(q[0]*1000)/1000;q[1]=Math.round(q[1]*1000)/1000;}p.push(p[0]);const box=[Math.min(...p.map(q=>q[0])),Math.min(...p.map(q=>q[1])),Math.max(...p.map(q=>q[0])),Math.max(...p.map(q=>q[1]))],j=segs.length;segs.push({p,box});for(let x=Math.floor(box[0]/G);x<=Math.floor(box[2]/G);x++)for(let z=Math.floor(box[1]/G);z<=Math.floor(box[3]/G);z++){const k=x+','+z;if(!grid.has(k))grid.set(k,[]);grid.get(k).push(j);}}}
  const out=[];let changed=0;
  for(const b of world.buildings){const p=b.p,box=[Math.min(...p.map(q=>q[0])),Math.min(...p.map(q=>q[1])),Math.max(...p.map(q=>q[0])),Math.max(...p.map(q=>q[1]))],near=new Set();for(let x=Math.floor(box[0]/G);x<=Math.floor(box[2]/G);x++)for(let z=Math.floor(box[1]/G);z<=Math.floor(box[3]/G);z++)for(const j of grid.get(x+','+z)||[])near.add(j);
    let polys=[[p]],did=false;
    for(const j of near){const s=segs[j];if(s.box[2]<box[0]||s.box[0]>box[2]||s.box[3]<box[1]||s.box[1]>box[3])continue;let next;try{next=polygonClipping.difference(polys,[s.p]);}catch{next=[];}if(JSON.stringify(next)!==JSON.stringify(polys))did=true;polys=next;if(!polys.length)break;}
    if(!did){out.push(b);continue;}changed++;
    for(const poly of polys){if(poly.length>1)continue;const ring=poly[0];let area=0;for(let i=1;i<ring.length;i++)area+=ring[i-1][0]*ring[i][1]-ring[i][0]*ring[i-1][1];if(Math.abs(area)/2>=12)out.push({...b,p:ring});}
  }
  world.buildings=out;world.wideClearance={changed,buildings:out.length};
}
