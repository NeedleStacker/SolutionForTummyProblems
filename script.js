document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    const siteFilter = document.getElementById('site-filter');
    const recipeList = document.getElementById('recipe-list');
    const recipeDetails = document.getElementById('recipe-details');

    let searchTimeout;

    function fetchRecipes() {
        const search = searchInput.value;
        const site = siteFilter.value;

        let url = `/api.php?`;
        if (search) {
            url += `search=${search}`;
        }
        if (site) {
            url += `&site=${site}`;
        }

        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    console.error('Error from API:', data.error);
                    recipeList.innerHTML = '<p>Error loading recipes. Please check the console for details.</p>';
                    return;
                }
                recipeList.innerHTML = '';
                if (Array.isArray(data)) {
                    data.forEach(recipe => {
                        const recipeItem = document.createElement('div');
                        recipeItem.className = 'recipe-item';
                        recipeItem.innerHTML = `<h3>${recipe.title}</h3><p>${recipe.site}</p>`;
                        recipeItem.addEventListener('click', () => fetchRecipeDetails(recipe.id));
                        recipeList.appendChild(recipeItem);
                    });
                }
            })
            .catch(error => console.error('Error fetching recipes:', error));
    }

    function fetchRecipeDetails(id) {
        fetch(`/api.php?id=${id}`)
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    console.error('Error from API:', data.error);
                    recipeDetails.innerHTML = '<p>Error loading recipe details. Please check the console for details.</p>';
                    return;
                }
                recipeDetails.style.display = 'block';

                let ingredients = [];
                let directions = [];
                let shoppingList = [];

                try {
                    ingredients = JSON.parse(data.ingredients);
                    directions = JSON.parse(data.directions);
                    shoppingList = JSON.parse(data.ner);
                } catch (error) {
                    console.error('Error parsing JSON from database:', error);
                    // Handle cases where the data in the DB is not valid JSON
                    recipeDetails.innerHTML = '<h2>Error</h2><p>Could not parse recipe data.</p>';
                    return;
                }

                recipeDetails.innerHTML = `
                    <h2>${data.title}</h2>
                    <h3>Ingredients</h3>
                    <ul>
                        ${ingredients.map(ingredient => `<li>${ingredient}</li>`).join('')}
                    </ul>
                    <h3>Directions</h3>
                    <ol>
                        ${directions.map(direction => `<li>${direction}</li>`).join('')}
                    </ol>
                    <h3>Shopping List</h3>
                    <ul>
                        ${shoppingList.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                    <a href="http://${data.site}" target="_blank" rel="noopener noreferrer">Original Recipe</a>
                    <button onclick="document.getElementById('recipe-details').style.display = 'none'">Close</button>
                `;
            })
            .catch(error => console.error('Error fetching recipe details:', error));
    }

    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(fetchRecipes, 300);
    });

    siteFilter.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(fetchRecipes, 300);
    });

    fetchRecipes();
});
