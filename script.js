document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    const siteFilter = document.getElementById('site-filter');
    const searchSection = document.getElementById('search-section');
    const resultsSection = document.getElementById('results-section');
    const recipeDetailsSection = document.getElementById('recipe-details-section');

    let searchTimeout;

    function fetchRecipes() {
        const search = searchInput.value;
        const site = siteFilter.value;

        let url = `api.php?`; // Use relative path
        if (search) {
            url += `search=${search}`;
        }
        if (site) {
            url += `&site=${site}`;
        }

        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
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
                        recipeCard.className = 'col-12 col-md-6 col-lg-4 mb-4';
                        recipeCard.innerHTML = `
                            <div class="card recipe-card">
                                <div class="card-body">
                                    <h5 class="card-title">${recipe.title}</h5>
                                    <p class="card-text text-muted">${recipe.site}</p>
                                </div>
                            </div>
                        `;
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
        fetch(`api.php?id=${id}`) // Use relative path
            .then(response => {
                 if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.error) {
                    console.error('Error from API:', data.error);
                    recipeDetailsSection.innerHTML = '<p>Error loading recipe details.</p>';
                    return;
                }

                // Show details, hide search/results
                searchSection.style.display = 'none';
                resultsSection.style.display = 'none';
                recipeDetailsSection.style.display = 'block';

                let directions = [];
                let shoppingList = [];

                // Custom parser for the database string format "[item1,item2,item3]"
                const parseCustomList = (str, delimiter = ',') => {
                    if (!str || typeof str !== 'string' || str.length < 2) {
                        return [];
                    }
                    // Remove leading '[' and trailing ']' and then split
                    return str.substring(1, str.length - 1).split(delimiter).map(item => item.trim());
                };

                try {
                    // Use the custom parser instead of JSON.parse
                    shoppingList = parseCustomList(data.ner); // ner is comma-separated
                    directions = parseCustomList(data.directions, '.,'); // directions are '.,' separated
                } catch (error) {
                    console.error('Error parsing data from database:', error);
                    recipeDetailsSection.innerHTML = '<h2>Error</h2><p>Could not parse recipe data.</p>';
                    return;
                }

                // Generate directions HTML
                const directionsHtml = directions.map((step, index) => {
                    if (!step) return ''; // Don't render empty steps
                    return `
                        <div class="single-preparation-step d-flex">
                            <h4>${String(index + 1).padStart(2, '0')}.</h4>
                            <p>${step}</p>
                        </div>
                    `;
                }).join('');

                // Generate ingredients HTML (using the NER/shopping list)
                const ingredientsHtml = shoppingList.map((item, index) => {
                    if (!item) return ''; // Don't render empty items
                    return `
                        <div class="custom-control custom-checkbox">
                            <input type="checkbox" class="custom-control-input" id="customCheck${index}">
                            <label class="custom-control-label" for="customCheck${index}">${item}</label>
                        </div>
                    `;
                }).join('');

                recipeDetailsSection.innerHTML = `
                    <div class="container">
                        <button class="btn btn-primary back-button mb-4">← Back to Search</button>
                        <div class="row">
                            <div class="col-12">
                                <div class="receipe-headline my-5">
                                    <h2>${data.title}</h2>
                                    <p class="text-muted">From: <a href="http://${data.site}" target="_blank">${data.site}</a></p>
                                </div>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-12 col-lg-8">
                                ${directionsHtml}
                            </div>
                            <div class="col-12 col-lg-4">
                                <div class="ingredients">
                                    <h4>Shopping List</h4>
                                    ${ingredientsHtml}
                                </div>
                            </div>
                        </div>
                    </div>
                `;

                // Add event listener for the new back button
                recipeDetailsSection.querySelector('.back-button').addEventListener('click', showSearchView);
            })
            .catch(error => {
                console.error('Error fetching recipe details:', error);
                recipeDetailsSection.innerHTML = '<h2>Error</h2><p>Could not load recipe details.</p>';
            });
    }

    function showSearchView() {
        searchSection.style.display = 'block';
        resultsSection.style.display = 'flex'; // it's a row, so flex
        recipeDetailsSection.style.display = 'none';
        recipeDetailsSection.innerHTML = ''; // Clear details
    }

    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(fetchRecipes, 300);
    });

    siteFilter.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(fetchRecipes, 300);
    });

    // Initial fetch
    fetchRecipes();
});
