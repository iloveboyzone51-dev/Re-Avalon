import re

def patch_game_loop():
    with open(r'multi\game.js', 'r', encoding='utf-8') as f:
        game_js = f.read()

    # Find the gameLoop function
    # In gameLoop:
    # 1. If CLIENT, we just sync from serverGameState, send input, and draw.
    # 2. If HOST or SINGLE, we do the full update. If HOST, we also serialize and broadcast.

    gameLoop_start = "function gameLoop(now){"
    
    injected_loop = """function gameLoop(now){
    if(GS.status!=='PLAYING' && GS.status!=='COUNTDOWN') return;
    let dt=Math.min((now-GS.lastFrame)/1000, 0.2); GS.lastFrame=now;
    
    // --- MULTIPLAYER CLIENT LOGIC ---
    if(window.Net && window.Net.mode === 'CLIENT') {
        if(!GS.paused && GS.status === 'PLAYING') {
            // Send input to host
            window.Net.broadcastInput(keys, window.joystickData || {active:false, dx:0, dy:0, angle:0});
            
            // Sync state from host
            if(window.serverGameState) {
                // Update entities
                // We just do a dumb overwrite for simplicity in this prototype.
                // In a real game, we'd want interpolation, but this is a pure state-sync.
                // To render correctly, we must restore class prototypes or just use a generic draw loop.
                // Actually, the easiest way for this prototype is to let the Host send the *exact* draw data.
                // But since drawing is local, we just update x, y, hp, maxHp, frame, direction, etc.
                
                // Let's rely on a simplified approach: Host sends an array of draw commands or raw object properties.
                entities = window.serverGameState.entities || [];
                projectiles = window.serverGameState.projectiles || [];
                particles = window.serverGameState.particles || [];
                floatingTexts = window.serverGameState.floatingTexts || [];
                
                GS.scoreBlue = window.serverGameState.scoreBlue || 0;
                GS.scoreRed = window.serverGameState.scoreRed || 0;
            }
        }
        
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.save();
        ctx.translate(canvas.width/2 - camera.x, canvas.height/2 - camera.y);
        
        drawGrid();
        buildings.forEach(b=>b.draw());
        entities.forEach(e => {
            // Need a generic draw function since prototype is lost in JSON
            if(e.drawFallback) e.drawFallback(ctx); // We will inject this later, or just rely on global drawing
            else if(e.type === 'hero' || e.type === 'minion' || e.type === 'monster') drawEntityGeneric(e, ctx);
        });
        projectiles.forEach(p => drawProjectileGeneric(p, ctx));
        particles.forEach(p => { ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2); ctx.fill(); });
        floatingTexts.forEach(ft => drawFloatingTextGeneric(ft, ctx));
        
        ctx.restore();
        
        if(GS.status==='COUNTDOWN') drawCountdown();
        minimap.draw();
        updateUI();
        drawJoystick();
        requestAnimationFrame(gameLoop);
        return;
    }
    // --- END MULTIPLAYER CLIENT LOGIC ---

"""

    game_js = game_js.replace(gameLoop_start, injected_loop, 1)
    
    # Now for HOST, we need to broadcast at the end of the update phase.
    # We find where drawing starts: `ctx.clearRect(0,0,canvas.width,canvas.height);`
    
    draw_start = "ctx.clearRect(0,0,canvas.width,canvas.height);"
    
    host_broadcast = """
    // --- MULTIPLAYER HOST LOGIC ---
    if(window.Net && window.Net.mode === 'HOST' && !GS.paused && GS.status === 'PLAYING') {
        window.serverGameState = {
            scoreBlue: GS.scoreBlue,
            scoreRed: GS.scoreRed,
            entities: entities.map(e => ({
                id: e.id, type: e.type, x: e.x, y: e.y, hp: e.hp, maxHp: e.maxHp, 
                faction: e.faction, radius: e.radius, direction: e.direction, 
                frame: e.frame, isAttacking: e.isAttacking, skill2Active: e.skill2Active,
                heroType: e.heroType, mtype: e.mtype, level: e.level, shield: e.shield,
                isStunned: !!e.stunTimer
            })),
            projectiles: projectiles.map(p => ({
                x: p.x, y: p.y, radius: p.radius, color: p.color, type: p.type, 
                width: p.width, height: p.height, angle: p.angle
            })),
            particles: particles.map(p => ({
                x: p.x, y: p.y, radius: p.radius, color: p.color
            })),
            floatingTexts: floatingTexts.map(ft => ({
                x: ft.x, y: ft.y, text: ft.text, color: ft.color, alpha: ft.alpha
            }))
        };
        window.Net.broadcastGameState();
    }
    // --- END MULTIPLAYER HOST LOGIC ---
    
    ctx.clearRect(0,0,canvas.width,canvas.height);"""
    
    game_js = game_js.replace(draw_start, host_broadcast, 1)
    
    # We also need to add generic draw functions to game.js
    generic_draws = """
function drawEntityGeneric(e, ctx) {
    // A simplified generic drawer for clients
    ctx.save();
    ctx.translate(e.x, e.y);
    if(e.direction==='left') ctx.scale(-1, 1);
    
    // Base circle
    ctx.beginPath();
    ctx.arc(0, 0, e.radius, 0, Math.PI*2);
    if(e.type==='hero') {
        ctx.fillStyle = e.faction==='BLUE' ? '#3b82f6' : '#ef4444';
        if(e.heroType==='ZEROS') ctx.fillStyle='#dc2626';
        if(e.heroType==='SYLVIA') ctx.fillStyle='#14b8a6';
        if(e.heroType==='ZEPHYR') ctx.fillStyle='#4ade80';
    } else if(e.type==='minion') {
        ctx.fillStyle = e.faction==='BLUE' ? '#60a5fa' : '#f87171';
    } else {
        ctx.fillStyle = '#8b5cf6'; // Monster
    }
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000';
    ctx.stroke();
    
    // HP Bar
    ctx.restore();
    ctx.fillStyle = '#000';
    ctx.fillRect(e.x - e.radius, e.y - e.radius - 12, e.radius*2, 6);
    ctx.fillStyle = e.faction==='BLUE' ? '#3b82f6' : '#ef4444';
    ctx.fillRect(e.x - e.radius, e.y - e.radius - 12, (e.radius*2) * (Math.max(0, e.hp)/e.maxHp), 6);
}

function drawProjectileGeneric(p, ctx) {
    ctx.save();
    ctx.translate(p.x, p.y);
    if(p.angle) ctx.rotate(p.angle);
    ctx.fillStyle = p.color || '#fff';
    if(p.type === 'laser') {
        ctx.fillRect(-p.width/2, -p.height/2, p.width, p.height);
    } else if(p.type === 'tornado') {
        ctx.font = '20px Arial';
        ctx.fillText('🌪️', -10, 7);
    } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.radius || 5, 0, Math.PI*2);
        ctx.fill();
    }
    ctx.restore();
}

function drawFloatingTextGeneric(ft, ctx) {
    ctx.save();
    ctx.globalAlpha = ft.alpha;
    ctx.fillStyle = ft.color;
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
}
"""
    game_js += generic_draws
    
    with open(r'multi\game.js', 'w', encoding='utf-8') as f:
        f.write(game_js)
    print("Patched gameLoop in game.js")

if __name__ == '__main__':
    patch_game_loop()
