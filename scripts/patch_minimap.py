def patch_minimap():
    with open(r'multi\game.js', 'r', encoding='utf-8') as f:
        game_js = f.read()

    game_js = game_js.replace('minimap.draw();', 'drawMinimap();')

    with open(r'multi\game.js', 'w', encoding='utf-8') as f:
        f.write(game_js)
    print("Patched minimap.draw() -> drawMinimap()")

if __name__ == '__main__':
    patch_minimap()
