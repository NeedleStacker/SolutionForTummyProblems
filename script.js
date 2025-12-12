document.addEventListener('DOMContentLoaded', async () => {
    // --- Global Variables & DOM Elements ---
    const searchInput = document.getElementById('search-input');
    const searchSection = document.getElementById('search-section');
    const resultsSection = document.getElementById('results-section');
    const recipeDetailsSection = document.getElementById('recipe-details-section');
    const tooltipBox = document.getElementById('unit-tooltip-box');
    let searchTimeout;
    let conversions = {}; // Will be populated by fetching conversions.json

    // --- Fetch Conversion Data ---
    try {
        const response = await fetch('conversions.json');
        if (!response.ok) throw new Error('Failed to load conversion data.');
        conversions = await response.json();
    } catch (error) {
        console.error(error);
        // If conversions fail to load, the tooltip feature will gracefully fail
        // without crashing the rest of the application.
    }

    // --- UNIT CONVERSION TOOLTIP LOGIC ---
    const unitRegex = /\b(\d+(?:[.,]\d+)?)(\s?)(cm|mm|m|km|in|ft|yd|kg|g|mg|lb|oz|°C|°F|K|ml|mL|l|L)\b/gi;

    function applyTooltips(container) {
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                const parent = node.parentElement;
                if (!parent || parent.closest('.unit-tooltip') || ["SCRIPT","STYLE","CODE","PRE","A","BUTTON"].includes(parent.tagName) || parent.closest("a, button")) return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
            }
        });
        while (walker.nextNode()) {
            const node = walker.currentNode;
            const text = node.nodeValue;
            if (unitRegex.test(text)) {
                const wrapper = document.createElement('span');
                wrapper.innerHTML = text.replace(unitRegex, (match, value, _, unit) => `<span class="unit-tooltip" data-value="${value.replace(",", ".")}" data-unit="${unit}">${match}</span>`);
                node.parentNode.replaceChild(wrapper, node);
            }
        }
    }

    function showTooltip(e) {
        const target = e.target;
        if (!target.classList.contains('unit-tooltip') || Object.keys(conversions).length === 0) return;

        const value = parseFloat(target.dataset.value);
        const unit = target.dataset.unit;
        const conversionData = conversions[unit];

        if (conversionData) {
            let tooltipContent = '';
            for (const [targetUnit, data] of Object.entries(conversionData)) {
                let result;
                if (typeof data === 'number') { // Simple multiplier
                    result = (value * data).toFixed(2);
                } else if (data.formula) { // Complex formula (e.g., °F to K)
                    // This is a safe way to evaluate a simple math formula from JSON
                    result = new Function('v', `return ${data.formula}`)(value).toFixed(2);
                } else { // Multiplier and offset (e.g., °C to °F)
                    result = (value * (data.multiplier || 1) + (data.offset || 0)).toFixed(2);
                }
                tooltipContent += `≈ ${result} ${targetUnit}<br>`;
            }
            tooltipBox.innerHTML = tooltipContent;
            tooltipBox.style.display = 'block';
            const rect = target.getBoundingClientRect();
            tooltipBox.style.left = `${window.scrollX + rect.left}px`;
            tooltipBox.style.top = `${window.scrollY + rect.top - tooltipBox.offsetHeight - 5}px`;
        }
    }

    function hideTooltip() {
        tooltipBox.style.display = 'none';
    }

    document.body.addEventListener('mouseover', showTooltip);
    document.body.addEventListener('mouseout', hideTooltip);

    // --- END UNIT CONVERSION LOGIC ---

    const parseCustomList = (str, delimiter = ',') => {
        if (!str || typeof str !== 'string' || str.length < 2) return [];
        return str.substring(1, str.length - 1).split(delimiter).map(item => item.trim());
    };

    function fetchRecipes() {
        const search = searchInput.value;
        let url = `api.php?`;
        if (search) url += `search=${search}`;
        fetch(url).then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP error! status: ${r.status}`)))
            .then(data => {
                if (data.error) { console.error('API Error:', data.error); return; }
                resultsSection.innerHTML = '';
                if (data && data.length > 0) {
                    data.forEach(recipe => {
                        const card = document.createElement('div');
                        card.className = 'col-12 col-md-6 col-lg-4 col-xl-3 mb-4';
                        card.innerHTML = `<div class="card recipe-card" style="background-color: ${stringToColor(recipe.site)};"><div class="card-body"><h5 class="card-title">${recipe.title}</h5><p class="card-text">${parseCustomList(recipe.ingredients).slice(0, 3).join(', ')}...</p></div></div>`;
                        card.addEventListener('click', () => fetchRecipeDetails(recipe.id));
                        resultsSection.appendChild(card);
                    });
                } else {
                    resultsSection.innerHTML = '<p class="col-12 text-center">No recipes found.</p>';
                }
            }).catch(e => console.error('Fetch Error:', e));
    }

    function fetchRecipeDetails(id) {
        fetch(`api.php?id=${id}`).then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP error! status: ${r.status}`)))
            .then(data => {
                if (data.error) { console.error('API Error:', data.error); return; }
                searchSection.style.display = 'none';
                resultsSection.style.display = 'none';
                recipeDetailsSection.style.display = 'block';

                const ingredients = parseCustomList(data.ingredients, ',');
                const shoppingList = parseCustomList(data.ner, ',');
                const directions = parseCustomList(data.directions, '.,');

                const directionsHtml = directions.map((step, i) => step ? `<div class="single-preparation-step"><h4>${String(i + 1).padStart(2, '0')}.</h4><p>${step}</p></div>` : '').join('');
                const ingredientsHtml = ingredients.map(item => item ? `<li>${item}</li>` : '').join('');
                const shoppingListHtml = shoppingList.map((item, i) => item ? `<div class="custom-control custom-checkbox"><input type="checkbox" class="custom-control-input" id="customCheck${i}"><label class="custom-control-label" for="customCheck${i}">${item}</label></div>` : '').join('');

                recipeDetailsSection.innerHTML = `<div class="container"><div class="d-flex justify-content-between mb-4 action-buttons"><button class="btn btn-primary back-button">← Back</button><button class="btn btn-info print-recipe-btn">Print</button></div><div class="row"><div class="col-12"><div class="receipe-headline my-5"><h2>${data.title}</h2></div></div></div><div class="row recipe-body"><div class="col-12 col-lg-8">${directionsHtml}</div><div class="col-12 col-lg-4"><div class="ingredients mb-4"><h4>Ingredients</h4><ul>${ingredientsHtml}</ul></div><div class="ingredients"><h4>Shopping List</h4>${shoppingListHtml}<button class="btn btn-secondary btn-sm mt-3" id="print-list-btn">Print Selected</button></div></div></div></div>`;

                recipeDetailsSection.querySelector('.back-button').addEventListener('click', showSearchView);
                recipeDetailsSection.querySelector('.print-recipe-btn').addEventListener('click', () => window.print());
                recipeDetailsSection.querySelector('#print-list-btn').addEventListener('click', () => printShoppingList(data.title));

                applyTooltips(recipeDetailsSection);
            }).catch(e => console.error('Fetch Details Error:', e));
    }

    function printShoppingList(title) {
        const items = Array.from(recipeDetailsSection.querySelectorAll('.custom-control-input:checked')).map(cb => cb.nextElementSibling.textContent);
        if (items.length === 0) { alert('Select items to print.'); return; }
        const win = window.open('', '', 'height=600,width=800');
        win.document.write(`<html><head><title>Shopping List</title><style>body{font-family:sans-serif;} ul{list-style:none; padding:0;} li{margin-bottom:10px;}</style></head><body><h2>Shopping List for: ${title}</h2><ul>${items.map(item => `<li>☐ ${item}</li>`).join('')}</ul></body></html>`);
        win.document.close(); win.print();
    }

    function showSearchView() {
        searchSection.style.display = 'block';
        resultsSection.style.display = 'flex';
        recipeDetailsSection.style.display = 'none';
        recipeDetailsSection.innerHTML = '';
    }

    const stringToColor = (str) => {
        let hash = 0; str.split('').forEach(char => hash = char.charCodeAt(0) + ((hash << 5) - hash));
        let color = '#'; for (let i = 0; i < 3; i++) color += ('00' + Math.min(255, (hash >> (i * 8)) & 0xFF + 128).toString(16)).slice(-2);
        return color;
    };

    const observer = new MutationObserver((mutations) => {
        for(let mutation of mutations) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if(node.nodeType === 1) applyTooltips(node);
                });
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    searchInput.addEventListener('input', () => { clearTimeout(searchTimeout); searchTimeout = setTimeout(fetchRecipes, 300); });

    // Initial fetch of recipes
    fetchRecipes();
});
