document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    const searchSection = document.getElementById('search-section');
    const resultsSection = document.getElementById('results-section');
    const recipeDetailsSection = document.getElementById('recipe-details-section');

    let searchTimeout;

    // Custom parser for the database string format "[item1,item2,item3]"
    const parseCustomList = (str, delimiter = ',') => {
        if (!str || typeof str !== 'string' || str.length < 2) {
            return [];
        }
        return str.substring(1, str.length - 1).split(delimiter).map(item => item.trim());
    };

    function fetchRecipes() {
        const search = searchInput.value;
        let url = `api.php?`;
        if (search) url += `search=${search}`;

        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .then(data => {
                if (data.error) {
                    console.error('Error from API:', data.error);
                    resultsSection.innerHTML = '<p class="col-12 text-center">Error loading recipes.</p>';
                    return;
                }
                resultsSection.innerHTML = '';
                if (Array.isArray(data) && data.length > 0) {
                    data.forEach(recipe => {
                        const recipeCard = document.createElement('div');
                        recipeCard.className = 'col-12 col-md-6 col-lg-4 col-xl-3 mb-4';
                        const ingredientsPreview = parseCustomList(recipe.ingredients).slice(0, 3).join(', ');
                        recipeCard.innerHTML = `
                            <div class="card recipe-card">
                                <div class="card-body">
                                    <h5 class="card-title">${recipe.title}</h5>
                                    <p class="card-text">${ingredientsPreview}...</p>
                                </div>
                            </div>`;
                        recipeCard.addEventListener('click', () => fetchRecipeDetails(recipe.id));
                        resultsSection.appendChild(recipeCard);
                    });
                } else {
                    resultsSection.innerHTML = '<p class="col-12 text-center">No recipes found.</p>';
                }
            })
            .catch(error => {
                console.error('Error fetching recipes:', error);
                resultsSection.innerHTML = `<p class="col-12 text-center">Failed to fetch recipes. Make sure api.php is in the correct location.</p>`;
            });
    }

    function fetchRecipeDetails(id) {
        fetch(`api.php?id=${id}`)
            .then(response => {
                 if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .then(data => {
                if (data.error) {
                    console.error('Error from API:', data.error);
                    recipeDetailsSection.innerHTML = '<p>Error loading recipe details.</p>';
                    return;
                }

                searchSection.style.display = 'none';
                resultsSection.style.display = 'none';
                recipeDetailsSection.style.display = 'block';

                let ingredients = [], shoppingList = [], directions = [];

                try {
                    ingredients = parseCustomList(data.ingredients, ',');
                    shoppingList = parseCustomList(data.ner, ',');
                    // Reverted to parsing directions as a list
                    directions = parseCustomList(data.directions, '.,');
                } catch (error) {
                    console.error('Error parsing data from database:', error);
                    recipeDetailsSection.innerHTML = '<h2>Error</h2><p>Could not parse recipe data.</p>';
                    return;
                }

                // Reverted to generating numbered steps for directions
                const directionsHtml = directions.map((step, index) => step ? `
                    <div class="single-preparation-step">
                        <h4>${String(index + 1).padStart(2, '0')}.</h4>
                        <p>${step}</p>
                    </div>` : '').join('');

                const ingredientsListHtml = ingredients.map(item => item ? `<li>${item}</li>` : '').join('');
                const shoppingListHtml = shoppingList.map((item, index) => item ? `
                    <div class="custom-control custom-checkbox">
                        <input type="checkbox" class="custom-control-input" id="customCheck${index}">
                        <label class="custom-control-label" for="customCheck${index}">${item}</label>
                    </div>` : '').join('');

                recipeDetailsSection.innerHTML = `
                    <div class="container">
                        <div class="d-flex justify-content-between mb-4 action-buttons">
                            <button class="btn btn-primary back-button">← Back to Search</button>
                            <button class="btn btn-info print-recipe-btn">Print Recipe</button>
                        </div>
                        <div class="row">
                            <div class="col-12"><div class="receipe-headline my-5"><h2>${data.title}</h2></div></div>
                        </div>
                        <div class="row recipe-body">
                            <div class="col-12 col-lg-8">
                                ${directionsHtml}
                            </div>
                            <div class="col-12 col-lg-4">
                                <div class="ingredients mb-4">
                                    <h4>Ingredients</h4>
                                    <ul>${ingredientsListHtml}</ul>
                                </div>
                                <div class="ingredients">
                                    <h4>Shopping List</h4>
                                    ${shoppingListHtml}
                                    <button class="btn btn-secondary btn-sm mt-3" id="print-list-btn">Print Selected Items</button>
                                </div>
                            </div>
                        </div>
                    </div>`;

                recipeDetailsSection.querySelector('.back-button').addEventListener('click', showSearchView);
                recipeDetailsSection.querySelector('.print-recipe-btn').addEventListener('click', () => window.print());
                recipeDetailsSection.querySelector('#print-list-btn').addEventListener('click', () => printShoppingList(data.title));
            })
            .catch(error => {
                console.error('Error fetching recipe details:', error);
                recipeDetailsSection.innerHTML = '<h2>Error</h2><p>Could not load recipe details.</p>';
            });
    }

    function printShoppingList(recipeTitle) {
        const checkboxes = recipeDetailsSection.querySelectorAll('.custom-control-input');
        const selectedItems = Array.from(checkboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.nextElementSibling.textContent);

        if (selectedItems.length === 0) {
            alert('Please select items from the shopping list to print.');
            return;
        }

        const printWindow = window.open('', '', 'height=600,width=800');
        printWindow.document.write('<html><head><title>Shopping List</title>');
        printWindow.document.write('<style>body{font-family:sans-serif;} ul{list-style:none; padding:0;} li{margin-bottom:10px;}</style>');
        printWindow.document.write('</head><body>');
        printWindow.document.write(`<h2>Shopping List for: ${recipeTitle}</h2>`);
        printWindow.document.write('<ul>');
        selectedItems.forEach(item => {
            printWindow.document.write(`<li>☐ ${item}</li>`);
        });
        printWindow.document.write('</ul>');
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.print();
    }

    function showSearchView() {
        searchSection.style.display = 'block';
        resultsSection.style.display = 'flex';
        recipeDetailsSection.style.display = 'none';
        recipeDetailsSection.innerHTML = '';
    }

    searchInput.addEventListener('input', () => { clearTimeout(searchTimeout); searchTimeout = setTimeout(fetchRecipes, 300); });

    fetchRecipes();
});
