import os
import re
import shutil
import argparse

def extract_nouns(text):
    """Extracts potential nouns from ingredient text using heuristics."""
    # List of common units and preparation words to filter out
    stopwords = set([
        'a', 'an', 'the', 'and', 'or', 'of', 'in', 'to', 'for', 'with', 'on', 'at',
        'g', 'kg', 'mg', 'l', 'ml', 'cl', 'dl', 'oz', 'lb', 'ts', 'tb', 'c', 'pt',
        'qt', 'ga', 'sm', 'md', 'lg', 'pk', 'cn', 'ds', 'pn', 'dr', 'sl', 'bn',
        'chopped', 'sliced', 'minced', 'optional', 'diced', 'large', 'small', 'medium',
        'beaten', 'melted', 'softened', 'fresh', 'dry', 'whole', 'ground'
    ])

    nouns = []
    # Process each line of ingredients
    for line in text.split('\n'):
        # Remove quantities and units at the beginning of the line
        line = re.sub(r'^\s*[\d\./\s-]+\s*\w*\s*', '', line)
        # Remove anything in parentheses (e.g., "(optional)")
        line = re.sub(r'\(.*\)', '', line)
        # Take the main ingredient part, usually before a comma or semicolon
        main_ingredient = re.split(r'[,;]', line)[0]
        # Clean up and get individual words
        words = re.findall(r'\b\w+\b', main_ingredient.lower())

        for word in words:
            if word and word not in stopwords and not word.isdigit():
                nouns.append(word)

    return list(set(nouns))

def parse_mmf(file_path):
    """Parses a Meal Master file and returns a list of recipe dictionaries."""
    try:
        with open(file_path, 'r', encoding='latin-1') as f:
            content = f.read()
    except Exception as e:
        print(f"Could not read file {file_path}: {e}")
        return None

    recipe_blocks = re.split(r'((?:MMMMM|----------).*Meal-Master.*)', content, flags=re.IGNORECASE)
    if len(recipe_blocks) < 3:
        return None

    recipes = []
    for i in range(2, len(recipe_blocks), 2):
        body = recipe_blocks[i]
        recipe = {
            'title': '', 'ingredients': '', 'directions': '',
            'ner': [], 'site': 'MasterMeal'
        }

        lines = body.splitlines()
        meta_lines, body_lines = [], []
        in_meta = True
        for line in lines:
            stripped = line.strip()
            if re.match(r'^(MMMMM|-----)', stripped): continue

            if in_meta and (stripped.lower().startswith('title:') or \
                            stripped.lower().startswith('categories:') or \
                            stripped.lower().startswith('servings:') or \
                            stripped.lower().startswith('yield:')):
                meta_lines.append(line)
            elif in_meta and not stripped:
                continue
            else:
                in_meta = False
                body_lines.append(line)

        for line in meta_lines:
            if line.strip().lower().startswith('title:'):
                recipe['title'] = line[line.lower().find('title:')+6:].strip()
        if not recipe['title']: continue

        # New logic to find ingredient/direction split
        # Heuristic: An ingredient line is assumed to start with a number (e.g., "1/2 c"),
        # a dash (for continuation), or be indented by at least 4 spaces.
        # The first line that does not match this pattern marks the start of the directions.
        split_index = 0
        ingredient_pattern = re.compile(r'^\s*(\d|-)|\s{4,}')
        for i, line in enumerate(body_lines):
            if not line.strip(): continue
            if ingredient_pattern.match(line):
                split_index = i + 1
            else:
                if i > 0:
                    break

        ingredient_block_lines = body_lines[:split_index]
        direction_lines = body_lines[split_index:]

        # Check for and parse two-column format
        # Heuristic: If more than half the lines in the ingredient block are longer than 45 characters
        # and contain a significant gap (at least 2 spaces) around the typical column break,
        # we assume it's a two-column layout.
        two_column_count = sum(1 for line in ingredient_block_lines if len(line) > 45 and '  ' in line[35:45])
        is_two_column = two_column_count > (len(ingredient_block_lines) / 2) if ingredient_block_lines else False

        ingredient_lines = []
        if is_two_column:
            col1, col2 = [], []
            for line in ingredient_block_lines:
                s_line = line.strip()
                if not s_line: continue
                c1, c2 = line[:40].strip(), line[40:].strip()
                if c1: col1.append(c1)
                if c2: col2.append(c2)
            ingredient_lines.extend(col1)
            ingredient_lines.extend(col2)
        else:
            ingredient_lines = [line.strip() for line in ingredient_block_lines if line.strip()]

        recipe['ingredients'] = '\n'.join(ingredient_lines)
        recipe['directions'] = '\n'.join([line.strip() for line in direction_lines if line.strip()])
        recipe['ner'] = extract_nouns(recipe['ingredients'])
        recipes.append(recipe)

    return recipes if recipes else None

def main():
    parser = argparse.ArgumentParser(description='Parse Meal Master MMF files and generate SQL INSERT statements.')
    parser.add_argument('source_folder', type=str, help='The folder containing the MMF files.')
    parser.add_argument('output_file', type=str, help='The name of the output .sql file.')
    args = parser.parse_args()

    source_folder = args.source_folder
    output_file = args.output_file
    parsed_folder = os.path.join(source_folder, 'Parsed')

    if not os.path.exists(parsed_folder):
        os.makedirs(parsed_folder)

    sql_statements = []

    for filename in os.listdir(source_folder):
        if os.path.isdir(os.path.join(source_folder, filename)):
            continue

        file_path = os.path.join(source_folder, filename)

        try:
            recipes = parse_mmf(file_path)
            if recipes:
                for recipe in recipes:
                    # Escape single quotes for SQL
                    title = recipe['title'].replace("'", "''")
                    ingredients = recipe['ingredients'].replace("'", "''")
                    directions = recipe['directions'].replace("'", "''")
                    ner = ','.join(recipe['ner']).replace("'", "''")

                    sql = f"INSERT INTO recipes(`title`,`ingredients`,`directions`,`ner`,`site`) VALUES ('{title}','[{ingredients}]','[{directions}]','[{ner}]','MasterMeal');"
                    sql_statements.append(sql)

                # Move the parsed file
                shutil.move(file_path, os.path.join(parsed_folder, filename))
                print(f"Successfully parsed {filename}")
            else:
                print(f"Could not parse {filename} as a valid MMF file.")

        except Exception as e:
            print(f"Error processing {filename}: {e}")

    with open(output_file, 'w', encoding='utf-8') as f:
        for statement in sql_statements:
            f.write(statement + '\n')

    print(f"\nGenerated {len(sql_statements)} INSERT statements in {output_file}")

if __name__ == '__main__':
    main()
