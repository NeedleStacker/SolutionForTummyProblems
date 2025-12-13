document.addEventListener('DOMContentLoaded', async () => {
    // --- Global Variables & DOM Elements ---
    const searchInputTitle = document.getElementById('search-input-title');
    const searchInputIngredients = document.getElementById('search-input-ingredients');
    const searchInputShopping = document.getElementById('search-input-shopping');

    const searchButtonTitle = document.getElementById('search-button-title');
    const searchButtonIngredients = document.getElementById('search-button-ingredients');
    const searchButtonShopping = document.getElementById('search-button-shopping');

    const searchSection = document.getElementById('search-section');
    const resultsSection = document.getElementById('results-section');
    const recipeDetailsSection = document.getElementById('recipe-details-section');
    const tooltipBox = document.getElementById('unit-tooltip-box');

    let conversions = {}; // Will be populated by fetching conversions.json

    // --- Fetch Conversion Data ---
    try {
        const response = await fetch('conversions.json');
        if (!response.ok) throw new Error('Failed to load conversion data.');
        conversions = await response.json();
    } catch (error) {
        console.error(error);
    }

    // --- UNIT CONVERSION TOOLTIP LOGIC ---
    function applyTooltips(container) {
        const nodeFilter = {
            acceptNode(node) {
                const parent = node.parentElement;
                if (!parent || parent.closest('.unit-tooltip, script, style, code, pre, a, button')) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        };

        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, nodeFilter);
        const textNodes = [];
        while (walker.nextNode()) {
            textNodes.push(walker.currentNode);
        }

        const rangesToWrap = [];
        const fullUnitRegex = /(\d+(?:[.,]\d+)?)(\s*)(pounds|pound|ounce|ounces|inch|degrees F|degrees C|grm|ml|lbs|lb|cm|mm|m|km|in|ft|yd|kg|g|mg|oz|°C|°F|K|mL|l|L)(?![a-zA-Z])/gi;
        const numberRegex = /(\d+(?:[.,]\d+)?)\s*$/;
        const unitOnlyRegex = /^\s*(pounds|pound|ounce|ounces|inch|degrees F|degrees C|grm|ml|lbs|lb|cm|mm|m|km|in|ft|yd|kg|g|mg|oz|°C|°F|K|mL|l|L)(?![a-zA-Z])/i;

        // Pass 1: Find all potential matches
        for (let i = 0; i < textNodes.length; i++) {
            const node = textNodes[i];

            let match;
            while ((match = fullUnitRegex.exec(node.nodeValue)) !== null) {
                const range = document.createRange();
                range.setStart(node, match.index);
                range.setEnd(node, match.index + match[0].length);
                rangesToWrap.push({
                    range: range,
                    value: match[1],
                    unit: match[3]
                });
            }

            if (i < textNodes.length - 1) {
                const numNode = textNodes[i];
                const unitNode = textNodes[i + 1];

                const numMatch = numNode.nodeValue.match(numberRegex);
                const unitMatch = unitNode.nodeValue.match(unitOnlyRegex);

                if (numMatch && unitMatch) {
                    const adjacencyRange = document.createRange();
                    adjacencyRange.setStart(numNode, numNode.nodeValue.length);
                    adjacencyRange.setEnd(unitNode, 0);

                    if (adjacencyRange.toString().trim() === '') {
                        const wrapRange = document.createRange();
                        wrapRange.setStart(numNode, numNode.nodeValue.length - numMatch[0].length);
                        wrapRange.setEnd(unitNode, unitMatch[0].length);

                        rangesToWrap.push({
                            range: wrapRange,
                            value: numMatch[1],
                            unit: unitMatch[1]
                        });
                        i++;
                    }
                }
            }
        }

        // Pass 2: Apply the wraps from back to front to avoid conflicts
        rangesToWrap.reverse().forEach(rep => {
            const span = document.createElement('span');
            span.className = 'unit-tooltip';
            span.dataset.value = rep.value.replace(",", ".");
            span.dataset.unit = rep.unit;
            try {
                if (rep.range.startContainer.isConnected && rep.range.endContainer.isConnected) {
                    rep.range.surroundContents(span);
                }
            } catch (e) {
                console.warn("Could not wrap range for unit conversion, likely due to overlap.", e);
            }
        });
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
                if (typeof data === 'number') {
                    result = (value * data).toFixed(2);
                } else if (data.formula) {
                    result = new Function('v', `return ${data.formula}`)(value).toFixed(2);
                } else {
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

    function performSearch(params) {
        const queryString = new URLSearchParams(params).toString();
        const url = `api.php${queryString ? '?' + queryString : ''}`;

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

                recipeDetailsSection.innerHTML = `<div class="container"><div class="d-flex justify-content-between mb-4 action-buttons"><button class="btn btn-primary back-button">← Back</button><button class="btn btn-info print-recipe-btn">Print</button></div><div class="row"><div class="col-12"><div class="recipe-main-content"><div class="receipe-headline my-5"><h2>${data.title}</h2></div><div class="row recipe-body"><div class="col-12 col-lg-8">${directionsHtml}</div><div class="col-12 col-lg-4"><div class="ingredients mb-4"><h4>Ingredients</h4><ul>${ingredientsHtml}</ul></div><div class="ingredients"><h4>Shopping List</h4>${shoppingListHtml}<button class="btn btn-secondary btn-sm mt-3" id="print-list-btn">Print Selected</button></div></div></div></div></div></div></div>`;

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
        let hash = 0;
        str.split('').forEach(char => {
            hash = char.charCodeAt(0) + ((hash << 5) - hash);
        });
        const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
        const color = "00000".substring(0, 6 - c.length) + c;
        let r = parseInt(color.substring(0, 2), 16);
        let g = parseInt(color.substring(2, 4), 16);
        let b = parseInt(color.substring(4, 6), 16);

        r = Math.floor((r + 255) / 2);
        g = Math.floor((g + 255) / 2);
        b = Math.floor((b + 255) / 2);

        return `rgba(${r}, ${g}, ${b}, 0.85)`;
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

    // --- EVENT LISTENERS ---
    searchButtonTitle.addEventListener('click', () => {
        const title = searchInputTitle.value.trim();
        if (title) performSearch({ title: title });
    });

    searchButtonIngredients.addEventListener('click', () => {
        const ingredients = searchInputIngredients.value.trim();
        if (ingredients) performSearch({ ingredients: ingredients });
    });

    searchButtonShopping.addEventListener('click', () => {
        const shopping_list = searchInputShopping.value.trim();
        if (shopping_list) performSearch({ shopping_list: shopping_list });
    });

    searchInputTitle.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchButtonTitle.click();
    });

    searchInputIngredients.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchButtonIngredients.click();
    });

    searchInputShopping.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchButtonShopping.click();
    });

    // Initial fetch of random recipes
    performSearch({});
});
