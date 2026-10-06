import * as THREE from 'three';

const source='./media/songpan-outdoor-web.mp4';
const screenCenter=[2.25,1.85,3.86],screenWidth=3,screenHeight=2;
const formatTime=seconds=>{const n=Math.floor(Number.isFinite(seconds)?seconds:0);return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;};

export function createFilmPlayback({enabled,requestRender}){
  const byId=id=>document.getElementById(id),panel=byId('film-controls'),playButton=byId('film-play'),muteButton=byId('film-mute'),seek=byId('film-seek'),volume=byId('film-volume'),status=byId('film-status');
  const video=document.createElement('video');video.id='film-video';video.preload='none';video.playsInline=true;video.hidden=true;video.volume=.65;video.setAttribute('aria-hidden','true');document.body.append(video);
  let active=false,requested=false,presentedFrames=0,frameCallback=null,fallbackFrame=null,lastError='',material=null,texture=null,attachedScreens=0,screen=null;
  const fill=new THREE.Vector2(1,1);
  function updateControls(){
    playButton.textContent=video.paused?'播放':'暂停';playButton.setAttribute('aria-label',video.paused?'播放宣传片':'暂停宣传片');
    muteButton.textContent=video.muted||video.volume===0?'开启声音':'静音';muteButton.setAttribute('aria-pressed',String(video.muted));
    byId('film-current').textContent=formatTime(video.currentTime);byId('film-duration').textContent=formatTime(video.duration||314.376);
    seek.disabled=!Number.isFinite(video.duration);seek.max=String(video.duration||314.376);seek.value=String(video.currentTime);
    seek.setAttribute('aria-valuetext',`${formatTime(video.currentTime)} / ${formatTime(video.duration||314.376)}`);
    volume.value=String(video.volume);status.textContent=lastError||(!requested?'点击播放':video.ended?'播放结束':video.readyState<2?'正在载入影片':video.paused?'已暂停':'正在播放');
  }
  function stopFrames(){if(frameCallback!==null){video.cancelVideoFrameCallback(frameCallback);frameCallback=null;}if(fallbackFrame!==null){cancelAnimationFrame(fallbackFrame);fallbackFrame=null;}}
  function watchFrames(){
    if(!active||video.paused||document.hidden)return;
    if(video.requestVideoFrameCallback){
      if(frameCallback!==null)return;
      frameCallback=video.requestVideoFrameCallback(()=>{frameCallback=null;if(!active||video.paused||document.hidden)return;presentedFrames++;requestRender();watchFrames();});
    }else if(fallbackFrame===null){fallbackFrame=requestAnimationFrame(()=>{fallbackFrame=null;if(!active||video.paused||document.hidden)return;presentedFrames++;requestRender();watchFrames();});}
  }
  function pause(){video.pause();stopFrames();updateControls();requestRender();}
  async function play(){
    if(!enabled||!active||document.hidden||document.querySelector('dialog[open]'))return;
    lastError='';if(!requested){requested=true;video.src=source;video.load();}else if(video.error)video.load();
    if(video.ended)video.currentTime=0;
    updateControls();
    try{await video.play();if(!active||document.hidden){pause();return;}watchFrames();updateControls();}
    catch(error){if(error.name==='AbortError')return;lastError=error.name==='NotAllowedError'?'点击播放继续观看':'影片暂未播放，请点击播放重试';updateControls();}
  }
  playButton.addEventListener('click',()=>video.paused?play():pause());
  muteButton.addEventListener('click',()=>{if(video.volume===0)video.volume=.65;video.muted=!video.muted;updateControls();});
  volume.addEventListener('input',()=>{video.volume=Number(volume.value);video.muted=video.volume===0;updateControls();});
  seek.addEventListener('input',()=>{if(Number.isFinite(video.duration))video.currentTime=Number(seek.value);updateControls();requestRender();});
  for(const name of ['timeupdate','durationchange','loadedmetadata','waiting','volumechange'])video.addEventListener(name,updateControls);
  video.addEventListener('loadedmetadata',()=>{const ratio=video.videoWidth/video.videoHeight,screenRatio=screenWidth/screenHeight;fill.set(Math.min(1,ratio/screenRatio),Math.min(1,screenRatio/ratio));updateControls();});
  video.addEventListener('loadeddata',()=>{
    if(material&&!texture){texture=new THREE.VideoTexture(video);texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=false;material.map=texture;material.color.set(0xffffff);material.needsUpdate=true;}
    requestRender();updateControls();
  });
  video.addEventListener('play',()=>{watchFrames();updateControls();});
  video.addEventListener('pause',()=>{stopFrames();updateControls();requestRender();});
  video.addEventListener('ended',()=>{stopFrames();updateControls();requestRender();});
  video.addEventListener('seeked',()=>{requestRender();updateControls();});
  video.addEventListener('error',()=>{lastError='影片载入失败，请检查预览服务后重试';updateControls();stopFrames();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
  window.addEventListener('pagehide',pause);
  new MutationObserver(()=>{if(document.getElementById('exhibit-dialog').open)pause();}).observe(document.getElementById('exhibit-dialog'),{attributes:true,attributeFilter:['open']});
  updateControls();
  return {
    play,pause,
    setContext({chapter,view}){active=enabled&&chapter==='film'&&view==='film_screen';panel.hidden=!active;document.body.classList.toggle('film-active',active);if(!active)pause();updateControls();},
    attach(root){
      if(!enabled)return;
      root.traverse(o=>{
        if(!o.isMesh)return;
        if(o.userData.sourceObjectNames==='R29_Film_image_identity'){o.userData.filmIdentity=true;o.visible=false;}
        const old=Array.isArray(o.material)?o.material:[o.material];
        if(!old.some(m=>m.name==='PROPOSED_LED_Media_AI'))return;
        if(!material){
          material=new THREE.MeshBasicMaterial({name:'FILM_User_video_LED',color:0xffffff,side:THREE.DoubleSide,toneMapped:false});
          material.onBeforeCompile=shader=>{
            shader.uniforms.filmFill={value:fill};
            const map=THREE.ShaderChunk.map_fragment.replace('vec4 sampledDiffuseColor = texture2D( map, vMapUv );',`vec2 filmUv = (vMapUv - 0.5) / filmFill + 0.5;
              vec4 sampledDiffuseColor = vec4(0.0,0.0,0.0,1.0);
              if(all(greaterThanEqual(filmUv,vec2(0.0))) && all(lessThanEqual(filmUv,vec2(1.0)))) sampledDiffuseColor = texture2D(map,filmUv);`);
            shader.fragmentShader='uniform vec2 filmFill;\n'+shader.fragmentShader.replace('#include <map_fragment>',map);
          };
          material.customProgramCacheKey=()=> 'songpan-film-letterbox-v22';
          // Empty LED stays black until the first real frame is available.
          material.color.set(0x000000);
        }
        o.material=Array.isArray(o.material)?old.map(m=>m.name==='PROPOSED_LED_Media_AI'?material:m):material;o.castShadow=false;o.receiveShadow=false;screen=o;attachedScreens++;
      });
      if(video.readyState>=2&&material&&!texture){texture=new THREE.VideoTexture(video);texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=false;material.map=texture;material.color.set(0xffffff);material.needsUpdate=true;}
      requestRender();
    },
    fitViewFov(position,target,fov,aspect){
      if(!enabled)return fov;
      const probe=new THREE.PerspectiveCamera(fov,aspect,.035,150);probe.position.copy(position);probe.lookAt(target);probe.updateMatrixWorld();let ratio=1;
      for(const x of [screenCenter[0]-screenWidth/2-.015,screenCenter[0]+screenWidth/2+.015])for(const y of [screenCenter[1]-screenHeight/2-.015,screenCenter[1]+screenHeight/2+.015]){
        const p=new THREE.Vector3(x,y,screenCenter[2]).project(probe);ratio=Math.max(ratio,Math.abs(p.x)/.84,Math.abs(p.y)/.82);
      }
      return Math.min(120,THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(fov/2))*ratio)));
    },
    diagnostics(){let screenBounds=null;if(screen){screen.geometry.computeBoundingBox();const b=screen.geometry.boundingBox.clone().applyMatrix4(screen.matrixWorld);screenBounds=[b.min.toArray(),b.max.toArray()];}return {enabled,active,requested,paused:video.paused,ended:video.ended,currentTime:video.currentTime,duration:video.duration||null,width:video.videoWidth,height:video.videoHeight,muted:video.muted,volume:video.volume,readyState:video.readyState,error:lastError,presentedFrames,attachedScreens,textureVersion:texture?.version||0,textureIsVideo:!!texture?.isVideoTexture,textureFlipY:texture?.flipY,fill:fill.toArray(),screenCenter,screenWidth,screenHeight,screenBounds,toneMapped:material?.toneMapped,materialColor:material?.color.getHexString(),source:video.getAttribute('src'),seekable:[...Array(video.seekable.length)].map((_,i)=>[video.seekable.start(i),video.seekable.end(i)])};}
  };
}
