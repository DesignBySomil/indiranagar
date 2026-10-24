let context=null,volume=1,muted=false;
const outputs=new Map();
export function getAudioContext(){
  try{if('audioSession' in navigator)navigator.audioSession.type='playback';}catch{}
  if(!context){const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return null;context=new Ctx();}
  if(context.state!=='running')context.resume().catch(()=>{});
  return context;
}
export function createAudioOutput(level=1){const ctx=getAudioContext();if(!ctx)return null;const gain=ctx.createGain();outputs.set(gain,level);gain.gain.value=muted?0:volume*level;gain.connect(ctx.destination);return gain;}
export function setAudioVolume(value,isMuted){volume=Math.max(0,Math.min(1,value));muted=Boolean(isMuted);for(const [gain,level]of outputs)gain.gain.setTargetAtTime(muted?0:volume*level,context.currentTime,.015);}
