import re
import pyperclip

filename = "filtered_output.txt"

def copy_before_final_equals(line):
    last_equals = line.rfind("=")
    if last_equals == -1:
        return line.strip()
    return line[:last_equals].strip()

def main():
    with open(filename, "r", encoding="utf-8") as file:
        lines = file.readlines()

    index = 0
    while index < len(lines):
        line = re.sub(r'^\d+\.\s*', '', lines[index])
        to_copy = copy_before_final_equals(line)
        pyperclip.copy(to_copy)
        print(f"\n{line.strip()}")
        user_input = input(
            'Press Enter or type "del" to delete, "skip" to keep, or "quit" to exit: '
        ).strip().lower()

        if user_input in ("del", ""):  # Delete line on Enter or 'del'
            print("Deleting this line.")
            del lines[index]
        elif user_input == "skip":
            index += 1
        elif user_input == "quit":
            print("Exiting program.")
            break
        else:
            print("Invalid input. Use Enter/"'del'" to delete, 'skip' to keep, 'quit' to end.")

    with open(filename, "w", encoding="utf-8") as file:
        file.writelines(lines)

if __name__ == "__main__":
    print("Each combination will be added to your clipboard! Just Ctrl+V in the textbox :)")
    main()
