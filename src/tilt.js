// Gentle steering: ignore small hand movement, then ramp gradually.
export function tiltResponse(delta){
  const wrapped=((delta+180)%360+360)%360-180;
  const magnitude=Math.abs(wrapped);
  if(magnitude<=7)return 0;
  const t=Math.min(1,(magnitude-7)/35);
  return -Math.sign(wrapped)*.45*t*t;
}
export function smoothTilt(current,target,dt){return current+(target-current)*(1-Math.exp(-Math.max(0,dt)/.18));}
