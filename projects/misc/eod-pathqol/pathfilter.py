import os
quitOrNot = input("Please ensure you have a path file named 'path.txt' and an inventory file named 'inv.txt' in the same directory as this script. Type 'quit' to exit or press Enter to continue... ")
if quitOrNot.lower() == 'quit':
    exit()

with open('path.txt', 'r', encoding='utf-8') as f1:
    lines1 = f1.readlines()
with open('inv.txt', 'r', encoding='utf-8') as f2:
    lines2 = f2.readlines()

tokens_inv = set()
for line in lines2:
    parts = line.split('=')
    if len(parts) > 1:
        tokens_inv.add(parts[-1].strip())

new_lines = []
for line in lines1:
    parts = line.split('=')
    if len(parts) > 1 and parts[-1].strip() in tokens_inv:
        continue
    new_lines.append(line)

new_file = os.path.join(os.path.dirname(__file__), 'filtered_output.txt')
with open(new_file, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

input("Done! Press Enter to exit ")