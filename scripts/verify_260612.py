# -*- coding: utf-8 -*-
content = open('game.js', encoding='utf-8').read()

shop_section = content[content.find('aiShopAI'):content.find('aiShopAI')+700]
gale_section = content[content.find('Gale Squall'):content.find('Gale Squall')+1000]
addgold_section = content[content.find('window.addGold'):content.find('window.addGold')+600]
allroles_section = content[content.find('allRoles'):content.find('allRoles')+100]

checks = [
    ('BUG-01: addGold no ZEROS dead code', 'ZEROS' not in addgold_section),
    ('BUG-01: RED tax in addGold', 'TEAM_VAULT_RED' in addgold_section),
    ('BUG-02: bonusRange no negative', 'bonusRange = 355' not in content),
    ('BUG-03: stormZone in entities', 'entities.push' in gale_section and 'stormZone' in gale_section),
    ('BUG-04: magic melee filter', "i.heroType==='magic'" in shop_section),
    ('BALANCE-01: SYLVIA range 310', 'range:310' in content),
    ('BALANCE-01: ARCHER range 300', 'range:300' in content),
    ('BALANCE-01: ZEPHYR range 285', 'range:285' in content),
    ('BALANCE-02: SYLVIA atk 72', 'atk:72' in content),
    ('BALANCE-02: SYLVIA crit 0.15', 'critChance:0.15' in content),
    ('CLEAN-03: ARCHON move 165', 'move:165, range:150' in content),
    ('BALANCE-04: RED vault spawn', 'redCreatureCount' in content),
    ('BALANCE-04: RED vault addGold', 'TEAM_VAULT_RED' in content),
    ('CLEAN-01: goblin spawn removed', 'goblinSpawned = true' not in content),
    ('CLEAN-02: support role added', "'support'" in allroles_section),
]

all_ok = True
for name, result in checks:
    status = 'OK  ' if result else 'FAIL'
    if not result: all_ok = False
    print('[' + status + '] ' + name)

print()
print('ALL OK!' if all_ok else 'SOME FAILURES - CHECK ABOVE')
