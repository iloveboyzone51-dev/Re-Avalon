import re
import sys

with open('game.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the broken applyRawDamage calls
# It looks like: e.applyRawDamage(skillDmg, this, true, true, true, true); //*1.8,this); e.stunTimer = ...
# Or: let dealt=tgt.applyRawDamage(dmg, this, true, true); //, this); this.totalDmg+=dealt;

def repl(match):
    prefix = match.group(1) # e.g. e.applyRawDamage(
    base_var = match.group(2) # e.g. skillDmg or dmg
    # match.group(3) is the middle stuff: , this, true, true, true, true); //
    commented = match.group(4) # e.g. *1.8,this); ...
    
    # We want to reconstruct the original call, but insert true, true before the closing paren.
    # The original was: prefix + base_var + commented
    # For example: e.applyRawDamage(skillDmg*1.8,this); e.stunTimer=...
    original = prefix + base_var + commented
    
    # Now we safely replace ,this) or , this) with , this, true, true)
    # But wait, we can just replace ,this); or , this); with , this, true, true);
    new_version = re.sub(r',\s*this\s*\)', ', this, true, true)', original, count=1)
    return new_version

pattern = r'(applyRawDamage\()(skillDmg|dmg|pBomb|pStorm|pz\.dmg|tickDrain)([^/]*);//(.*)'
fixed_content = re.sub(pattern, repl, content)

with open('game.js', 'w', encoding='utf-8') as f:
    f.write(fixed_content)

print("Fix applied.")
