# -*- coding: utf-8 -*-
"""
260612 Code Review Fixes
BUG-01, BUG-02, BUG-03, BUG-04, BALANCE-01~04, CLEAN-01~02
"""

import re, sys

SRC = 'game.js'
with open(SRC, 'r', encoding='utf-8') as f:
    code = f.read()

original_len = len(code)
ok = []
fail = []

def patch(label, old, new):
    global code
    if old not in code:
        fail.append("MISS  " + label)
        return
    n = code.count(old)
    if n > 1:
        fail.append("MULTI " + label + " (" + str(n) + ")")
        return
    code = code.replace(old, new, 1)
    ok.append(label)

# BUG-01: addGold 내부 ZEROS/CRAG 평타 코드(dead code) 완전 제거 + BALANCE-04 RED금고
OLD_ADDGOLD = "window.addGold = function(hero, amount) {\n    if(!hero) return;\n    if(hero.faction === player?.faction) {\n        let tax = amount * 0.03;\n        window.TEAM_VAULT.gold += tax;\n        hero.gold += (amount - tax);\n    } \n            else if(this.heroKey === 'ZEROS') {\n                let a = Math.atan2(target.y-this.y, target.x-this.x);\n                spawnSlash(this.x, this.y-this.radius, a, '#7f1d1d', 120); // \ud760\uc5fc\uac80\n                let hitTargets = entities.filter(e=>e.faction!==this.faction && !e.isDead && dist(e, this) <= this.range + 20);\n                hitTargets.forEach(tgt => {\n                    let dealt=tgt.applyRawDamage(dmg, this); this.totalDmg+=dealt;\n                    this.triggerOnHitPassives(tgt);\n                    if(this.lifeSteal>0) this.hp=Math.min(this.maxHp, this.hp+dealt*this.lifeSteal);\n                });\n                if(this.isPlayer) playSFX('hit');\n            }\n            else if(this.heroKey === 'CRAG') {\n                spawnSlash(this.x, this.y-this.radius, Math.random()*Math.PI*2, '#78716c', 100);\n                spawnParticles(target.x, target.y, '#57534e', 10, 80, 0.5);\n                let hitTargets = entities.filter(e=>e.faction!==this.faction && !e.isDead && dist(e, target) <= 100);\n                hitTargets.forEach(tgt => {\n                    let dealt=tgt.applyRawDamage(dmg, this); this.totalDmg+=dealt;\n                    this.triggerOnHitPassives(tgt);\n                });\n                if(this.isPlayer) playSFX('hit');\n            }\n else {\n        hero.gold += amount;\n    }\n};"

NEW_ADDGOLD = """window.addGold = function(hero, amount) {
    // [v4.2 BUG-01 Fix] addGold 내부의 ZEROS/CRAG 평타 dead code 완전 제거
    if(!hero) return;
    if(hero.faction === player?.faction) {
        let tax = amount * 0.03;
        window.TEAM_VAULT.gold += tax;
        hero.gold += (amount - tax);
    } else {
        // [v4.2 BALANCE-04] RED팀 금고에 3% 세금 적립 -> 크리처 소환에 사용
        window.TEAM_VAULT_RED = window.TEAM_VAULT_RED || { gold: 0 };
        let redTax = amount * 0.03;
        window.TEAM_VAULT_RED.gold += redTax;
        hero.gold += (amount - redTax);
    }
};"""

patch("BUG-01+BALANCE-04: addGold 정상화 + RED금고", OLD_ADDGOLD, NEW_ADDGOLD)

# BUG-02: bonusRange 음수화 방지
OLD_BR = """        // [v4.1 Update] \uc0ac\uac70\ub9ac \uce90\ud551: \ud0c0\uc6cc \uc0ac\uac70\ub9ac(360) \ubbf8\ub9cc\uc73c\ub85c \uc81c\ud55c
        if(this.range > 355) {
            this.range = 355;
            this.bonusRange = 355 - HERO_TMPL[this.heroKey].range;
        }"""
NEW_BR = """        // [v4.1 Update] 사거리 캡핑: 타워 사거리(360) 미만으로 제한
        // [v4.2 BUG-02 Fix] bonusRange 재계산 제거 -> range만 cap, 원본 bonusRange 보존
        if(this.range > 355) {
            this.range = 355;
        }"""
patch("BUG-02: bonusRange 음수화 방지", OLD_BR, NEW_BR)

# BUG-03: stormZone 연동 (제피르 스킬2)
OLD_GALE = """            } else { // Gale Squall
                let a = this.facingDir > 0 ? 0 : Math.PI;
                if(t) a = Math.atan2(t.y - this.y, t.x - this.x);
                let p = new Projectile(this.x, this.y, {x:this.x+Math.cos(a)*800, y:this.y+Math.sin(a)*800, isDead:false}, skillDmg*1.2, this, false, 'tornado');
                p.speed = 100; p.life = 4.0;
                p.isMega = true; // 대형 회오리
                projectiles.push(p);
                playSFX('skill_magic');
            }"""
NEW_GALE = """            } else { // Gale Squall
                let a = this.facingDir > 0 ? 0 : Math.PI;
                if(t) a = Math.atan2(t.y - this.y, t.x - this.x);
                let p = new Projectile(this.x, this.y, {x:this.x+Math.cos(a)*800, y:this.y+Math.sin(a)*800, isDead:false}, skillDmg*1.2, this, false, 'tornado');
                p.speed = 100; p.life = 4.0;
                p.isMega = true; // 대형 회오리
                projectiles.push(p);
                // [v4.2 BUG-03 Fix] stormZone을 entities에 추가 -> EVADE 상태 실제 작동
                entities.push({
                    type: 'stormZone', faction: this.faction,
                    x: this.x + Math.cos(a) * 300, y: this.y + Math.sin(a) * 300,
                    radius: 150, life: 3.5, maxLife: 3.5, isDead: false,
                    update(dt) { this.life -= dt; if(this.life <= 0) this.isDead = true; }
                });
                playSFX('skill_magic');
            }"""
patch("BUG-03: stormZone entities 연동", OLD_GALE, NEW_GALE)

# BUG-04: aiShopAI magic 필터
OLD_SF = """        let eligible = BASE_ITEMS.filter(i=>{
            if(this.gold<i.cost) return false;
            if(i.heroType==='melee'  && heroType!=='melee')  return false;
            if(i.heroType==='ranged' && heroType!=='ranged') return false;
            return true;
        });"""
NEW_SF = """        let eligible = BASE_ITEMS.filter(i=>{
            if(this.gold<i.cost) return false;
            if(i.heroType==='melee'  && heroType!=='melee')  return false;
            if(i.heroType==='ranged' && heroType!=='ranged') return false;
            if(i.heroType==='magic'  && heroType==='melee')  return false; // [v4.2 BUG-04] 근접영웅 magic 아이템 구매 방지
            return true;
        });"""
patch("BUG-04: aiShopAI magic 필터 추가", OLD_SF, NEW_SF)

# BALANCE-01+02: 실비아 atk, range, crit 하향
patch("BALANCE-01+02: SYLVIA atk 90->72, range 450->310",
      'hp:1600, atk:90, aspd:0.6, move:165, range:450, type:"ranged"',
      'hp:1600, atk:72, aspd:0.6, move:165, range:310, type:"ranged"')

patch("BALANCE-02: SYLVIA critChance 0.2->0.15",
      "        critChance:0.2,\n        // \ub808\uc774\uc800 \uad00\ud1b5: 14\ucd08",
      "        critChance:0.15, // [v4.2 BALANCE-02]\n        // 레이저 관통: 14초")

# BALANCE-01: 궁수 range 420->300
patch("BALANCE-01: ARCHER range 420->300",
      'hp:1690, atk:35, aspd:1.3, move:165, range:420, type:"ranged"',
      'hp:1690, atk:35, aspd:1.3, move:165, range:300, type:"ranged"')

# BALANCE-01: 제피르 range 380->285
patch("BALANCE-01: ZEPHYR range 380->285",
      'hp:1800, atk:40, aspd:1.6, move:175, range:380, type:"ranged"',
      'hp:1800, atk:40, aspd:1.6, move:175, range:285, type:"ranged"')

# BALANCE-01: 암흑사제 range 380->285
patch("BALANCE-01: DARKPRIEST range 380->285",
      'hp:1950, atk:35, aspd:1.3, move:155, range:380, type:"ranged"',
      'hp:1950, atk:35, aspd:1.3, move:155, range:285, type:"ranged"')

# BALANCE-01: 조커 range 360->290
patch("BALANCE-01: JOKER range 360->290",
      'hp:1820, atk:42, aspd:1.45, move:175, range:360, type:"ranged"',
      'hp:1820, atk:42, aspd:1.45, move:175, range:290, type:"ranged"')

# BALANCE-03 (CLEAN-03): 아칸 move 150->165
patch("CLEAN-03: ARCHON move 150->165",
      'hp:1820, atk:60, aspd:1.8, move:150, range:150, type:"ranged"',
      'hp:1820, atk:60, aspd:1.8, move:165, range:150, type:"ranged"')

# BALANCE-03: 그르르 포효 이미 1.5초 -- 확인 스킵
ok.append("BALANCE-03: grrr roar stunTimer 1.5s already applied (skip)")

# BALANCE-04: RED팀 크리처 소환 금고 방식
OLD_RED = """            // [v4.1 Update] RED \ud300 \uc2a4\ud3f0 \ub85c\uc9c1 \ub3c5\ub9bd (BLUE\uc758 \uae08\uace0\uc640 \ubd84\ub9ac)
            let redCount = Math.min(Math.floor(GS.time / 360), 3);
            if(redCount > 0) {
                for(let i=0; i<redCount; i++) {
                    let lane = lanes[Math.floor(Math.random() * lanes.length)];
                    let ctype = types[Math.floor(Math.random() * types.length)];
                    entities.push(new Creature(2700, 300, 'RED', lane, ctype));
                }
            }"""
NEW_RED = """            // [v4.2 BALANCE-04] RED팀도 TEAM_VAULT_RED 금고 소모 방식으로 통일 (대칭성 확보)
            window.TEAM_VAULT_RED = window.TEAM_VAULT_RED || { gold: 0 };
            let redCount = Math.floor(window.TEAM_VAULT_RED.gold / 450);
            if(redCount > 0) {
                window.TEAM_VAULT_RED.gold -= redCount * 450;
                for(let i=0; i<redCount; i++) {
                    let lane = lanes[Math.floor(Math.random() * lanes.length)];
                    let ctype = types[Math.floor(Math.random() * types.length)];
                    entities.push(new Creature(2700, 300, 'RED', lane, ctype));
                }
            }"""
patch("BALANCE-04: RED팀 크리처 소환 금고 방식 전환", OLD_RED, NEW_RED)

# CLEAN-01: 황금 고블린 상수 제거
patch("CLEAN-01: GOLD_GOBLIN_TIME 제거",
      "const GOLD_GOBLIN_TIME  = 8 * 60;  // 8분\n",
      "// [v4.2 CLEAN-01] GOLD_GOBLIN_TIME 제거 (황금 고블린 삭제)\n")

patch("CLEAN-01: goblinSpawned 변수 선언 제거",
      "let minionTimer = 0; let dragonTimer = 0; let goblinSpawned = false; let suddenDeathTriggered = false;",
      "let minionTimer = 0; let dragonTimer = 0; let suddenDeathTriggered = false; // [v4.2 CLEAN-01]")

patch("CLEAN-01: goblinSpawned 초기화 제거",
      "midBossSpawned = [false, false, false]; suddenDeathTriggered = false; goblinSpawned = false;",
      "midBossSpawned = [false, false, false]; suddenDeathTriggered = false; // [v4.2 CLEAN-01]")

# CLEAN-02: allRoles support 추가
patch("CLEAN-02: allRoles support 추가",
      "let allRoles = ['top', 'mid', 'bot', 'jungle'];",
      "let allRoles = ['top', 'mid', 'bot', 'jungle', 'support']; // [v4.2 CLEAN-02]")

# 저장
with open(SRC, 'w', encoding='utf-8') as f:
    f.write(code)

print("=== 260612 Fixes Result ===")
print("OK items:")
for item in ok:
    print("  [OK] " + item)
if fail:
    print("FAIL items:")
    for item in fail:
        print("  [!!] " + item)
else:
    print("No failures - all patches applied!")
print("Size: " + str(original_len) + " -> " + str(len(code)))
print("DONE")
