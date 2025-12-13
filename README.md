# Recipe Search Application

This is a simple web application that allows users to search for recipes from a large database. It is designed to be deployed on a shared Linux hosting environment with PHP and MySQL.

## Project Structure

-   `SQLs/`: Contains the SQL files for populating the database.
-   `index.html`: The main HTML file for the application.
-   `style.css`: The CSS file for styling the application.
-   `script.js`: The JavaScript file for the application's client-side logic.
-   `api.php`: The PHP backend script that serves recipe data.
-   `schema.sql`: The SQL script to create the database schema.

## Database Setup

1.  **Create the database:**
    -   Make sure you have a MySQL server running.
    -   Create a database named `liveinsb_recipes`.

2.  **Create the table:**
    -   Execute the `schema.sql` file to create the `recipes` table.
    -   `mysql -u your_username -p liveinsb_recipes < schema.sql`

3.  **Populate the database:**
    -   Execute all the `.sql` files in the `SQLs/` directory to insert the recipe data.
    -   `for f in SQLs/*.sql; do mysql -u your_username -p liveinsb_recipes < "$f"; done`

## Application Setup

1.  **Configure database credentials:**
    -   Open `config.php` in a text editor.
    -   Replace the placeholder values for `$servername`, `$username`, `$password`, and `$dbname` with your actual MySQL database credentials.

2.  **Deployment:**
    -   Upload all the project files (`index.html`, `style.css`, `script.js`, `api.php`, `config.php`, `schema.sql`, and the `SQLs` directory) to your shared hosting server.
    -   Ensure your web server (e.g., Apache) is configured to serve PHP files.

## API Endpoints

### Search Recipes

-   **URL:** `/api.php`
-   **Method:** `GET`
-   **Query Parameters:**
    -   `title` (optional): A search term to find in the recipe title.
    -   `ingredients` (optional): A comma-separated list of ingredients. The search will return recipes containing *all* specified ingredients.
    -   `shopping_list` (optional): A comma-separated list of shopping list items (NER). The search will return recipes containing *all* specified items.
-   **Example:** `https://yourdomain.com/api.php?title=potatoes&ingredients=garlic,salt`
-   **Note:** If no search parameters are provided, the API will return a random selection of recipes.

### Get Recipe by ID

-   **URL:** `/api.php`
-   **Method:** `GET`
-   **Query Parameters:**
    -   `id` (required): The ID of the recipe to retrieve.
-   **Example:** `https://yourdomain.com/api.php?id=1`
