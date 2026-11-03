// Routes for autonomous residents use the same stairs, pier and mountain road
// as the visitor, without changing the visitor's camera or destination marker.
export function createNpcNavigator(woman,world,nav){
  const upper=()=>woman.island==='roof'||woman.island==='third-stairs';
  function go(x,y,z){
    const landscape=world.travelLandscape(woman,world,nav,x,z,y,()=>go(x,y,z));
    if(landscape!==null)return landscape;
    if(woman.swimming)return woman.leavePool(x,z,()=>go(x,y,z));
    // The bottom stair overlaps the house floor. Rejoin the navigation grid
    // there before looking at the site's name, or arrival can requeue itself.
    if(nav.canStand(woman.pos.x,woman.pos.z,woman.y)&&nav.canStand(x,z)&&Math.abs(nav.heightAt(x,z)-y)<.7)return woman.goTo(x,z);
    const surface=world.ground.topAt(x,z,y+.7),site=surface?.site;
    if(upper()){
      const end=site==='roof'?{x,y,z}:world.thirdFloor.foot;
      return woman.follow(world.thirdFloor.route(woman.pos.x,woman.y,woman.pos.z,end.x,end.y,end.z),null,site==='roof'?null:()=>{woman.teleport(end.x,end.z);go(x,y,z);});
    }
    if(woman.island==='pier'&&site!=='pier'){
      const p=world.outer.foot;return woman.follow([{x:p.x,y:0,z:p.z}],null,()=>{woman.teleport(p.x,p.z);go(x,y,z);});
    }
    if(woman.island==='mountain'&&site!=='mountain'){
      const p=world.mountain.trailhead;
      return woman.follow(world.mountain.route(woman.pos.x,woman.y,woman.pos.z,p.x,.02,p.z),null,()=>{woman.teleport(p.x,p.z);go(x,y,z);});
    }
    if(site==='roof')return woman.follow(world.thirdFloor.route(woman.pos.x,woman.y,woman.pos.z,x,y,z),world.thirdFloor.foot);
    if(site==='pier')return woman.follow([{x,y,z}],woman.island==='pier'?null:world.outer.foot);
    if(site==='mountain')return woman.follow(world.mountain.route(woman.pos.x,woman.island==='mountain'?woman.y:null,woman.pos.z,x,y,z),woman.island==='mountain'?null:world.mountain.trailhead);
    return nav.canStand(x,z)&&woman.goTo(x,z);
  }
  return go;
}
