def patch_client_loop():
    with open(r'multi\game.js', 'r', encoding='utf-8') as f:
        game_js = f.read()

    target = "else if(e.type === 'hero' || e.type === 'minion' || e.type === 'monster') drawEntityGeneric(e, ctx);"
    replace = "else if(e.type === 'hero' || e.type === 'minion' || e.type === 'monster' || e.type === 'tower' || e.type === 'nexus' || e.type === 'nexus_turret') drawEntityGeneric(e, ctx);"
    
    game_js = game_js.replace(target, replace)
    
    with open(r'multi\game.js', 'w', encoding='utf-8') as f:
        f.write(game_js)
    print("Patched client loop condition")

if __name__ == '__main__':
    patch_client_loop()
