import sys
sys.stdout.reconfigure(encoding='utf-8')
with open('game.js', encoding='utf-8') as f:
    lines = f.readlines()
for j in range(1280, 1315):
    print(f"{j+1}: {lines[j].strip()}")
