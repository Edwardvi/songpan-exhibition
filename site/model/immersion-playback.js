import * as THREE from 'three';

const formatTime=seconds=>{const n=Math.floor(Number.isFinite(seconds)?seconds:0);return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;};
export function createImmersionPlayback({enabled,requestRender,beforePlay}){
  const byId=id=>document.getElementById(id),panel=byId('immersion-controls'),playButton=byId('immersion-play'),seek=byId('immersion-seek'),muteButton=byId('immersion-mute'),volume=byId('immersion-volume'),status=byId('immersion-status');
  const video=document.createElement('video');video.id='immersion-video';video.preload='none';video.playsInline=true;video.loop=true;video.volume=.65;video.hidden=true;video.setAttribute('aria-hidden','true');document.body.append(video);
  const bindings=[];
  let filmMaskCompiled=false,active=false,mode='static',staticChosen=false,requested=false,texture=null,material=null,frameCallback=null,fallbackFrame=null,presentedFrames=0,lastError='',mapping=null;
  function updateControls(){
    playButton.textContent=video.paused?'播放':'暂停';playButton.setAttribute('aria-label',video.paused?'播放沉浸区动态预览':'暂停沉浸区动态预览');
    byId('immersion-dynamic').setAttribute('aria-pressed',String(mode==='dynamic'));byId('immersion-static').setAttribute('aria-pressed',String(mode==='static'));
    byId('immersion-current').textContent=formatTime(video.currentTime);byId('immersion-duration').textContent=formatTime(video.duration||71.03);
    seek.disabled=mode==='static'||!Number.isFinite(video.duration);seek.max=String(video.duration||71.03);seek.value=String(video.currentTime);seek.setAttribute('aria-valuetext',`${formatTime(video.currentTime)} / ${formatTime(video.duration||71.03)}`);
    muteButton.textContent=video.muted||video.volume===0?'开启声音':'静音';muteButton.setAttribute('aria-pressed',String(video.muted));volume.value=String(video.volume);
    status.textContent=lastError||(mode==='static'?'夜空静态':video.readyState<2?'正在载入':video.paused?'效果参考 · 已暂停':'效果参考 · 71秒');
  }
  function stopFrames(){if(frameCallback!==null){video.cancelVideoFrameCallback(frameCallback);frameCallback=null;}if(fallbackFrame!==null){cancelAnimationFrame(fallbackFrame);fallbackFrame=null;}}
  function watchFrames(){
    if(!active||mode!=='dynamic'||video.paused||document.hidden)return;
    if(video.requestVideoFrameCallback){if(frameCallback!==null)return;frameCallback=video.requestVideoFrameCallback(()=>{frameCallback=null;if(!active||mode!=='dynamic'||video.paused||document.hidden)return;presentedFrames++;requestRender();watchFrames();});}
    else if(fallbackFrame===null)fallbackFrame=requestAnimationFrame(()=>{fallbackFrame=null;if(!active||mode!=='dynamic'||video.paused||document.hidden)return;presentedFrames++;requestRender();watchFrames();});
  }
  function pause(){video.pause();stopFrames();updateControls();requestRender();}
  function applyMode(){
    for(const b of bindings){const dynamic=mode==='dynamic'&&texture;b.mesh.geometry=dynamic?b.dynamicGeometry:b.originalGeometry;b.mesh.material=dynamic?material:b.originalMaterial;}
    requestRender();updateControls();
  }
  async function play(){
    if(!enabled||!active||document.hidden||document.querySelector('dialog[open]'))return;
    if(!bindings.length){lastError='墙面尚在准备，请稍后点击播放';updateControls();return;}
    beforePlay();lastError='';staticChosen=false;mode='dynamic';applyMode();
    if(!requested){requested=true;video.src='./media/immersion-reference-web.mp4';video.load();}else if(video.error)video.load();
    try{await video.play();if(!active||mode!=='dynamic'||document.hidden){pause();return;}watchFrames();updateControls();}
    catch(error){if(error.name==='AbortError')return;lastError=error.name==='NotAllowedError'?'点击播放继续体验':'视频暂未播放，请点击播放重试';updateControls();}
  }
  function chooseStatic(){staticChosen=true;mode='static';lastError='';pause();applyMode();}
  playButton.addEventListener('click',()=>video.paused?play():pause());byId('immersion-dynamic').addEventListener('click',play);byId('immersion-static').addEventListener('click',chooseStatic);
  muteButton.addEventListener('click',()=>{if(video.volume===0)video.volume=.65;video.muted=!video.muted;updateControls();});
  volume.addEventListener('input',()=>{video.volume=Number(volume.value);video.muted=video.volume===0;updateControls();});
  seek.addEventListener('input',()=>{if(mode==='dynamic'&&Number.isFinite(video.duration))video.currentTime=Number(seek.value);requestRender();updateControls();});
  video.addEventListener('loadeddata',()=>{
    if(!texture){texture=new THREE.VideoTexture(video);texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=false;texture.wrapS=THREE.ClampToEdgeWrapping;material.map=texture;material.needsUpdate=true;}
    applyMode();
  });
  for(const name of ['timeupdate','durationchange','loadedmetadata','waiting','volumechange'])video.addEventListener(name,updateControls);
  video.addEventListener('play',()=>{watchFrames();updateControls();});video.addEventListener('pause',()=>{stopFrames();requestRender();updateControls();});video.addEventListener('seeked',()=>{requestRender();updateControls();});
  video.addEventListener('error',()=>{lastError='视频载入失败，请检查预览服务后重试';stopFrames();updateControls();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});window.addEventListener('pagehide',pause);
  new MutationObserver(()=>{if(byId('exhibit-dialog').open)pause();}).observe(byId('exhibit-dialog'),{attributes:true,attributeFilter:['open']});
  updateControls();
  return {
    play,pause,
    enter(){if(!staticChosen)return play();},
    setContext({chapter,view}){active=enabled&&chapter==='immersion'&&view.startsWith('immersive_');panel.hidden=!active;document.body.classList.toggle('immersion-active',active);if(!active)pause();updateControls();},
    async attach(root){
      if(!enabled)return;
      const meshes=[];root.traverse(o=>{if(o.isMesh&&!Array.isArray(o.material)&&o.material.name==='R22_Night_wall_unlit_UV')meshes.push(o);});if(!meshes.length)return;
      const response=await fetch('./assets/immersion-wall-uv-v24.json');if(!response.ok)throw Error('沉浸墙面坐标未载入');mapping=await response.json();
      for(const mesh of meshes){
        const p=mesh.geometry.getAttribute('position');if(p.count!==mapping.source_vertex_count||mapping.positions.some((v,i)=>Math.abs(v[0]-p.getX(i))>1e-5||Math.abs(v[1]-p.getY(i))>1e-5||Math.abs(v[2]-p.getZ(i))>1e-5))throw Error('沉浸墙面坐标与模型不匹配');
        const dynamicGeometry=mesh.geometry.clone();dynamicGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(mapping.uv.flat(),2));
        if(!material){
          material=new THREE.MeshBasicMaterial({name:'IMMERSION_Reference_video_walls',color:0xffffff,side:mesh.material.side,toneMapped:false});
          material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
            #ifdef USE_MAP
              float filmMask=step(0.0,vMapUv.x)*step(vMapUv.x,1.0)*step(0.0,vMapUv.y)*step(vMapUv.y,1.0);
              diffuseColor.rgb*=filmMask;
            #endif`);filmMaskCompiled=shader.fragmentShader.includes('diffuseColor.rgb*=filmMask;');};
          material.customProgramCacheKey=()=> 'immersion-v24-whole-film-mask';
        }
        bindings.push({mesh,originalGeometry:mesh.geometry,originalMaterial:mesh.material,dynamicGeometry});
      }
      applyMode();
    },
    diagnostics(){return {enabled,active,mode,staticChosen,requested,paused:video.paused,currentTime:video.currentTime,duration:video.duration||null,width:video.videoWidth,height:video.videoHeight,muted:video.muted,volume:video.volume,loop:video.loop,readyState:video.readyState,error:lastError,presentedFrames,textureVersion:texture?.version||0,textureIsVideo:!!texture?.isVideoTexture,textureFlipY:texture?.flipY,source:video.getAttribute('src'),wallBatches:bindings.length,wallPieces:mapping?mapping.source_vertex_count/4:0,wallSides:mapping?.groups.length||0,toneMapped:material?.toneMapped,activeMaterials:bindings.map(b=>b.mesh.material.name),activeGeometry:bindings.map(b=>b.mesh.geometry===b.originalGeometry?'original':'videoUV'),mappingAspect:mapping?.image_aspect||null,mappingVersion:mapping?.version||null,mappingMode:mapping?.mapping||null,filmRepeatCount:mapping?.film_repeat_count||null,perimeter:mapping?.perimeter_m||null,seam:mapping?.seam||null,filmWidth:mapping?.film_width_m||null,filmHeight:mapping?.film_height_m||null,filmSides:mapping?.film_sides||[],darkMargin:mapping?.dark_margin_m||0,videoWindow:mapping?.video_window||null,horizontalStretch:mapping?.horizontal_stretch,filmMaskCompiled,textureWrapS:texture?.wrapS,activeUV:bindings.map(b=>{const uv=b.mesh.geometry.getAttribute('uv');return {count:uv.count,uMin:Math.min(...Array.from(uv.array).filter((_,i)=>i%2===0)),uMax:Math.max(...Array.from(uv.array).filter((_,i)=>i%2===0)),vMin:Math.min(...Array.from(uv.array).filter((_,i)=>i%2===1)),vMax:Math.max(...Array.from(uv.array).filter((_,i)=>i%2===1))};})};}
  };
}
