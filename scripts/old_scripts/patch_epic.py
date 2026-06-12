import sys
with open('game.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 6. EpicDragon HP/Atk 40% reduction
epic_dragon_target = """        this.radius = 60; // 5배 크기 (기본 약 12)
        this.maxHp = 45000 * scale; this.hp = this.maxHp;
        this.atk = 450 * scale;
        this.defense = 75 * scale;"""
epic_dragon_replace = """        this.radius = 60; // 5배 크기 (기본 약 12)
        this.maxHp = 27000 * scale; this.hp = this.maxHp; // 40% 감소
        this.atk = 270 * scale; // 40% 감소
        this.defense = 75 * scale;"""

if epic_dragon_target in content:
    content = content.replace(epic_dragon_target, epic_dragon_replace)
    print("EpicDragon stats updated.")
else:
    print("EpicDragon stats target not found!")

with open('game.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Applied EpicDragon patch to game.js!")
