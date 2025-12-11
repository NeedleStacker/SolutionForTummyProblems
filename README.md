# Recipe Search Application

This is a simple web application that allows users to search for recipes from a large database.

## Project Structure

-   `SQLs/`: Contains the SQL files for populating the database.
-   `backend/`: The Node.js and Express backend server.
-   `frontend/`: The React frontend application.
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

## Backend Setup

1.  **Navigate to the backend directory:**
    -   `cd backend`
2.  **Install dependencies:**
    -   `npm install`
3.  **Set up environment variables:**
    -   The backend connects to the database using environment variables. You can set them in your shell or use a `.env` file. The required variables are:
        -   `DB_HOST`: The host of your MySQL server (defaults to `localhost`).
        -   `DB_USER`: Your MySQL username (defaults to `root`).
        -   `DB_PASSWORD`: Your MySQL password (defaults to an empty string).
4.  **Start the server:**
    -   `node server.js`
    -   The server will run on `http://localhost:3001`.

## Frontend Setup

1.  **Navigate to the frontend directory:**
    -   `cd frontend`
2.  **Install dependencies:**
    -   `npm install`
3.  **Start the application:**
    -   `npm start`
    -   The application will be available at `http://localhost:3000`.

## API Endpoints

### Get All Recipes

-   **URL:** `/api/recipes`
-   **Method:** `GET`
-   **Query Parameters:**
    -   `search` (optional): Search term for title, ingredients, or shopping list.
    -   `site` (optional): Filter recipes by the source website.
-   **Example:** `http://localhost:3001/api/recipes?search=chicken&site=allrecipes.com`

### Get Recipe by ID

-   **URL:** `/api/recipes/:id`
-   **Method:** `GET`
-   **Example:** `http://localhost:3001/api/recipes/1`
