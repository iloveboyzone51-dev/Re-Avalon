with open('git_history.txt', encoding='utf-16') as f:
    lines = f.readlines()
with open('git_history_utf8.txt', 'w', encoding='utf-8') as f:
    f.writelines(lines[:500])
