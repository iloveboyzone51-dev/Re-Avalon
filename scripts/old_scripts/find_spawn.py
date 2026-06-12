import sys
sys.stdout.reconfigure(encoding='utf-8')
with open('game.js', encoding='utf-8') as f:
    lines = f.readlines()

idx = next(i for i,l in enumerate(lines) if 'window.spawnCreatures = function' in l)
for i in range(idx, idx+40):
    print(f"{i+1}: {lines[i].strip()}")
