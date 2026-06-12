import re

with open('game.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Task 1: Reduce AoE radius (approximate in HERO_TMPL)
# We can find HERO_TMPL and reduce ranges for thor, swordsman, vampire
# Thor
js = js.replace("thor:      { name:'토르', hp:1800, atk:80, aspd:1.0, move:150, range:150",
                "thor:      { name:'토르', hp:1800, atk:80, aspd:1.0, move:150, range:105")
# Swordsman
js = js.replace("swordsman: { name:'검사', hp:1400, atk:90, aspd:1.2, move:170, range:80",
                "swordsman: { name:'검사', hp:1400, atk:90, aspd:1.2, move:170, range:55")
# Vampire
js = js.replace("vampire:   { name:'뱀파이어', hp:1200, atk:100, aspd:1.4, move:180, range:90",
                "vampire:   { name:'뱀파이어', hp:1200, atk:100, aspd:1.4, move:180, range:60")

# Reduce hardcoded AOE radiuses in specific skills
js = js.replace("spawnAOE(t.x,t.y,60,", "spawnAOE(t.x,t.y,42,")
js = js.replace("spawnIceNova(target.x,target.y,80)", "spawnIceNova(target.x,target.y,56)")

# Task 2: Remove hitStopTimer entirely
js = js.replace("GS.hitStopTimer = 0.05;", "")
js = js.replace("GS.hitStopTimer = 0.08;", "")
js = js.replace("GS.hitStopTimer = 0.1;", "")

# Task 3: Minimap cleanup
# Find drawMinimap function
minimap_str = """function drawMinimap(){
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
# replace old minimap
old_minimap_match = re.search(r'function drawMinimap\(\).*?\n}', js, flags=re.DOTALL)
if old_minimap_match:
    js = js.replace(old_minimap_match.group(0), minimap_str)

# Task 8: Rename ITEMS
js = js.replace("name:'공격력 강화'", "name:'전사의 장검'")
js = js.replace("name:'공속 강화'", "name:'광전사의 단검'")
js = js.replace("name:'체력 강화'", "name:'거인의 심장'")
js = js.replace("name:'이속 강화'", "name:'바람의 장화'")
js = js.replace("name:'크리티컬'", "name:'암살자의 비수'")
js = js.replace("name:'흡혈'", "name:'흡혈귀의 이빨'")
js = js.replace("name:'피해반사'", "name:'가시 갑옷'")
js = js.replace("name:'화염검'", "name:'작열하는 지팡이'")
js = js.replace("name:'기절무기'", "name:'천둥의 망치'")
js = js.replace("name:'방어막'", "name:'수호자의 방패'")

with open('game.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Part 1 changes applied")
