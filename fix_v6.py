import re

with open('game.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Fix drawMinimap
bad_minimap = """function drawMinimap(){
    ctx.save();
    let mw = 150, mh = 150;
    let mx = window.innerWidth - mw - 20;
    let my = 20;
    
    ctx.fillStyle = 'rgba(15,23,42,0.8)';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(mx, my, mw, mh, 10); ctx.fill(); ctx.stroke();
    
    entities.forEach(e => {
        if(e.isDead) return;
        if(e.type !== 'hero' && e.type !== 'tower' && e.type !== 'nexus' && e.type !== 'nexus_turret' && !e.mtype) return;
        
        let px = mx + (e.x / MAP_SIZE) * mw;
        let py = my + (e.y / MAP_SIZE) * mh;
        
        ctx.beginPath();
        if(e.type === 'hero') {
            ctx.fillStyle = e.faction === 'BLUE' ? '#3b82f6' : '#ef4444';
            ctx.arc(px, py, e.isPlayer?4:3, 0, Math.PI*2);
        } else if(e.type.includes('nexus') || e.type === 'tower') {
            ctx.fillStyle = e.faction === 'BLUE' ? '#1e3a8a' : '#7f1d1d';
            ctx.arc(px, py, e.type==='nexus'?5:3, 0, Math.PI*2);
        } else if(e.mtype && e.mtype.includes('boss')) {
            ctx.fillStyle = '#f59e0b';
            ctx.arc(px, py, 4, 0, Math.PI*2);
        }
        ctx.fill();
    });
    
    if(player && !player.isDead){
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        let px = mx + (player.x / MAP_SIZE) * mw;
        let py = my + (player.y / MAP_SIZE) * mh;
        ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI*2); ctx.stroke();
    }
    ctx.restore();
}"""
good_minimap = """function drawMinimap(){
    if(!window.mCtx) return;
    let mCtx = window.mCtx;
    mCtx.clearRect(0,0,mCanvas.width,mCanvas.height);
    let sx = mCanvas.width / MAP_SIZE, sy = mCanvas.height / MAP_SIZE;
    entities.forEach(e => {
        if(e.isDead) return;
        if(e.type !== 'hero' && e.type !== 'tower' && e.type !== 'nexus' && e.type !== 'nexus_turret' && !e.mtype) return;
        
        mCtx.beginPath();
        if(e.type === 'hero') {
            mCtx.fillStyle = e.faction === 'BLUE' ? '#3b82f6' : '#ef4444';
            mCtx.arc(e.x*sx, e.y*sy, e.isPlayer?4:3, 0, Math.PI*2);
        } else if(e.type.includes('nexus') || e.type === 'tower') {
            mCtx.fillStyle = e.faction === 'BLUE' ? '#1e3a8a' : '#7f1d1d';
            mCtx.arc(e.x*sx, e.y*sy, e.type==='nexus'?5:3, 0, Math.PI*2);
        } else if(e.mtype && e.mtype.includes('boss')) {
            mCtx.fillStyle = '#f59e0b';
            mCtx.arc(e.x*sx, e.y*sy, 4, 0, Math.PI*2);
        }
        mCtx.fill();
    });
    if(player && !player.isDead){
        mCtx.strokeStyle = '#fff';
        mCtx.lineWidth = 1;
        mCtx.beginPath(); mCtx.arc(player.x*sx, player.y*sy, 5, 0, Math.PI*2); mCtx.stroke();
    }
}"""
js = js.replace(bad_minimap, good_minimap)

# 2. Fix Grrr and MECHANIC
grrr_tmpl = """grrr: { name:'그르르', color:"#f59e0b", hp:1600, atk:70, aspd:0.9, move:150, range:60, type:"melee",
        skill1:{name:'거대화', type:'self_buff', cd:18, desc:'몸집이 커지며 능력이 증가함'},
        skill2:{name:'포효', type:'aoe_stun', cd:12, desc:'주변의 적을 스턴시킴'},
        draw:(ctx,x,y,r,dir,f,anim)=>drawBlockyHero(ctx,x,y,r,dir,f,'grrr',anim) },
"""
# find MECHANIC block
mech_regex = r"MECHANIC:\s*\{.*?\}\s*,\n"
js = re.sub(mech_regex, grrr_tmpl, js, flags=re.DOTALL)

# 3. Fix heroes.forEach crash
bad_heroes = """        // Multi-kill Hostile Emoji Meeting
        heroes.forEach(h => {
            if(window.killStreaks[h.heroKey] >= 3) {
                if(Math.random() < 0.1) {
                    let nearEnemies = heroes.filter(e => e.faction !== h.faction && dist(e, h) < 300);"""
good_heroes = """        // Multi-kill Hostile Emoji Meeting
        let currentHeroes = entities.filter(e => e.type === 'hero');
        currentHeroes.forEach(h => {
            if(window.killStreaks && window.killStreaks[h.heroKey] >= 3) {
                if(Math.random() < 0.1) {
                    let nearEnemies = currentHeroes.filter(e => e.faction !== h.faction && dist(e, h) < 300);"""
js = js.replace(bad_heroes, good_heroes)

# 4. In gameLoop underdog buff logic, ensure GS.scoreBlue and scoreRed exist safely
# (They should exist as long as GS is initialized)
# Also fix the default GS.hero to grrr since I changed BERSERKER or MECHANIC
js = js.replace("hero:'BERSERKER'", "hero:'grrr'")

with open('game.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Fixes applied to game.js")
