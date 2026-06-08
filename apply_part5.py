import re

with open('game.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Silence chatBubbles text
js = js.replace("window.chatBubbles.push({ hero: hero, text: msg, life: 3.5 });", "/* Chat deleted */")

# Multi-kill hostile emoji meeting logic
# In gameLoop, check distance between multi-killers and enemies
hostile_logic = """
        // Multi-kill Hostile Emoji Meeting
        heroes.forEach(h => {
            if(window.killStreaks[h.heroKey] >= 3) {
                if(Math.random() < 0.1) {
                    let nearEnemies = heroes.filter(e => e.faction !== h.faction && dist(e, h) < 300);
                    if(nearEnemies.length > 0) {
                        let hEmoji = ['🤬', '👿', '🖕', '💢'][Math.floor(Math.random()*4)];
                        addText(h.x, h.y - 70, hEmoji, '#fff', 28);
                    }
                }
            }
        });
"""
if "Multi-kill Hostile Emoji" not in js:
    js = js.replace("// Update pings", hostile_logic + "\n        // Update pings")

# Update task artifact progress
with open(r'C:\\Users\\LG\\.gemini\\antigravity\\brain\\6b61b6ce-084c-4ccd-a7a1-5504ce040d98\\task.md', 'r', encoding='utf-8') as task_f:
    task_md = task_f.read()
task_md = task_md.replace('[ ]', '[x]')
with open(r'C:\\Users\\LG\\.gemini\\antigravity\\brain\\6b61b6ce-084c-4ccd-a7a1-5504ce040d98\\task.md', 'w', encoding='utf-8') as task_f:
    task_f.write(task_md)

with open('game.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Part 5 changes applied")
