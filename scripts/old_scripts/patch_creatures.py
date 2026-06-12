import re
with open('game.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update spawnCreatures
old_spawn = '''window.spawnCreatures = function(count) {
    const lanes = ['top', 'mid', 'bot'];
    const types = ['dragon', 'golem', 'beast'];
    showBanner('크리처 군단 소환!', '🐉', true);
    for(let i=0; i<count; i++) {
        let lane = lanes[Math.floor(Math.random() * lanes.length)];
        let ctype = types[Math.floor(Math.random() * types.length)];
        let spawnX = (player.faction === 'BLUE') ? 300 : 2700;
        let spawnY = (player.faction === 'BLUE') ? 2700 : 300;
        entities.push(new Creature(spawnX, spawnY, player.faction, lane, ctype));
    }
};'''

new_spawn = '''window.spawnCreatures = function() {
    const types = ['dragon', 'golem', 'beast'];
    showBanner('크리처 군단 소환!', '🐉', true);
    
    // 블루팀 군단 스폰
    ['top', 'mid', 'bot'].forEach(lane => {
        let ctype = types[Math.floor(Math.random() * types.length)];
        entities.push(new Creature(300, 2700, 'BLUE', lane, ctype));
    });
    
    // 레드팀 군단 스폰
    ['top', 'mid', 'bot'].forEach(lane => {
        let ctype = types[Math.floor(Math.random() * types.length)];
        entities.push(new Creature(2700, 300, 'RED', lane, ctype));
    });
};'''

content = content.replace(old_spawn, new_spawn)

# 2. Fix entities.filter memory leak
old_filter = '''entities=entities.filter(e=>!e.isDead||e.type==='hero'||e.type==='creature'||(e.type==='jungle'&&!e.mtype.includes('boss')&&e.mtype!=='summon'));'''
new_filter = '''entities=entities.filter(e=>!e.isDead||e.type==='hero'||(e.type==='jungle'&&!e.mtype.includes('boss')&&e.mtype!=='summon'));'''
content = content.replace(old_filter, new_filter)

# 3. Allow Towers to target creature
old_tower_target = '''for(let ptype of ['minion','hero','jungle']){
                entities.forEach(e=>{if(e.faction!==this.faction&&!e.isDead){
                    if(e.type==='nexus' && entities.some(t=>t.type==='nexus_turret' && t.faction===e.faction && !t.isDead)) return;
                    let d=dist(this,e);if(d<=this.range&&d<minD&&e.type===ptype){minD=d;target=e;}
                }});
                if(target) break;
            }'''
new_tower_target = '''for(let ptype of ['creature','minion','hero','jungle']){
                entities.forEach(e=>{if(e.faction!==this.faction&&!e.isDead){
                    if(e.type==='nexus' && entities.some(t=>t.type==='nexus_turret' && t.faction===e.faction && !t.isDead)) return;
                    let d=dist(this,e);if(d<=this.range&&d<minD&&e.type===ptype){minD=d;target=e;}
                }});
                if(target) break;
            }'''
content = content.replace(old_tower_target, new_tower_target)

# 4. Allow Minions (including Creatures) to target creature
old_minion_target = '''            } else if(e.type === 'minion' && d < dM) {
                dM = d; closestMinion = e;
            } else if(e.type === 'hero' && d < dH) {
                dH = d; closestHero = e;
            }'''
new_minion_target = '''            } else if((e.type === 'minion' || e.type === 'creature') && d < dM) {
                dM = d; closestMinion = e;
            } else if(e.type === 'hero' && d < dH) {
                dH = d; closestHero = e;
            }'''
content = content.replace(old_minion_target, new_minion_target)

# 5. Allow Heroes (auto attack) to target creature
old_hero_target = '''            for(let ptype of ['minion','hero','jungle']){
                entities.forEach(e=>{
                    if(e.faction!==this.faction && !e.isDead){
                        let d=dist(this,e); if(d<=this.range&&d<minD&&e.type===ptype){minD=d;target=e;}
                    }
                });
                if(target) break;
            }'''
new_hero_target = '''            for(let ptype of ['creature','minion','hero','jungle']){
                entities.forEach(e=>{
                    if(e.faction!==this.faction && !e.isDead){
                        let d=dist(this,e); if(d<=this.range&&d<minD&&e.type===ptype){minD=d;target=e;}
                    }
                });
                if(target) break;
            }'''
content = content.replace(old_hero_target, new_hero_target)

with open('game.js', 'w', encoding='utf-8') as f:
    f.write(content)
print('Patch complete!')
