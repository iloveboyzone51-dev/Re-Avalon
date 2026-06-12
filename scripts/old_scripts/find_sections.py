import re
with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if 'id="startScreen"' in line or 'id="gameScreen"' in line or 'id="patchNotesModal"' in line or 'id="deathScreen"' in line:
        print(i+1, line.strip()[:100])
