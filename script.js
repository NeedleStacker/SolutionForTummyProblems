document.addEventListener('DOMContentLoaded', () => {
    // --- Existing DOM elements ---
    const searchInput = document.getElementById('search-input');
    const searchSection = document.getElementById('search-section');
    const resultsSection = document.getElementById('results-section');
    const recipeDetailsSection = document.getElementById('recipe-details-section');
    const tooltipBox = document.getElementById('unit-tooltip-box');

    let searchTimeout;

    // --- UNIT CONVERSION TOOLTIP LOGIC ---
    const conversions = {
        // Length
        mm: v => ({ in: (v * 0.0393701).toFixed(2) + ' in', cm: (v * 0.1).toFixed(2) + ' cm' }),
        cm: v => ({ in: (v * 0.393701).toFixed(2) + ' in', ft: (v * 0.0328084).toFixed(2) + ' ft' }),
        m: v => ({ ft: (v * 3.28084).toFixed(2) + ' ft', yd: (v * 1.09361).toFixed(2) + ' yd' }),
        km: v => ({ mi: (v * 0.621371).toFixed(2) + ' mi' }),
        in: v => ({ cm: (v * 2.54).toFixed(2) + ' cm' }),
        ft: v => ({ m: (v * 0.3048).toFixed(2) + ' m' }),
        yd: v => ({ m: (v * 0.9144).toFixed(2) + ' m' }),
        // Mass
        mg: v => ({ g: (v / 1000).toFixed(4) + ' g' }),
        g: v => ({ oz: (v * 0.035274).toFixed(2) + ' oz' }),
        kg: v => ({ lb: (v * 2.20462).toFixed(2) + ' lb', oz: (v * 35.274).toFixed(2) + ' oz' }),
        oz: v => ({ g: (v * 28.3495).toFixed(2) + ' g' }),
        lb: v => ({ kg: (v * 0.453592).toFixed(2) + ' kg' }),
        // Temperature
        '°C': v => ({ '°F': (v * 9/5 + 32).toFixed(1) + '°F', K: (parseFloat(v) + 273.15).toFixed(2) + ' K' }),
        '°F': v => ({ '°C': ((v - 32) * 5/9).toFixed(1) + '°C', K: ((v - 32) * 5/9 + 273.15).toFixed(2) + ' K' }),
        K: v => ({ '°C': (v - 273.15).toFixed(2) + '°C', '°F': ((v - 273.15) * 9/5 + 32).toFixed(1) + '°F' }),
        // Volume
        ml: v => ({ L: (v / 1000).toFixed(3) + ' L', fl_oz: (v * 0.033814).toFixed(2) + ' fl oz' }),
        mL: v => ({ L: (v / 1000).toFixed(3) + ' L', fl_oz: (v * 0.033814).toFixed(2) + ' fl oz' }),
        l: v => ({ gal: (v * 0.264172).toFixed(2) + ' gal', ml: (v * 1000) + ' mL' }),
        L: v => ({ gal: (v * 0.264172).toFixed(2) + ' gal', ml: (v * 1000) + ' mL' })
    };

    const unitRegex = /\b(\d+(?:[.,]\d+)?)(\s?)(cm|mm|m|km|in|ft|yd|kg|g|mg|lb|oz|°C|°F|K|ml|mL|l|L)\b/gi;

    function applyTooltips(container) {
        const walker = document.createTreeWalker(
            container,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode(node) {
                    const parent = node.parentElement;
                    if (!parent || parent.closest('.unit-tooltip')) return NodeFilter.FILTER_REJECT;
                    if (["SCRIPT","STYLE","CODE","PRE","A","BUTTON"].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
                    if (parent.closest("a, button")) return NodeFilter.FILTER_REJECT;
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        let node;
        while (node = walker.nextNode()) {
            const text = node.nodeValue;
            if (unitRegex.test(text)) {
                const wrapper = document.createElement('span');
                wrapper.innerHTML = text.replace(unitRegex, (match, value, _, unit) => {
                    const cleanValue = value.replace(",", ".");
                    return `<span class="unit-tooltip" data-value="${cleanValue}" data-unit="${unit}">${match}</span>`;
                });
                node.parentNode.replaceChild(wrapper, node);
            }
        }
    }

    function showTooltip(e) {
        const target = e.target;
        if (!target.classList.contains('unit-tooltip')) return;

        const value = parseFloat(target.dataset.value);
        const unit = target.dataset.unit;

        if (conversions[unit]) {
            const converted = conversions[unit](value);
            const tooltipContent = Object.entries(converted).map(([unit, val]) => `≈ ${val}`).join('<br>');
            tooltipBox.innerHTML = tooltipContent;
            tooltipBox.style.display = 'block';

            // Position tooltip
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

                // --- Apply tooltips to the new content ---
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
    fetchRecipes();
});
