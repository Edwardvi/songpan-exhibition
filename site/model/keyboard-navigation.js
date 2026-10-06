import {Vector3, MathUtils} from 'three';

const arrows=new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight']);

export function createKeyboardNavigation({camera,controls,canMove,requestRender,cancelTransition}){
  const held=new Set(),forward=new Vector3(),right=new Vector3(),delta=new Vector3();
  let lastTime=0;

  function blocked(target=document.activeElement){
    return !!document.querySelector('dialog[open]')||!!target?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="tablist"],.settings-menu');
  }
  function stop(){held.clear();lastTime=0;}
  function translate(seconds){
    const x=Number(held.has('ArrowRight'))-Number(held.has('ArrowLeft'));
    const z=Number(held.has('ArrowUp'))-Number(held.has('ArrowDown'));
    if(!x&&!z)return false;
    forward.copy(controls.target).sub(camera.position);forward.y=0;
    if(forward.lengthSq()<1e-8){camera.getWorldDirection(forward);forward.y=0;}
    if(forward.lengthSq()<1e-8)forward.set(0,0,-1);
    forward.normalize();right.crossVectors(forward,camera.up).normalize();
    const speed=MathUtils.clamp(camera.position.distanceTo(controls.target)*.14,1.4,6);
    delta.copy(forward).multiplyScalar(z).addScaledVector(right,x).normalize().multiplyScalar(speed*seconds);
    camera.position.add(delta);controls.target.add(delta);
    return true;
  }

  window.addEventListener('keydown',event=>{
    if(!arrows.has(event.key)||event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||event.isComposing||!canMove()||blocked(event.target))return;
    event.preventDefault();
    if(held.has(event.key))return;
    cancelTransition();held.add(event.key);lastTime=performance.now();
    // A quick tap still moves, even when released before the next drawn frame.
    translate(.05);requestRender();
  });
  window.addEventListener('keyup',event=>{
    if(!held.delete(event.key))return;
    if(!held.size)lastTime=0;else requestRender();
  });
  window.addEventListener('blur',stop);
  window.addEventListener('pointerdown',stop);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  document.addEventListener('focusin',event=>{if(blocked(event.target))stop();});

  return {
    stop,
    keys:()=>[...held],
    update(now){
      if(!held.size)return false;
      if(!canMove()||blocked()){stop();return false;}
      const seconds=MathUtils.clamp((now-lastTime)/1000,0,.1);lastTime=now;
      return translate(seconds);
    }
  };
}
