import sys
sys.stdout.reconfigure(encoding='utf-8')
lines=open('game.js', encoding='utf-8').read().splitlines()
draw_lines=lines[4550:4600]
print('\n'.join(draw_lines))
