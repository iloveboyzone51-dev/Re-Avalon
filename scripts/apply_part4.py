import re

with open('game.js', 'r', encoding='utf-8') as f:
    js = f.read()

# HoF Functions
hof_funcs = """
window.saveAndReload = function() {
    let name = document.getElementById('playerNameInput').value || '익명';
    let dominance = document.getElementById('dominanceResult').innerText;
    let kda = document.getElementById('kdaResult').innerText;
    
    if(window.player && window.HERO_TMPL) {
        let record = {
            name: name,
            hero: HERO_TMPL[player.heroKey].name,
            kda: kda,
            dominance: dominance,
            date: new Date().toLocaleDateString()
        };
        
        let hof = JSON.parse(localStorage.getItem('avalon_hof') || '[]');
        hof.push(record);
        if(hof.length > 20) hof.shift();
        localStorage.setItem('avalon_hof', JSON.stringify(hof));
    }
    location.reload();
};

window.showHoF = function() {
    let hof = JSON.parse(localStorage.getItem('avalon_hof') || '[]');
    let tbody = document.getElementById('hofTableBody');
    if(!tbody) return;
    
    tbody.innerHTML = '';
    if(hof.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-slate-400">기록이 없습니다.</td></tr>';
    } else {
        hof.slice().reverse().forEach(r => {
            tbody.innerHTML += `
            <tr class="border-t border-slate-700">
                <td class="p-2">${r.name}</td>
                <td class="p-2">${r.hero}</td>
                <td class="p-2 text-center text-amber-400 font-bold">${r.kda}</td>
                <td class="p-2 text-right text-emerald-400 font-bold">${r.dominance}</td>
            </tr>`;
        });
    }
    
    document.getElementById('hofScreen').classList.remove('hidden');
};
"""
if "window.saveAndReload =" not in js:
    js += hof_funcs

# Hook into game over
old_gameover = "document.getElementById('goScoreRed').textContent = GS.scoreRed;"
new_gameover = """document.getElementById('goScoreRed').textContent = GS.scoreRed;
            if(window.player) {
                let myKills = player.kills || 0;
                let myAssists = player.assists || 0;
                let myDeaths = player.deaths || 0;
                let teamKills = player.faction === 'BLUE' ? GS.scoreBlue : GS.scoreRed;
                let dom = 0;
                if(teamKills > 0) dom = Math.round(((myKills + myAssists*0.5) / teamKills) * 100);
                if(dom > 100) dom = 100;
                
                let kdaEl = document.getElementById('kdaResult');
                if(kdaEl) kdaEl.innerText = `${myKills} / ${myDeaths} / ${myAssists}`;
                let domEl = document.getElementById('dominanceResult');
                if(domEl) domEl.innerText = `${dom}%`;
            }"""
js = js.replace(old_gameover, new_gameover)

# Update Underdog buff stats manually when attacking or moving, but since it's deeply integrated, we can just apply a modifier in Hero getter.
# Actually JS doesn't use getters for atk. We must calculate effective atk.
# To keep it simple, we modify the properties in `Hero.update` when buff is active.
# But applying and reverting is buggy if multiple things stack (like Grrr giant + underdog).
# Let's adjust `Hero.update` to recalculate stats from base stats every frame.
old_stats_calc = "let oldState = this.aiState;"
new_stats_calc = """
        // Recalculate stats
        let t = HERO_TMPL[this.heroKey];
        if(t) {
            let effAtk = t.atk; let effAspd = t.aspd; let effMove = t.move;
            // inventory buffs
            for(let i=0; i<8; i++) {
                if(this.inventory[i]) {
                    let b = BASE_ITEMS.find(x=>x.id===this.inventory[i].id);
                    if(b) {
                        let lv = 1 + this.inventory[i].upgrade;
                        if(b.stat==='atk') effAtk += b.val*lv;
                        else if(b.stat==='aspd') effAspd += b.val*lv;
                        else if(b.stat==='move') effMove += b.val*lv;
                    }
                }
            }
            if(this.soulAtkBonus) effAtk += this.soulAtkBonus;
            
            // Grrr Giant buff
            if(this.grrrGiantTimer > 0) {
                effAtk *= 1.5; effMove *= 1.2; effAspd *= 1.2;
            }
            
            // Underdog buff
            if(this.underdogBuffTimer > 0) {
                effAtk *= 1.15; effMove *= 1.15; effAspd *= 1.15;
            }
            
            this.atk = effAtk; this.aspd = effAspd; this.moveSpd = effMove;
        }
        let oldState = this.aiState;
"""
if "Recalculate stats" not in js:
    js = js.replace(old_stats_calc, new_stats_calc)

with open('game.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Part 4 changes applied")
