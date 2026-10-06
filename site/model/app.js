import * as THREE from 'three';
import {createImmersionPlayback} from './immersion-playback.js?rev=27';
import {createFilmPlayback} from './film-playback.js?rev=27';
import {initExhibition} from './exhibition.js?rev=27';
import {initBudgetPreview} from './budget-preview.js?rev=27';
import {createKeyboardNavigation} from './keyboard-navigation.js?rev=27';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const el=id=>document.getElementById(id);
// This publication contains the current exhibition model.
const assetRevision='r31';
const isR24=['r24','r25','r26','r27','r28','r29','r30','r31'].includes(assetRevision);
const isR22=['r22','r23','r24','r25','r26','r27','r28','r29','r30','r31'].includes(assetRevision);
const isR21=['r21','r22','r23','r24','r25','r26','r27','r28','r29','r30','r31'].includes(assetRevision);
const scene=new THREE.Scene();scene.background=new THREE.Color('#e6e4db');
const camera=new THREE.PerspectiveCamera(48,1,.035,150);
let renderer,controls,model,navigation,views=[],current=0,motion=null,ready=false,roof=false,context=true;
let queuedFrame=0,renderedFrames=0,inViewport=true,lastRenderMs=0,quality='smooth';
let assetData=null,exhibitionPromise=null,hasExhibition=false,hasImmersion=false;
const loadedSections=new Set(),wallMaterials=new Map(),reflectiveMaterials=new Set(),detailMaterials=new Set();let highTexture=null,nightReflection=null;
const mapLayerStates={road:true,rail:true,hiking:true},posterMaterials=new Map();let highPosterTexture=null;
const inside=()=>views[current]?.id.startsWith('immersive_');
const film=createFilmPlayback({enabled:['r30','r31'].includes(assetRevision),requestRender});
const immersion=createImmersionPlayback({enabled:['r30','r31'].includes(assetRevision),requestRender,beforePlay:()=>film.pause()});
function developmentBannerDiagnostics(){
  const batches=[];model?.traverse(o=>{if(!o.isMesh)return;const m=(Array.isArray(o.material)?o.material:[o.material]).find(m=>m.name==='R30_Swiss_development_unlit');if(!m)return;
    o.geometry.computeBoundingBox();const b=o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);batches.push({material:m.name,width:m.map?.image?.width,height:m.map?.image?.height,toneMapped:m.toneMapped,bounds:[b.min.toArray(),b.max.toArray()]});
  });return batches;
}
function fixedImmersionDiagnostics(){
  const seen=new Set(),values=[];model?.traverse(o=>{if(!o.isMesh)return;for(const m of (Array.isArray(o.material)?o.material:[o.material])){
    if(seen.has(m)||!(/^R2[45]_PBR_/.test(m.name)||['R14_Real_water_material_candidate','R22_Baked_Floor_Reflective'].includes(m.name)))continue;seen.add(m);
    values.push({name:m.name,color:m.color.toArray(),roughness:m.roughness,metalness:m.metalness,mapId:m.map?.id||null,normalId:m.normalMap?.id||null,roughnessId:m.roughnessMap?.id||null,lightId:m.lightMap?.id||null,envId:m.envMap?.id||null,envIntensity:m.envMapIntensity,lightIntensity:m.lightMapIntensity,videoMap:!!m.map?.isVideoTexture});
  }});return values.sort((a,b)=>a.name.localeCompare(b.name));
}
function displayCopyDiagnostics(){const values=[];model?.traverse(o=>{if(o.isMesh&&o.userData.displayLabels)values.push({labels:o.userData.displayLabels,sources:o.userData.sourceObjectNames});});return values;}
function mapBatchDiagnostics(){const values=[];model?.traverse(o=>{if(o.isMesh&&o.userData.presentationGroup?.startsWith('map_'))values.push({layer:o.userData.presentationGroup.slice(4),visible:o.visible});});return values;}
function requestRender(){if(!queuedFrame&&!document.hidden&&inViewport)queuedFrame=requestAnimationFrame(renderFrame);}
function renderFrame(now){
  queuedFrame=0;if(document.hidden||!inViewport||!renderer||!ready)return;
  if(motion){const t=Math.min(1,(now-motion.start)/850),s=t*t*(3-2*t);camera.position.lerpVectors(motion.from,motion.to,s);controls.target.lerpVectors(motion.targetFrom,motion.targetTo,s);camera.fov=THREE.MathUtils.lerp(motion.fovFrom,motion.fovTo,s);camera.updateProjectionMatrix();camera.lookAt(controls.target);if(t===1){motion=null;controls.enabled=true;}}
  const moving=navigation?.update(now);
  const changed=controls.update(),start=performance.now();renderer.render(scene,camera);lastRenderMs=performance.now()-start;renderedFrames++;
  if(motion||changed||moving)requestRender();
}
Object.defineProperty(window,'songpanPreviewDiagnostics',{value:()=>({version:assetRevision,film:film.diagnostics(),immersion:immersion.diagnostics(),quality,currentView:views[current]?.id,viewCount:views.length,cameraPosition:camera.position.toArray(),cameraTarget:controls?.target.toArray(),cameraAspect:camera.aspect,cameraFov:camera.fov,terrain:assetData?.terrain||null,displayCopy:assetData?.displayCopy||null,displayLabels:displayCopyDiagnostics(),fixedImmersionMaterials:fixedImmersionDiagnostics(),developmentBanner:assetData?.developmentBanner||null,developmentPrints:developmentBannerDiagnostics(),mapLayers:{...mapLayerStates},mapBatches:mapBatchDiagnostics(),posterTextures:[...posterMaterials.keys()].map(m=>({width:m.map?.image?.width,height:m.map?.image?.height})),renderedFrames,lastRenderMs,drawCalls:renderer?.info.render.calls||0,triangles:renderer?.info.render.triangles||0,textures:renderer?.info.memory.textures||0,geometries:renderer?.info.memory.geometries||0,pixelRatio:renderer?.getPixelRatio()||0,loadedSections:[...loadedSections],inside:!!inside(),reflectionLoaded:!!nightReflection,reflectiveMaterials:reflectiveMaterials.size,pbrDetailMaterials:[...detailMaterials].map(m=>({name:m.name,normal:!!m.normalMap,roughness:!!m.roughnessMap,lightMap:!!m.lightMap,lightChannel:m.lightMap?.channel,lightIntensity:m.lightMapIntensity,env:!!m.envMap,toneMapped:m.toneMapped})),toneMappingExposure:renderer?.toneMappingExposure,environmentIntensity:scene.environmentIntensity,directLightIntensity:key.intensity+fill.intensity+base.intensity}),writable:false});
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const base=new THREE.HemisphereLight('#edece0','#6c6457',1.6);scene.add(base);
const key=new THREE.DirectionalLight('#fff9f1',3.2);key.position.set(14,8,4);key.target.position.set(16,0,4);scene.add(key,key.target);
key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-13;key.shadow.camera.right=13;key.shadow.camera.top=12;key.shadow.camera.bottom=-12;key.shadow.camera.near=.1;key.shadow.camera.far=30;key.shadow.bias=-.00015;key.shadow.normalBias=.025;
const fill=new THREE.DirectionalLight('#dce8e0',1.1);fill.position.set(24,5,9);scene.add(fill);
function environment(){
  const room=new THREE.Scene();room.add(new THREE.Mesh(new THREE.BoxGeometry(30,16,30),new THREE.MeshBasicMaterial({color:0xc5c1b6,side:THREE.BackSide})));
  for(const [p,s,c] of [[[0,7,0],[10,.04,10],0xffffff],[[-14,3,0],[.04,7,14],0xffedda],[[14,4,0],[.04,5,10],0xe4eef1]]){
    const card=new THREE.Mesh(new THREE.BoxGeometry(...s),new THREE.MeshBasicMaterial({color:c}));card.position.set(...p);room.add(card);
  }
  const pmrem=new THREE.PMREMGenerator(renderer);const rt=pmrem.fromScene(room,.06);scene.environment=rt.texture;scene.environmentIntensity=.5;pmrem.dispose();
  room.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});
}
function grain(timber=false){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
  const ctx=canvas.getContext('2d');const pixels=ctx.createImageData(256,256);let seed=91267;
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const tone=timber?Math.round(145+25*Math.sin(x*.23+5*Math.sin(y*.006))+(seed/4294967296-.5)*13):Math.round(165+(seed/4294967296-.5)*36);
    const i=(y*256+x)*4;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=tone;pixels.data[i+3]=255;
  }
  ctx.putImageData(pixels,0,0);const tex=new THREE.CanvasTexture(canvas);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(timber?3:5,timber?1:5);return tex;
}
function visibility(){if(!model)return;model.traverse(o=>{
  if(o.userData.filmIdentity){o.visible=false;return;}
  const group=o.userData.presentationGroup;
  if(group?.startsWith('map_')){o.visible=mapLayerStates[group.slice(4)]!==false;return;}
  if(isR21&&group){o.visible=group==='roof'?(context&&roof):group==='shell'?context:group==='immersion_upper'?(roof||inside()):true;return;}
  if(!o.isMesh)return;
  const isRoof=/roof|ceiling|upper_hanging_fabric|upper_fabric|hanger|suspension/i.test(o.name);
  o.visible=(o.name.startsWith('R17_')||o.name.startsWith('R18_')||o.name.startsWith('R19_')||o.name.startsWith('R20_'))||(context&&(!isRoof||roof));
});if(renderer){renderer.shadowMap.needsUpdate=true;requestRender();}}
function select(index,immediate=false,syncGuide=true){
  if(!ready)return;navigation?.stop();current=index;const v=views[index];
  const url=new URL(location.href);url.searchParams.set('view',v.id);history.replaceState(null,'',url);
  guide.onViewChange(v.id,syncGuide);
  film.setContext({chapter:guide.activeChapter(),view:v.id});
  immersion.setContext({chapter:guide.activeChapter(),view:v.id});
  el('state').textContent=v.title;
  if(isR21){const dark=inside();scene.environmentIntensity=dark&&isR24?.02:.5;scene.background.set(dark?'#040710':'#e6e4db');base.intensity=dark?(isR24?0:.06):1.6;key.intensity=dark?(isR24?0:.10):3.2;fill.intensity=dark?(isR24?0:.03):1.1;renderer.shadowMap.enabled=!dark;visibility();if(!dark)ensureExhibition();}
  const p=new THREE.Vector3(...v.position),t=new THREE.Vector3(...v.target);
  if(v.fit==='building')fitBuilding(p,t,v.fov);
  const fov=v.fit==='development-banner'?bannerViewFov(p,t,v.fov):v.fit==='film-screen'?film.fitViewFov(p,t,v.fov,camera.aspect):v.fov;
  controls.maxDistance=v.fit==='building'?Math.max(70,p.distanceTo(t)*1.2):70;
  if(immediate||reduced){camera.position.copy(p);controls.target.copy(t);camera.fov=fov;camera.updateProjectionMatrix();controls.update();motion=null;controls.enabled=true;}
  else{motion={start:performance.now(),from:camera.position.clone(),to:p,targetFrom:controls.target.clone(),targetTo:t,fovFrom:camera.fov,fovTo:fov};controls.enabled=false;}
  requestRender();
}
function bannerViewFov(position,target,fov){
  const b=assetData?.developmentBanner;if(!b)return fov;
  const probe=new THREE.PerspectiveCamera(fov,camera.aspect,.035,150);probe.position.copy(position);probe.lookAt(target);probe.updateMatrixWorld();
  let ratio=1;const x=b.center_web[0],z=b.center_web[2];
  for(const px of [x-b.width/2-.015,x+b.width/2+.015])for(const py of [b.bottom-.015,b.top+.015])for(const pz of [z-.015,z+.015]){
    const p=new THREE.Vector3(px,py,pz).project(probe);ratio=Math.max(ratio,Math.abs(p.x)/.84,Math.abs(p.y)/.82);
  }
  return Math.min(120,THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(fov/2))*ratio)));
}
function fitBuilding(position,target,fov){
  const corners=assetData.buildingBounds||[[-.35,-.2,-.3],[22.85,6.05,12.05]];
  const forward=target.clone().sub(position).normalize(),right=forward.clone().cross(camera.up).normalize(),up=right.clone().cross(forward).normalize();
  const tan=Math.tan(THREE.MathUtils.degToRad(fov/2));let distance=0;
  for(const x of [corners[0][0],corners[1][0]])for(const y of [corners[0][1],corners[1][1]])for(const z of [corners[0][2],corners[1][2]]){
    const relative=new THREE.Vector3(x,y,z).sub(target),depth=relative.dot(forward);
    distance=Math.max(distance,Math.abs(relative.dot(right))/(tan*camera.aspect*.84)-depth,Math.abs(relative.dot(up))/(tan*.82)-depth);
  }
  position.copy(target).addScaledVector(forward,-distance);
}
function resize(){if(!renderer)return;const rect=el('viewport').getBoundingClientRect();renderer.setSize(rect.width,rect.height,false);camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();if(ready&&['building','development-banner','film-screen'].includes(views[current]?.fit))select(current,true,false);else requestRender();}
el('reset').addEventListener('click',()=>select(current));
el('roof').addEventListener('click',()=>{if(isR21)ensureExhibition();roof=!roof;el('roof').setAttribute('aria-pressed',String(roof));el('roof').textContent=roof?'隐藏屋面':'显示屋面';visibility();});
el('context').addEventListener('click',()=>{if(isR21)ensureExhibition();context=!context;el('context').setAttribute('aria-pressed',String(context));el('context').textContent=context?'显示原馆':'仅看展项';visibility();});
el('map-layers').hidden=!['r28','r29','r30','r31'].includes(assetRevision);
for(const kind of ['road','rail','hiking'])el('map-layer-'+kind).addEventListener('click',()=>{mapLayerStates[kind]=!mapLayerStates[kind];el('map-layer-'+kind).setAttribute('aria-pressed',String(mapLayerStates[kind]));visibility();});
el('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{el('state').textContent='可继续拖动、缩放查看';}});
document.addEventListener('fullscreenchange',()=>{el('fullscreen').textContent=document.fullscreenElement?'退出全屏':'全屏';});el('retry').addEventListener('click',()=>location.reload());

function waterNormal(){
  const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),p=ctx.createImageData(128,128);
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){const u=x/128*Math.PI*2,v=y/128*Math.PI*2,i=(y*128+x)*4;p.data[i]=128+15*Math.cos(4*u+v)+7*Math.cos(9*u-3*v);p.data[i+1]=128+11*Math.cos(4*u+v)-6*Math.cos(9*u-3*v);p.data[i+2]=253;p.data[i+3]=255;}ctx.putImageData(p,0,0);
  const tex=new THREE.CanvasTexture(c);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(2,2);return tex;
}
function prepareModel(root){
  if(isR22){const converted=new Map();root.traverse(o=>{if(!o.isMesh)return;
    const replace=mat=>{if(mat.name!=='R22_Baked_Floor_Reflective')return mat;if(converted.has(mat))return converted.get(mat);
      const m=new THREE.MeshStandardMaterial({name:mat.name,color:0x05080c,emissive:0xffffff,emissiveMap:mat.map||mat.emissiveMap,emissiveIntensity:.9,roughness:.28,metalness:.3,side:mat.side});m.bumpMap=grain();m.bumpScale=.0015;reflectiveMaterials.add(m);converted.set(mat,m);return m;};
    o.material=Array.isArray(o.material)?o.material.map(replace):replace(o.material);
  });}
  const stoneGrain=grain(),timberGrain=grain(true);const touched=new Set();
  root.traverse(o=>{if(!o.isMesh)return;o.receiveShadow=true;o.castShadow=(o.name.startsWith('R17_')||(isR21&&o.userData.presentationGroup==='exhibits'))&&!/glass|label|title|ACTIVE_DISPLAY/i.test(o.name);
    if(o.userData.presentationGroup?.startsWith('map_')){o.castShadow=false;o.receiveShadow=false;}
    for(const m of (Array.isArray(o.material)?o.material:[o.material])){
      if(touched.has(m))continue;touched.add(m);
      if(isR24&&/^R2[45]_PBR_/.test(m.name)){detailMaterials.add(m);reflectiveMaterials.add(m);m.normalScale.set(1,1);for(const t of [m.map,m.normalMap,m.roughnessMap])if(t)t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());}
      if(['R21_Night_wall_unlit_UV','R22_Night_wall_unlit_UV'].includes(m.name)){m.toneMapped=false;if(isR22)m.color.multiplyScalar(1.18);wallMaterials.set(m,m.map);}
      if(['R21_Baked_Immersive_Surface','R22_Baked_Immersive_Surface','R23_Baked_Rock_Banks'].includes(m.name))m.toneMapped=false;
      if(isR21&&m.name==='R14_Real_water_material_candidate'){m.transmission=0;m.color.setRGB(.018,.028,.045);m.metalness=isR22?.5:.65;m.roughness=isR22?.055:.09;if(isR22){m.normalMap=waterNormal();m.normalScale.set(.12,.12);reflectiveMaterials.add(m);}m.needsUpdate=true;}
      if(['r29','r30','r31'].includes(assetRevision)&&m.name==='R16_Platform_illustration_NOT_live')m.toneMapped=false;
      if(m.name==='R30_Swiss_development_unlit')m.toneMapped=false;
      if(m.name.startsWith('R28_Map_'))m.toneMapped=false;
      if(m.name==='R28_User_outdoor_map_unlit'){posterMaterials.set(m,m.map);m.toneMapped=false;if(m.map)m.map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());if(quality==='clear'&&highPosterTexture){m.map=highPosterTexture;m.needsUpdate=true;}}
      if(m.name==='R27_Songpan_Sentinel2_2016_real_terrain'&&m.map){m.map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());}
      if(m.name==='R17_White_mineral'){m.bumpMap=stoneGrain;m.bumpScale=.0025;m.needsUpdate=true;}
      if(m.name==='R17_White_woven_banner'){m.bumpMap=stoneGrain;m.bumpScale=.0015;m.needsUpdate=true;}
      if(m.name==='R16_Museum_glass'){m.transparent=true;m.opacity=.16;m.depthWrite=false;m.transmission=0;m.needsUpdate=true;}
    }
  });}
async function loadDetailLightMaps(){
  if(!isR24)return;
  for(const config of Object.values(assetData.materialLightMaps)){
    const mat=[...detailMaterials].find(m=>m.name===config.material);if(!mat)throw Error('Missing PBR family '+config.material);
    const tex=await new THREE.TextureLoader().loadAsync('./assets/'+config.lightAsset);tex.flipY=false;tex.colorSpace=THREE.SRGBColorSpace;tex.channel=0;
    mat.lightMap=tex;mat.lightMapIntensity=config.irradianceIntensity;
    // Irradiance is already baked, including wall spill. Keep the environment
    // for specular response while avoiding a second diffuse environment pass.
    mat.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_maps>',THREE.ShaderChunk.lights_fragment_maps.replace('iblIrradiance += getIBLIrradiance( geometryNormal );',''));};
    mat.customProgramCacheKey=()=> 'r24-baked-diffuse-live-specular-v1';mat.needsUpdate=true;
  }
}
async function loadNightReflection(){
  if(nightReflection)return;
  const photo=await new THREE.TextureLoader().loadAsync('./assets/'+(assetData.reflectionAsset||'night-reflection-1536.jpg'));photo.colorSpace=THREE.SRGBColorSpace;photo.mapping=THREE.EquirectangularReflectionMapping;
  const pmrem=new THREE.PMREMGenerator(renderer);nightReflection=pmrem.fromEquirectangular(photo);pmrem.dispose();photo.dispose();
  for(const m of reflectiveMaterials){m.envMap=nightReflection.texture;m.envMapIntensity=isR24&&/^R2[45]_PBR_/.test(m.name)?Object.values(assetData.materialLightMaps).find(c=>c.material===m.name).envIntensity:m.name==='R22_Baked_Floor_Reflective'?.48:1.1;m.envMapRotation.set(0,-Math.PI/2,0);m.needsUpdate=true;}
}
async function loadSection(section){
  const gltf=await new GLTFLoader().loadAsync('./assets/'+assetData.assets[section],event=>{if(!ready)el('progress').textContent=event.total?`模型载入 ${Math.round(event.loaded/event.total*100)}%`:'正在载入沉浸区';});
  prepareModel(gltf.scene);film.attach(gltf.scene);await immersion.attach(gltf.scene);model.add(gltf.scene);if(isR24&&section==='immersion')await loadDetailLightMaps();if(isR22&&section==='immersion')await loadNightReflection();loadedSections.add(section);
  if(section==='exhibition')hasExhibition=true;else hasImmersion=true;
  visibility();requestRender();
}
function ensureExhibition(){
  if(!isR21||hasExhibition||!assetData)return Promise.resolve();
  if(!exhibitionPromise){exhibitionPromise=loadSection('exhibition').catch(error=>{exhibitionPromise=null;el('state').textContent='其他展区暂未载入，可继续查看沉浸区';console.error(error);});}
  return exhibitionPromise;
}
el('quality').addEventListener('click',async()=>{
  const button=el('quality'),next=quality==='smooth'?'clear':'smooth';button.disabled=true;
  try{
    if(isR21&&next==='clear'&&!highTexture){highTexture=await new THREE.TextureLoader().loadAsync('./assets/night-wall-4096.jpg');highTexture.flipY=false;highTexture.colorSpace=THREE.SRGBColorSpace;}
    if(['r28','r29','r30','r31'].includes(assetRevision)&&next==='clear'&&!highPosterTexture){highPosterTexture=await new THREE.TextureLoader().loadAsync('./assets/r28-user-outdoor-map-4096.jpg');highPosterTexture.flipY=false;highPosterTexture.colorSpace=THREE.SRGBColorSpace;highPosterTexture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());}
    quality=next;
    for(const [mat,original] of posterMaterials){mat.map=quality==='clear'?highPosterTexture:original;mat.needsUpdate=true;}
    for(const [mat,original] of wallMaterials){if(quality==='clear'){highTexture.wrapS=original.wrapS;highTexture.wrapT=original.wrapT;highTexture.repeat.copy(original.repeat);highTexture.offset.copy(original.offset);mat.map=highTexture;}else mat.map=original;mat.needsUpdate=true;}
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,quality==='clear'?1.75:1.1));resize();
    button.textContent=quality==='clear'?'切回流畅':'清晰画面';button.setAttribute('aria-pressed',String(quality==='clear'));requestRender();
  }catch(error){el('state').textContent='清晰画面暂未载入，继续使用流畅画面';console.error(error);}finally{button.disabled=false;}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(queuedFrame);queuedFrame=0;}else requestRender();});
new IntersectionObserver(entries=>{inViewport=entries[0].isIntersecting;if(inViewport)requestRender();else{cancelAnimationFrame(queuedFrame);queuedFrame=0;}}).observe(el('viewport'));

async function init(){try{
  renderer=new THREE.WebGLRenderer({canvas:el('scene'),antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.1));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;environment();
  controls=new OrbitControls(camera,el('scene'));controls.enableDamping=true;controls.addEventListener('change',requestRender);controls.minDistance=.3;controls.maxDistance=70;controls.maxPolarAngle=Math.PI*.93;new ResizeObserver(resize).observe(el('viewport'));resize();
  navigation=createKeyboardNavigation({camera,controls,canMove:()=>ready&&!document.hidden&&inViewport,requestRender,cancelTransition:()=>{motion=null;controls.enabled=true;}});
  const response=await fetch('./assets/'+assetRevision+'-scene-data.json');if(!response.ok)throw new Error('视点资料未载入');const data=await response.json();assetData=data;views=guide.limitViews(data.views);if(['r30','r31'].includes(assetRevision))views.find(v=>v.id==='film_screen').fit='film-screen';
  if(isR21){model=new THREE.Group();scene.add(model);await loadSection('immersion');if(!pendingView?.startsWith('immersive_'))await ensureExhibition();}
  else{const gltf=await new GLTFLoader().loadAsync('./assets/'+assetRevision+'-scene.glb',e=>{el('progress').textContent=e.total?`模型载入 ${Math.round(e.loaded/e.total*100)}%`:`已载入 ${(e.loaded/1048576).toFixed(1)} MB`;});model=gltf.scene;prepareModel(model);scene.add(model);loadedSections.add('full');visibility();}

  guide.onViewsReady(views);
  ready=true;const start=views.findIndex(v=>v.id===pendingView);select(start<0?0:start,true,false);el('loading').hidden=true;
  el('quality').disabled=false;requestRender();
  el('scene').addEventListener('webglcontextlost',e=>{e.preventDefault();el('loading').hidden=false;el('progress').textContent='三维显示中断，请重新载入';el('retry').hidden=false;});
}catch(error){console.error(error);el('progress').textContent='模型未能载入，请重新载入或检查本地服务';el('retry').hidden=false;el('state').textContent='空间尚未载入';}}
let pendingView=new URLSearchParams(location.search).get('view');
const guide=initExhibition({revision:assetRevision,requestView(id,{playFilm=false,playImmersion=false}={}){pendingView=id;if(ready){const index=views.findIndex(v=>v.id===id);if(index>=0)select(index,false,false);}if(playFilm){immersion.pause();film.play();}if(playImmersion)immersion.enter();}});
initBudgetPreview({beforeOpen:()=>{navigation?.stop();film.pause();immersion.pause();}});
init();
