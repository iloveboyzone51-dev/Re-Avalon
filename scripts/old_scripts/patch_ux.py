import sys

def patch_ux():
    with open('game.js', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update updateUI to set icons dynamically
    update_ui_target = """    // 히어로 패시브 쿨다운 표시
    let m1=document.getElementById('maskSkill1'), m2=document.getElementById('maskSkill2');"""
    update_ui_replace = """    // 스킬 아이콘 동적 업데이트
    let t = HERO_TMPL[player.heroKey];
    if(t) {
        let s1Icon = t.skill1 && t.skill1.icon ? t.skill1.icon : '✨';
        let s2Icon = t.skill2 && t.skill2.icon ? t.skill2.icon : '💫';
        let s1El = document.getElementById('txtSkill1Icon');
        let s2El = document.getElementById('txtSkill2Icon');
        if(s1El && s1El.textContent !== s1Icon) s1El.textContent = s1Icon;
        if(s2El && s2El.textContent !== s2Icon) s2El.textContent = s2Icon;
    }

    // 히어로 패시브 쿨다운 표시
    let m1=document.getElementById('maskSkill1'), m2=document.getElementById('maskSkill2');"""
    
    if update_ui_target in content:
        content = content.replace(update_ui_target, update_ui_replace)
        print("Patched updateUI")

    # 2. Add cumulative damage logic to Building
    building_target = """            if(target){
                this.attackTimer=1/this.aspd;
                let dmg = this.atk;"""
    building_replace = """            if(target){
                if(this.currentTarget !== target) {
                    this.currentTarget = target;
                    this.consecutiveHits = 0;
                }
                this.consecutiveHits++;
                this.attackTimer=1/this.aspd;
                let dmg = this.atk * (1 + this.consecutiveHits * 0.15); // 연속 타격 시 데미지 15%씩 누적 증가
                if(this.type === 'nexus_turret') dmg = this.atk * (1 + this.consecutiveHits * 0.25); // 수호 타워는 25%씩 강력하게 누적
"""
    if building_target in content:
        content = content.replace(building_target, building_replace)
        print("Patched Building cumulative damage")
        
    # 3. Add skill icons definitions at the end of HERO_TMPL. Since HERO_TMPL is huge, we can just inject an Object loop at the bottom of the file
    icon_script = """
// 영웅별 스킬 아이콘 매핑
const HERO_ICONS = {
    CRAG: { s1: '🛡️', s2: '⛰️' },
    BERSERKER: { s1: '🪓', s2: '🩸' },
    ARCHER: { s1: '🏹', s2: '🎯' },
    NECROMANCER: { s1: '💀', s2: '👻' },
    grrr: { s1: '🐾', s2: '🦁' },
    VAMPIRE: { s1: '🦇', s2: '🧛' },
    THOR: { s1: '⚡', s2: '🔨' },
    ICEBORN: { s1: '❄️', s2: '⛄' },
    JOKER: { s1: '🃏', s2: '💰' },
    DARKPRIEST: { s1: '🔮', s2: '👁️' },
    ARCHON: { s1: '⚡', s2: '🌀' },
    BARBARIAN: { s1: '⚔️', s2: '😡' },
    ZEROS: { s1: '🗡️', s2: '👣' },
    SYLVIA: { s1: '🔫', s2: '💣' },
    ZEPHYR: { s1: '🌪️', s2: '🌀' }
};
Object.keys(HERO_ICONS).forEach(k => {
    if(HERO_TMPL[k]) {
        if(HERO_TMPL[k].skill1) HERO_TMPL[k].skill1.icon = HERO_ICONS[k].s1;
        if(HERO_TMPL[k].skill2) HERO_TMPL[k].skill2.icon = HERO_ICONS[k].s2;
    }
});
"""
    content += icon_script

    with open('game.js', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    patch_ux()
