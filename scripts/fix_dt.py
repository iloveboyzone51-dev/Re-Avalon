def fix_dt():
    with open(r'multi\game.js', 'r', encoding='utf-8') as f:
        lines = f.read().splitlines()

    # Find where I injected `let dt=...`
    # and remove the second `let dt=...`

    out_lines = []
    found_first_dt = False
    for i, line in enumerate(lines):
        if 'let dt=Math.min((now-GS.lastFrame)/1000, 0.2); GS.lastFrame=now;' in line:
            if not found_first_dt:
                found_first_dt = True
                out_lines.append(line)
            else:
                # Replace with assignment instead of let
                out_lines.append(line.replace('let dt=', 'dt='))
        else:
            out_lines.append(line)

    with open(r'multi\game.js', 'w', encoding='utf-8') as f:
        f.write('\n'.join(out_lines))
    print("Fixed dt duplicate declaration")

if __name__ == '__main__':
    fix_dt()
