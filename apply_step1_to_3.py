import re

with open('game.js', 'r', encoding='utf-8') as f:
    js = f.read()

# ----------------------------------------------------
# STEP 1: Minimap HUD Complete Rewrite
# ----------------------------------------------------
# 1-1. window.mCtx registration
target_mcanvas = "const mCanvas=document.getElementById('minimapCanvas'); const mCtx=mCanvas.getContext('2d');"
replace_mcanvas = """const mCanvas=document.getElementById('minimapCanvas'); const mCtx=mCanvas.getContext('2d');
window.mCtx = mCtx;
mCanvas.width  = 160;
mCanvas.height = 160;"""
js = js.replace(target_mcanvas, replace_mcanvas)
# remove existing mCanvas.width/height assignment if any
js = re.sub(r"mCanvas\.width\s*=\s*160;\s*mCanvas\.height\s*=\s*160;", "", js)

# 1-2. Replace drawMinimap()
new_minimap = """function drawMinimap() {
    if (!window.mCtx) return;
    const mc = window.mCtx;
    const W  = mCanvas.width;   // 160
    const H  = mCanvas.height;  // 160

    // ── 배경 클리어 ──
    mc.clearRect(0, 0, W, H);
    mc.fillStyle = '#0f172a';
    mc.fillRect(0, 0, W, H);

    // ── 좌표 변환 헬퍼 ──
    const tx = (wx) => (wx / MAP_SIZE) * W;
    const ty = (wy) => (wy / MAP_SIZE) * H;

    // ────────────────────────────────────────
    // [1] 3라인 도로 표시 (라인 상태)
    // ────────────────────────────────────────
    const laneAlpha = 0.35;
    mc.fillStyle = `rgba(139,90,43,${laneAlpha})`;

    // 탑 라인 (좌상단 ㄱ자)
    mc.fillRect(tx(200), ty(200), tx(200), ty(2300)); // 세로 (좌측 벽)
    mc.fillRect(tx(200), ty(200), tx(2300), ty(200)); // 가로 (상단 벽)

    // 바텀 라인 (우하단 ㄱ자)
    mc.fillRect(tx(2500), ty(200), tx(200), ty(2300)); // 세로 (우측 벽)
    mc.fillRect(tx(200), ty(2500), tx(2300), ty(200)); // 가로 (하단 벽)

    // 미드 라인 (대각선)
    mc.save();
    mc.translate(W/2, H/2);
    mc.rotate(-Math.PI/4);
    mc.fillRect(-W*0.58, -H*0.035, W*1.16, H*0.07);
    mc.restore();

    // ────────────────────────────────────────
    // [2] 타워(라인 상태) 표시 — 잔존 여부로 라인 장악 가시화
    // ────────────────────────────────────────
    entities.forEach(e => {
        if(e.isDead) return;
        if(e.type !== 'tower') return; // nexus_turret, nexus 제외

        let col = e.faction === 'BLUE' ? '#3b82f6' : '#ef4444';
        mc.fillStyle = col;
        mc.globalAlpha = 0.6;
        mc.fillRect(tx(e.x) - 2.5, ty(e.y) - 2.5, 5, 5); // 작은 사각형
        mc.globalAlpha = 1;
    });

    // ────────────────────────────────────────
    // [3] 영웅 위치 표시 (핵심)
    // ────────────────────────────────────────
    entities.forEach(e => {
        if(e.type !== 'hero' || e.isDead) return;

        let ex = tx(e.x);
        let ey = ty(e.y);

        if(e === player) {
            // 플레이어: 크고 흰 테두리 + 팀 색
            mc.strokeStyle = '#ffffff';
            mc.lineWidth   = 1.5;
            mc.fillStyle   = e.faction === 'BLUE' ? '#60a5fa' : '#f87171';
            mc.beginPath();
            mc.arc(ex, ey, 4.5, 0, Math.PI*2);
            mc.fill();
            mc.stroke();

            // 플레이어 위에 삼각형 화살표
            mc.fillStyle = '#ffffff';
            mc.beginPath();
            mc.moveTo(ex, ey - 7);
            mc.lineTo(ex - 3, ey - 13);
            mc.lineTo(ex + 3, ey - 13);
            mc.closePath();
            mc.fill();
        } else {
            // AI 영웅: 팀 색 원
            mc.fillStyle = e.faction === 'BLUE' ? '#3b82f6' : '#ef4444';
            mc.beginPath();
            mc.arc(ex, ey, 3, 0, Math.PI*2);
            mc.fill();
        }
    });

    // ────────────────────────────────────────
    // [4] 카메라 시야 사각형 표시 (현재 화면 범위)
    // ────────────────────────────────────────
    if(player) {
        let visW = (window.innerWidth  / camera.zoom) / MAP_SIZE * W;
        let visH = (window.innerHeight / camera.zoom) / MAP_SIZE * H;
        let vcx  = tx(camera.x) - visW/2;
        let vcy  = ty(camera.y) - visH/2;
        mc.strokeStyle = 'rgba(255,255,255,0.25)';
        mc.lineWidth   = 1;
        mc.strokeRect(vcx, vcy, visW, visH);
    }

    // ────────────────────────────────────────
    // [5] 미니맵 테두리
    // ────────────────────────────────────────
    mc.strokeStyle = '#334155';
    mc.lineWidth   = 1.5;
    mc.strokeRect(0, 0, W, H);
}"""
js = re.sub(r"function drawMinimap\(\).*?(?=\n// ============ 메인 루프 ============|\n\s*const canvas)", new_minimap + "\n", js, flags=re.DOTALL)

# ----------------------------------------------------
# STEP 2: Grrr Giant Skill Visual & Bug Fixes
# ----------------------------------------------------
# Step 2-1: Hero.update() timer decrement
js = js.replace("update(dt) {", "update(dt) {\n        if(this.grrrGiantTimer !== undefined && this.grrrGiantTimer > 0) this.grrrGiantTimer -= dt;")

# Step 2-2: remove isGiant from handleAI
# It was already removed or didn't exist in my recent patch, but let's add the shared logic to Hero.update()
grrr_shared_logic = """
        // 그르르 거대화 상태 관리 (플레이어/AI 공통)
        if(this.heroKey === 'grrr') {
            if(this.grrrGiantTimer > 0) {
                if(!this.isGiant) {
                    this.isGiant      = true;
                    this.baseRadius   = this.radius;
                    this.baseMaxHp    = this.maxHp;
                    this.maxHp       *= 1.5;
                    this.hp          += this.baseMaxHp * 0.5;
                    this.hp           = Math.min(this.hp, this.maxHp);
                    this.radius      *= 1.8;
                    this.damageReduction = 0.3;
                }
            } else {
                if(this.isGiant) {
                    this.isGiant      = false;
                    this.damageReduction = 0;
                    this.maxHp        = this.baseMaxHp;
                    this.hp           = Math.min(this.hp, this.maxHp);
                    this.radius       = this.baseRadius;
                }
            }
        }
"""
js = js.replace("update(dt) {", "update(dt) {" + grrr_shared_logic)

# Step 2-3: applyStats
grrr_stats = """
        // 그르르 거대화 스탯
        if(this.heroKey === 'grrr' && this.isGiant) {
            this.atk     *= 1.5;
            this.moveSpd *= 1.2;
            this.aspd    *= 1.2;
        }
        this.hp=Math.min(this.hp, this.maxHp);"""
js = js.replace("this.hp=Math.min(this.hp, this.maxHp);", grrr_stats)

# Step 2-4: drawBlockyHero grrr override
old_draw_grrr = r"\} else if\(type === 'grrr'\) \{[\s\S]*?(?=\} else if\(type === 'vampire'\))"
new_draw_grrr = """} else if(type === 'grrr') {
    drawBody('#d97706', '#92400e', '#78350f'); 
    ctx.fillStyle = '#b45309';
    ctx.beginPath(); ctx.arc(x, y - r*0.6, r*0.85, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath(); ctx.arc(x, y - r*0.6, r*0.5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x - r*0.2, y - r*0.75, r*0.12, r*0.12);
    ctx.fillRect(x + r*0.08, y - r*0.75, r*0.12, r*0.12);
    ctx.fillStyle = '#d97706';
    ctx.beginPath(); ctx.arc(x - r*0.4, y - r*1.05, r*0.22, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r*0.4, y - r*1.05, r*0.22, 0, Math.PI*2); ctx.fill();
    ctx.save();
    if(isAttacking) {
        ctx.translate(x + r*1.2*rotDir, y - r*0.1);
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath(); ctx.arc(0, 0, r*0.5, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#fff7ed';
        for(let ci = -1; ci <= 1; ci++) {
            ctx.beginPath(); ctx.arc(ci * r*0.2, r*0.35, r*0.1, 0, Math.PI*2); ctx.fill();
        }
    }
    ctx.restore();
"""
js = re.sub(old_draw_grrr, new_draw_grrr, js)

# Step 2-5: Giant Visual Feedback (Hero.draw)
hero_draw_giant = """
        // 그르르 거대화 시 황금 오라 링 표시
        if(this.heroKey === 'grrr' && this.isGiant) {
            let pulse = 0.6 + Math.sin(performance.now()/200) * 0.3;
            ctx.globalAlpha = pulse;
            ctx.strokeStyle = '#fcd34d';
            ctx.lineWidth = 5;
            ctx.beginPath(); ctx.arc(this.x, this.y, this.radius + 8, 0, Math.PI*2); ctx.stroke();
            ctx.globalAlpha = 1;
            let remain = this.grrrGiantTimer.toFixed(1);
            ctx.fillStyle = '#fcd34d'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
            ctx.fillText('🦍 ' + remain + 's', this.x, this.y - this.radius - 18);
        }
        
        let bw=40, bh=6,"""
js = js.replace("let bw=40, bh=6,", hero_draw_giant)


# ----------------------------------------------------
# STEP 3: System Stat Bugs
# ----------------------------------------------------
# Archer atkSpdBuffTimer
archer_buff = """
        // 공격속도 임시 버프 (궁수 블링크 등)
        if(this.atkSpdBuffTimer > 0) {
            this.atkSpdBuffTimer -= dt;
            if(this.atkSpdBuffTimer > 0) {
                this._atkSpdBoosted = true;
                this.aspd = (this.baseAspd || this.aspd) * (this.atkSpdBuffRate || 1.5);
            } else {
                if(this._atkSpdBoosted) {
                    this._atkSpdBoosted = false;
                    this.applyStats();
                }
            }
        }"""
js = js.replace("update(dt) {", "update(dt) {" + archer_buff)

# underdogBuffTimer for player
underdog_apply = """
        if(this.underdogBuffTimer > 0) {
            this.atk     *= 1.15;
            this.moveSpd *= 1.15;
            this.aspd    *= 1.15;
        }
"""
js = js.replace("        this.hp=Math.min(this.hp, this.maxHp);", underdog_apply + "        this.hp=Math.min(this.hp, this.maxHp);")
js = js.replace("update(dt) {", "update(dt) {\n        if(this.underdogBuffTimer > 0) this.underdogBuffTimer -= dt;\n")

# Shield repurchase bug
shield_fix = """
        let prevShield = this.shield || 0;
        this.shield = 0;"""
js = js.replace("this.shield = 0;", shield_fix)

shield_fix2 = """
        let newShieldBase = this.shield;
        if(prevShield < newShieldBase) {
            this.shield = newShieldBase;
        } else {
            this.shield = prevShield;
        }
"""
js = js.replace("        if(this.soulAtkBonus)", shield_fix2 + "        if(this.soulAtkBonus)")

# Dragon HP = 0 bug
js = js.replace("let scale=Math.floor(GS.time/300);", "let scale=Math.max(1, Math.floor(GS.time/300));")
js = js.replace("let scale = Math.floor(GS.time/300);", "let scale=Math.max(1, Math.floor(GS.time/300));")

# Assists
assist_logic = """
            let assistRange = 600;
            entities.forEach(ally => {
                if(ally === this || ally.faction !== this.faction || ally.isDead || ally.type !== 'hero') return;
                if(dist(ally, target) < assistRange) {
                    ally.assists = (ally.assists || 0) + 1;
                    ally.gold    += 80;
                    if(ally.isPlayer) addText(ally.x, ally.y-35, '+80G (어시)', '#a78bfa', 13);
                }
            });"""
js = js.replace("            this.gold += goldReward;", "            this.gold += goldReward;\n" + assist_logic)

# KDA display
js = js.replace("const kda = `${h.kills} / ${h.deaths} / 0`;", "const kda = `${h.kills} / ${h.deaths} / ${h.assists || 0}`;")

with open('game.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Applied steps 1 to 3!")
