import re

with open(r'c:\Users\LG\Desktop\운빨 아발론\game.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Phase 1: aiShopAI
old_aiShop = """    aiShopAI(){
        let item=BASE_ITEMS[Math.floor(Math.random()*BASE_ITEMS.length)];
        if(this.gold >= item.cost) this.buyItem(item.id);
    }"""
new_aiShop = """    aiShopAI(){
        // [v4.1 Update] AI 아이템 구매 최적화: 영웅 타입에 맞는 아이템만 필터링하여 구매
        let heroType = HERO_TMPL[this.heroKey].type;
        let eligible = BASE_ITEMS.filter(i => 
            i.heroType === heroType || i.heroType === 'magic' || i.heroType === 'common'
        );
        if(eligible.length === 0) return;
        let item = eligible[Math.floor(Math.random() * eligible.length)];
        if(this.gold >= item.cost) this.buyItem(item.id);
    }"""
content = content.replace(old_aiShop, new_aiShop)

# Phase 1: aiSelectSkill
old_aiSkill = """    aiSelectSkill() {
        let available = PASSIVE_SKILLS.filter(s=>(this.passiveSkills[s.id]||0)<s.maxLv);
        if(available.length===0) return;
        let pick = available[Math.floor(Math.random()*available.length)];
        this.passiveSkills[pick.id] = (this.passiveSkills[pick.id]||0) + 1;
        this.applyStats(); this.checkEvolution();
    }"""
new_aiSkill = """    aiSelectSkill() {
        // [v4.1 Update] AI 스킬 선택 최적화: 영웅 타입에 맞지 않는 스킬 제외
        let pType = HERO_TMPL[this.heroKey].type;
        let available = PASSIVE_SKILLS.filter(s => {
            if ((this.passiveSkills[s.id]||0) >= s.maxLv) return false;
            if (pType === 'melee' && s.heroType === 'ranged') return false;
            if (pType === 'ranged' && s.heroType === 'melee') return false;
            return true;
        });
        if(available.length===0) return;
        let pick = available[Math.floor(Math.random()*available.length)];
        this.passiveSkills[pick.id] = (this.passiveSkills[pick.id]||0) + 1;
        this.applyStats(); this.checkEvolution();
    }"""
content = content.replace(old_aiSkill, new_aiSkill)

# Phase 1: Team Vault RED Team bug
old_spawn = """            // RED 팀 스폰 로직
            if(blueCount > 0) {
                for(let i=0; i<blueCount; i++) {
                    let lane = lanes[Math.floor(Math.random() * lanes.length)];
                    let ctype = types[Math.floor(Math.random() * types.length)];
                    entities.push(new Creature(2700, 300, 'RED', lane, ctype));
                }
            }"""
new_spawn = """            // [v4.1 Update] RED 팀 스폰 로직 독립 (BLUE의 금고와 분리)
            let redCount = Math.min(Math.floor(GS.time / 360), 3);
            if(redCount > 0) {
                for(let i=0; i<redCount; i++) {
                    let lane = lanes[Math.floor(Math.random() * lanes.length)];
                    let ctype = types[Math.floor(Math.random() * types.length)];
                    entities.push(new Creature(2700, 300, 'RED', lane, ctype));
                }
            }"""
content = content.replace(old_spawn, new_spawn)

# Phase 1: Golden Goblin Removal
# Use regex to remove the entire block safely
goblin_regex = r"        // 골드 고블린 스폰 \(8분 1회\)\s*if\(typeof goblinSpawned[\s\S]*?showBanner\('황금 고블린 출현! 잡아라!', '💰', true\);\s*}"
content = re.sub(goblin_regex, "        // [v4.1 Update] 황금 고블린 컨텐츠 완전 삭제 (과잉 경제 억제)", content)

# Phase 1: Range Cap in applyStats
old_range = "        if(HERO_TMPL[this.heroKey]) this.range = HERO_TMPL[this.heroKey].range + (this.bonusRange||0);"
new_range = """        if(HERO_TMPL[this.heroKey]) this.range = HERO_TMPL[this.heroKey].range + (this.bonusRange||0);
        // [v4.1 Update] 사거리 캡핑: 타워 사거리(360) 미만으로 제한
        if(this.range > 355) {
            this.range = 355;
            this.bonusRange = 355 - HERO_TMPL[this.heroKey].range;
        }"""
content = content.replace(old_range, new_range)

# Phase 2: Silvia & Ranges
content = content.replace("range: 450, critChance: 0.20", "range: 310, critChance: 0.15") # Silvia
content = content.replace("baseAtk: 90, baseAspd: 0.6", "baseAtk: 72, baseAspd: 0.6") # Silvia
content = content.replace("range: 420,", "range: 300,") # Archer
content = content.replace("range: 390,", "range: 280,") # Ariel
content = content.replace("range: 380,", "range: 290,") # Darkpriest and Zephyr
content = content.replace("range: 360,", "range: 290,") # Joker

# Phase 2: ENHANCE_RATES
content = content.replace("const ENHANCE_RATES = [1, 1, 1, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1];", "const ENHANCE_RATES = [1, 1, 1, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2];")

# Phase 2: MINION_INTERVAL
content = content.replace("const MINION_INTERVAL = 9;", "const MINION_INTERVAL = 14;")

# Phase 2: Random Stat multiplier
old_stat = """            let stats=['atk','hp','move','aspd']; let c=stats[Math.floor(Math.random()*stats.length)];
            let statMsg = '';
            if(c==='atk') { this.baseAtk+=6; statMsg = '공격력 +6'; }
            if(c==='hp') { this.baseMaxHp+=60; this.hp+=60; statMsg = '체력 +60'; }
            if(c==='move') { this.baseMoveSpd+=2.5; statMsg = '이동속도 증가'; }
            if(c==='aspd') { this.baseAspd+=0.12; statMsg = '공격속도 증가'; }"""

new_stat = """            let stats=['atk','hp','move','aspd']; let c=stats[Math.floor(Math.random()*stats.length)];
            let statMsg = '';
            // [v4.1 Update] 무작위 스탯 변동폭 0.5배 ~ 2.0배 추가
            let multiplier = 0.5 + Math.random() * 1.5;
            if(c==='atk') { let val = Math.floor(6*multiplier); this.baseAtk+=val; statMsg = '공격력 +'+val; }
            if(c==='hp') { let val = Math.floor(60*multiplier); this.baseMaxHp+=val; this.hp+=val; statMsg = '체력 +'+val; }
            if(c==='move') { let val = Number((2.5*multiplier).toFixed(1)); this.baseMoveSpd+=val; statMsg = '이속 +'+val; }
            if(c==='aspd') { let val = Number((0.12*multiplier).toFixed(2)); this.baseAspd+=val; statMsg = '공속 +'+val; }"""
content = content.replace(old_stat, new_stat)

# Phase 2: Oracle Glory
old_oracle = "desc:'[진화] 절대 방어력 30 획득 및 맹독 지대 강화'"
new_oracle = "desc:'[진화][근접전용] 절대 방어력 30 획득 및 맹독 지대 강화'"
content = content.replace(old_oracle, new_oracle)

# Phase 3: PASSIVE_SKILLS additions
old_passive = "    { id:'shadowStrike', name:'그림자 일격', icon:'🌑', desc:'[원거리] 타격 시 확률로 추가 어둠 피해를 줍니다.', maxLv:3, heroType:'ranged' },"
new_passive = """    { id:'shadowStrike', name:'그림자 일격', icon:'🌑', desc:'[원거리] 타격 시 확률로 추가 어둠 피해를 줍니다.', maxLv:3, heroType:'ranged' },
    // [v4.1 Update] 원거리 전용 신규 패시브 3종 추가 (빌드 다양성 확보)
    { id:'toxicArrow', name:'맹독 화살', icon:'🐍', desc:'[원거리] 타격 시 적에게 초당 독 피해 (중첩 가능)', maxLv:3, heroType:'ranged' },
    { id:'explosiveArrow', name:'폭발 화살', icon:'💥', desc:'[원거리] 타격 시 소형 범위 폭발 피해', maxLv:4, heroType:'ranged' },
    { id:'focusFire', name:'집중 사격', icon:'🎯', desc:'[원거리] 동일 대상 타격 시 피해량 점진적 증가', maxLv:3, heroType:'ranged' },"""
content = content.replace(old_passive, new_passive)

# Phase 3: Akan and Grrr balances
content = content.replace("baseHp: 1820,", "baseHp: 2100,") # Akan HP buff

old_giant = """        if (this.isGiant) {
            this.maxHp *= 1.5;
        }"""
new_giant = """        if (this.isGiant) {
            this.maxHp *= 1.3; // [v4.1 Update] 그르르 거대화 보정치 1.5 -> 1.3
        }"""
content = content.replace(old_giant, new_giant)

content = re.sub(r'\(2\.0\)\*0\.7 : \(2\.0\)', r'(1.5)*0.7 : (1.5)', content) # Roar stun duration

# Phase 3: Guardian Angel
content = content.replace("cost:2800", "cost:3500")
content = content.replace("desc:'사망 시 부활 (쿨 60초)'", "desc:'사망 시 부활 (쿨 90초)'")
content = content.replace("this.gaTimer = 60.0;", "this.gaTimer = 90.0;")


with open(r'c:\Users\LG\Desktop\운빨 아발론\game.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Patch V4.1 applied completely.")
