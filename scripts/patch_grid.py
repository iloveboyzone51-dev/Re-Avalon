def patch_grid():
    with open(r'multi\game.js', 'r', encoding='utf-8') as f:
        game_js = f.read()

    # The original background drawing looks like:
    # ctx.fillStyle = '#1e293b';
    # ctx.fillRect(-canvas.width/2 + camera.x, -canvas.height/2 + camera.y, canvas.width, canvas.height);
    # // draw checkerboard floor
    # ...

    grid_func = """
function drawGrid() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-2000, -2000, 4000, 4000);
    
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for(let i = -MAP_SIZE; i <= MAP_SIZE; i += 100) {
        ctx.beginPath(); ctx.moveTo(i, -MAP_SIZE); ctx.lineTo(i, MAP_SIZE); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-MAP_SIZE, i); ctx.lineTo(MAP_SIZE, i); ctx.stroke();
    }
}
"""
    if "function drawGrid" not in game_js:
        game_js += grid_func
        
    with open(r'multi\game.js', 'w', encoding='utf-8') as f:
        f.write(game_js)
    print("Added drawGrid()")

if __name__ == '__main__':
    patch_grid()
