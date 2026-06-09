import re

with open('game.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Replace HERO_TMPL
new_hero_tmpl = """const HERO_TMPL = {
    BERSERKER: { name:"광전사", color:"#ef4444", hp:1900, atk:52, aspd:1.3, move:185, range:90,  type:"melee",  skill1:{name:"회전 참격",cd:5}, skill2:{name:"도약 강타",cd:8},  draw:(ctx,x,y,r,dir,f,anim)=>drawBlockyHero(ctx,x,y,r,dir,f,'berserker',anim) },
    ARCHER:    { name:"궁수",    color:"#10b981", hp:1300, atk:35, aspd:1.3, move:165, range:420, type:"ranged", skill1:{name:"화살 폭우",cd:6}, skill2:{name:"블링크",  cd:10}, critChance:0.15, draw:(ctx,x,y,r,dir,f,anim)=>drawBlockyHero(ctx,x,y,r,dir,f,'archer',anim) },
    NECROMANCER:{ name:"네크로맨서",color:"#a855f7",hp:1400, atk:38, aspd:1.0, move:150, range:360, type:"ranged", skill1:{name:"해골 소환",cd:7}, skill2:{name:"저주 역병",cd:11}, draw:(ctx,x,y,r,dir,f,anim)=>drawBlockyHero(ctx,x,y,r,dir,f,'necromancer',anim) },
    grrr: { name:'그르르', color:"#f59e0b", hp:1600, atk:70, aspd:0.9, move:150, range:60, type:"melee",
        skill1:{name:'거대화', type:'self_buff', cd:18, desc:'몸집이 커지고 능력치 증가'},
        skill2:{name:'포효', type:'aoe_stun', cd:12, desc:'주변 적을 스턴시킴'},
        draw:(ctx,x,y,r,dir,f,anim)=>drawBlockyHero(ctx,x,y,r,dir,f,'grrr',anim) },
    VAMPIRE:   { name:"뱀파이어",color:"#f43f5e", hp:1700, atk:45, aspd:1.2, move:175, range:110, type:"melee",  skill1:{name:"흡혈 파동",cd:7}, skill2:{name:"박쥐 강습",cd:9},  lifeSteal:0.20, draw:(ctx,x,y,r,dir,f,anim)=>drawBlockyHero(ctx,x,y,r,dir,f,'vampire',anim) },
    THOR:      { name:"토르",    color:"#60a5fa", hp:2300, atk:65, aspd:0.85,move:175, range:100, type:"melee",  skill1:{name:"번개 강타",cd:9}, skill2:{name:"충격파",  cd:11}, draw:(ctx,x,y,r,dir,f,anim)=>drawBlockyHero(ctx,x,y,r,dir,f,'thor',anim) },
    ICEBORN: {
        name:"이스버그", color:"#38bdf8",
        hp:2200, atk:48, aspd:0.95, move:160, range:85, type:"melee",
        skill1: { name:"빙결 창격", cd:7, desc:"전방 원뿔형 범위에 얼음 창을 투척. 적 이동속도 60% 감소 2.5초" },
        skill2: { name:"얼음 감옥", cd:14, desc:"대상 위치에 얼음 기둥 소환. 반경 100 내 적 2초 완전 빙결(스턴)" },
        draw:(ctx,x,y,r,dir,f,anim) => drawBlockyHero(ctx,x,y,r,dir,f,'iceborn',anim)
    },
    JOKER: {
        name:"조커블레이드", color:"#a855f7",
        hp:1400, atk:42, aspd:1.4, move:175, range:360, type:"ranged",
        critChance:0.12,
        skill1: { name:"왕의 패", cd:8, desc:"카드 3장을 무작위로 뽑음. 각각 공격/방어/특수 효과 중 랜덤 발동" },
        skill2: { name:"전체 배팅", cd:16, desc:"현재 골드의 20%를 베팅. 50% 확률로 2배 환급. 실패 시 0. 그리고 강력한 카드 폭풍 발동" },
        draw:(ctx,x,y,r,dir,f,anim) => drawBlockyHero(ctx,x,y,r,dir,f,'joker',anim)
    },
    DARKPRIEST: {
        name:"암흑사제", color:"#7c3aed",
        hp:1500, atk:35, aspd:1.0, move:155, range:380, type:"ranged",
        skill1: { name:"영혼 착취", cd:10, desc:"아군 영웅 한 명의 HP 15%를 흡수해 강화 투사체 발사. 아군 동의 없음." },
        skill2: { name:"저주의 낙인", cd:14, desc:"대상 적에게 저주 낙인. 10초간 아군 모든 공격이 대상에게 30% 추가 피해" },
        draw:(ctx,x,y,r,dir,f,anim) => drawBlockyHero(ctx,x,y,r,dir,f,'darkpriest',anim)
    }
};"""

js = re.sub(r"const HERO_TMPL = \{[\s\S]*?(?=\n// ============ 아이템 ============)", new_hero_tmpl, js)

# Replace BASE_ITEMS
new_base_items = """const BASE_ITEMS = [
    { id:'atk',      name:'전사의 투구', cost:300, stat:'atk',      val:18,   icon:'⚔️' },
    { id:'aspd',     name:'광전사의 칼',   cost:350, stat:'aspd',     val:0.18, icon:'🗡️' },
    { id:'hp',       name:'거인의 심장',   cost:250, stat:'hp',       val:200,  icon:'❤️' },
    { id:'move',     name:'바람의 장화',   cost:250, stat:'move',     val:18,   icon:'🥾' },
    { id:'crit',     name:'암살자의 비수',    cost:450, stat:'crit',     val:0.08, icon:'💥' },
    { id:'lifesteal',name:'흡혈귀의 이빨',        cost:550, stat:'lifesteal',val:0.12, icon:'🩸' },
    { id:'reflect',  name:'가시 갑옷',    cost:400, stat:'reflect',  val:0.12, icon:'🛡️' },
    { id:'burn',     name:'화염검',      cost:400, stat:'burn',     val:18,   icon:'🔥' },
    { id:'stun',     name:'기절무기',    cost:650, stat:'stun',     val:0.08, icon:'⚡' },
    { id:'shield',   name:'방어막',      cost:500, stat:'shield',   val:80,   icon:'🔰' }
];"""

js = re.sub(r"const BASE_ITEMS = \[[\s\S]*?(?=\n// ============ 시스템 설정 ============)", new_base_items, js)

# 1-3. 미니언 스케일 증가속도 상한선
js = js.replace("let scale=Math.floor(GS.time/300);", "let scale=Math.max(1, Math.floor(GS.time/300));")
js = js.replace("let scale = 1 + GS.time / 300;", "let scale = Math.min(4.5, 1 + GS.time / 450);")

# 1-4. 타워 스탯
tower_stats = """            if(btype==='nexus')       { this.maxHp=6000; this.atk=0;   this.range=0;   this.radius=50; }
            else if(btype==='nexus_turret') { this.maxHp=3500; this.atk=280; this.aspd=1.3; this.range=320; this.radius=20; }
            else                      { this.maxHp=4000; this.atk=180; this.aspd=1.1;  this.range=330; this.radius=28; }"""

js = re.sub(r"if\(btype==='nexus'\)[\s\S]*?(?=this\.hp=this\.maxHp;)", tower_stats + "\n            ", js)

# 쌍발 로직 제거 -> 수호탑 전용으로 롤백
double_shot = """                    if(this.btype === 'nexus_turret') { // 수호탑 전용 (일반 타워는 단발)
                        setTimeout(()=>{
                            if(this.isDead || !t || t.isDead) return;
                            projectiles.push(new Projectile(this.x, this.y, t, dmg, this, false));
                        }, 150);
                    }"""
js = re.sub(r"setTimeout\(\(\)=>\{[\s\S]*?\}, 150\);", double_shot, js)

with open('game.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Applied step 5 partial!")
