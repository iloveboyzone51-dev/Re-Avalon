def patch_countdown():
    with open(r'multi\game.js', 'r', encoding='utf-8') as f:
        game_js = f.read()

    countdown_func = """
function drawCountdown() {
    if(GS.status !== 'COUNTDOWN') return;
    let cdNum = Math.ceil(GS.countdownTimer);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform for UI
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 120px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ca8a04';
    ctx.shadowBlur = 20;
    ctx.fillText(cdNum > 0 ? cdNum : 'START!', canvas.width/2, canvas.height/2 - 50);
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px sans-serif';
    ctx.shadowBlur = 0;
    ctx.fillText('준비하세요! 카운트다운 동안 스킬 사용이 금지됩니다.', canvas.width/2, canvas.height/2 + 50);
    ctx.restore();
}
"""
    if "function drawCountdown" not in game_js:
        game_js += countdown_func
        
    with open(r'multi\game.js', 'w', encoding='utf-8') as f:
        f.write(game_js)
    print("Added drawCountdown()")

if __name__ == '__main__':
    patch_countdown()
