def patch_client_camera():
    with open(r'multi\game.js', 'r', encoding='utf-8') as f:
        game_js = f.read()

    target = """        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.save();
        ctx.translate(canvas.width/2 - camera.x, canvas.height/2 - camera.y);"""

    replace = """
        // Find our local hero to follow
        if(window.playerHero && window.playerHero.netId) {
            let myHero = entities.find(e => e.id === window.playerHero.netId || e.netId === window.playerHero.netId);
            if(myHero) {
                // smooth camera
                camera.x += (myHero.x - camera.x) * 0.1;
                camera.y += (myHero.y - camera.y) * 0.1;
            }
        } else if (entities.length > 0 && entities[0].type === 'hero') {
            camera.x += (entities[0].x - camera.x) * 0.1;
            camera.y += (entities[0].y - camera.y) * 0.1;
        }

        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.save();
        ctx.translate(canvas.width/2 - camera.x, canvas.height/2 - camera.y);"""

    game_js = game_js.replace(target, replace)

    # Also, we need to assign a netId to playerHero when we create it, so we know which one is us.
    # Actually, in network.js, when we connect, we have Net.myId.
    # If the Host spawns heroes, the Host needs to assign `netId = client.id` to the hero!
    
    with open(r'multi\game.js', 'w', encoding='utf-8') as f:
        f.write(game_js)
    print("Patched client camera")

if __name__ == '__main__':
    patch_client_camera()
