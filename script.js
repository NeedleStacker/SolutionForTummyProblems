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
    const loader = document.getElementById('loader');

    let conversions = {}; // Will be populated by fetching conversions.json
    let lastRecipeId = 0;
    let currentSearchParams = {};

    // --- Loader Functions ---
    const showLoader = () => {
        if(loader) loader.style.display = 'flex';
    };

    const hideLoader = () => {
        if(loader) loader.style.display = 'none';
    };

    // --- Fetch Conversion Data ---
    try {
        const response = await fetch('conversions.json');
        if (!response.ok) throw new Error('Failed to load conversion data.');
        conversions = await response.json();
    } catch (error) {
        console.error(error);
    }

    // --- UNIT CONVERSION TOOLTIP LOGIC ---

    function parseNumberString(numStr) {
        numStr = numStr.trim().replace(",", ".");
        if (numStr.includes(' ')) { // Handle mixed numbers like "1 1/2"
            const parts = numStr.split(' ');
            const integer = parseInt(parts[0], 10);
            const fraction = parts[1];
            if (fraction.includes('/')) {
                const fracParts = fraction.split('/');
                return integer + (parseInt(fracParts[0], 10) / parseInt(fracParts[1], 10));
            }
        } else if (numStr.includes('/')) { // Handle simple fractions like "3/4"
            const parts = numStr.split('/');
            return parseInt(parts[0], 10) / parseInt(parts[1], 10);
        }
        return parseFloat(numStr); // Handle decimals and integers
    }

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
        const units = 'pounds|pound|ounce|ounces|inch|degrees F|degrees C|grm|ml|lbs|lb|cm|mm|m|km|in|ft|yd|kg|g|mg|oz|°C|°F|K|mL|l|L';
        const numberPattern = '(?:\\d+\\s+)?\\d+(?:(?:[.,/])\\d+)?'; // Handles "1 1/2", "3/4", "1.5", "1"
        const fullUnitRegex = new RegExp(`(${numberPattern})(\\s*|-|)(${units})(?![a-zA-Z])`, 'gi');
        const numberRegex = new RegExp(`(${numberPattern})\\s*$`);
        const unitOnlyRegex = new RegExp(`^\\s*(\\b(?:${units})\\b)(?![a-zA-Z])`, 'i');

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
            span.dataset.value = rep.value;
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

        const value = parseNumberString(target.dataset.value);
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

    function performSearch(params, isLoadMore = false) {
        showLoader();
        if (isLoadMore) {
            params.after_id = lastRecipeId;
        } else {
            resultsSection.innerHTML = ''; // Clear previous results only on a new search
            lastRecipeId = 0;
            currentSearchParams = params;
        }

        const queryString = new URLSearchParams(params).toString();
        const url = `api.php?${queryString}`;

        fetch(url)
            .then(response => {
                if (!response.ok) {
                    return Promise.reject(new Error(`HTTP error! status: ${response.status}`));
                }
                return response.json();
            })
            .then(data => {
                if (data.error) {
                    console.error('API Error:', data.error);
                    resultsSection.innerHTML = '<p class="col-12 text-center">An error occurred.</p>';
                    return;
                }

                // Remove existing "Load More" button before adding new cards
                const existingLoadMoreButton = document.getElementById('load-more-btn');
                if (existingLoadMoreButton) {
                    existingLoadMoreButton.remove();
                }

                if (data && data.length > 0) {
                    data.forEach(recipe => {
                        const card = document.createElement('div');
                        card.className = 'col-12 col-md-6 col-lg-4 col-xl-3 mb-4';
                        card.innerHTML = `<div class="card recipe-card" style="background-color: ${stringToColor(recipe.site)};"><div class="card-body"><h5 class="card-title">${recipe.title}</h5><p class="card-text">${parseCustomList(recipe.ingredients).slice(0, 3).join(', ')}...</p></div></div>`;
                        card.addEventListener('click', () => fetchRecipeDetails(recipe.id));
                        resultsSection.appendChild(card);
                    });

                    lastRecipeId = data[data.length - 1].id;

                    // Add "Load More" button if 50 results were returned
                    if (data.length === 50) {
                        const loadMoreButton = document.createElement('div');
                        loadMoreButton.className = 'col-12 text-center mt-4 mb-5';
                        loadMoreButton.innerHTML = `<button id="load-more-btn" class="btn btn-lg btn-primary">Load More Results</button>`;
                        resultsSection.appendChild(loadMoreButton);
                        document.getElementById('load-more-btn').addEventListener('click', () => {
                            performSearch(currentSearchParams, true);
                        });
                    }

                } else if (!isLoadMore) {
                    resultsSection.innerHTML = '<p class="col-12 text-center">No recipes found.</p>';
                }
            })
            .catch(e => {
                console.error('Fetch Error:', e);
                resultsSection.innerHTML = '<p class="col-12 text-center">Failed to fetch recipes.</p>';
            })
            .finally(hideLoader);
    }

    function fetchRecipeDetails(id) {
        showLoader();
        fetch(`api.php?id=${id}`).then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP error! status: ${r.status}`)))
            .then(data => {
                if (data.error) { console.error('API Error:', data.error); return; }
                searchSection.style.display = 'none';
                resultsSection.style.display = 'none';
                recipeDetailsSection.style.display = 'block';

                const ingredients = parseCustomList(data.ingredients, ',');
                const shoppingList = parseCustomList(data.ner, ',');
                const directions = parseCustomList(data.directions, '.,');

                const googleImagesUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(data.title)}`;
                const imageHtml = `<a href="${googleImagesUrl}" target="_blank" class="recipe-icon-link"><img src="assets/search.png" alt="Search for recipe images" class="recipe-icon"></a>`;
                const directionsHtml = directions.map((step, i) => step ? `<div class="single-preparation-step"><h4>${String(i + 1).padStart(2, '0')}.</h4><p>${step}</p></div>` : '').join('');
                const ingredientsHtml = ingredients.map(item => item ? `<li>${item}</li>` : '').join('');
                const shoppingListHtml = shoppingList.map((item, i) => item ? `<div class="custom-control custom-checkbox"><input type="checkbox" class="custom-control-input" id="customCheck${i}"><label class="custom-control-label" for="customCheck${i}">${item}</label></div>` : '').join('');

                recipeDetailsSection.innerHTML = `<div class="container"><div id="back-to-search-container"><div class="d-flex justify-content-between align-items-center action-buttons"><button class="btn btn-primary back-button">← Back to Search</button><div class="form-check text-white"><input class="form-check-input" type="checkbox" id="recipeNameToSearch"><label class="form-check-label" for="recipeNameToSearch">Recipe name to search box</label></div><button class="btn btn-info print-recipe-btn">Print</button></div></div><div class="row"><div class="col-12"><div class="recipe-main-content"><div id="google_translate_element"></div><button class="btn btn-success share-button"><img src="assets/share.png" alt="Share" style="width: 24px; height: 24px; margin-right: 8px;">Share</button><div class="receipe-headline">${imageHtml}<h2>${data.title}</h2></div><div class="row recipe-body"><div class="col-12 col-lg-8">${directionsHtml}</div><div class="col-12 col-lg-4"><div class="ingredients mb-4"><h4>Ingredients</h4><ul>${ingredientsHtml}</ul></div><div class="ingredients"><h4>Shopping List</h4>${shoppingListHtml}<button class="btn btn-secondary btn-sm mt-3 mr-2" id="select-all-btn">Select All</button><button class="btn btn-secondary btn-sm mt-3" id="print-list-btn">Print Selected</button></div></div></div></div></div></div></div>`;

                recipeDetailsSection.querySelector('.back-button').addEventListener('click', () => {
                    const recipeNameToSearch = document.getElementById('recipeNameToSearch');
                    if (recipeNameToSearch.checked) {
                        showSearchView(data.title);
                    } else {
                        showSearchView();
                    }
                });
                recipeDetailsSection.querySelector('.print-recipe-btn').addEventListener('click', () => window.print());
                recipeDetailsSection.querySelector('#print-list-btn').addEventListener('click', () => printShoppingList(data.title));

                const shareButton = recipeDetailsSection.querySelector('.share-button');
                shareButton.addEventListener('click', () => {
                    const shareUrl = `${window.location.origin}${window.location.pathname}?number=${id}&name=${encodeURIComponent(data.title)}`;
                    navigator.clipboard.writeText(shareUrl).then(() => {
                        shareButton.innerHTML = '<img src="assets/share.png" alt="Share" style="width: 24px; height: 24px; margin-right: 8px;">Link Copied!';
                        setTimeout(() => {
                            shareButton.innerHTML = '<img src="assets/share.png" alt="Share" style="width: 24px; height: 24px; margin-right: 8px;">Share';
                        }, 2000);
                    }).catch(err => {
                        console.error('Failed to copy text: ', err);
                    });
                });

                recipeDetailsSection.querySelector('#select-all-btn').addEventListener('click', () => {
                    recipeDetailsSection.querySelectorAll('.custom-control-input').forEach(checkbox => {
                        checkbox.checked = true;
                    });
                });

                applyTooltips(recipeDetailsSection);
            }).catch(e => console.error('Fetch Details Error:', e))
            .finally(hideLoader);
    }

    function printShoppingList(title) {
        const items = Array.from(recipeDetailsSection.querySelectorAll('.custom-control-input:checked')).map(cb => cb.nextElementSibling.textContent);
        if (items.length === 0) { alert('Select items to print.'); return; }
        const win = window.open('', '', 'height=600,width=800');
        win.document.write(`<html><head><title>Shopping List</title><style>body{font-family:sans-serif;} ul{list-style:none; padding:0;} li{margin-bottom:10px;}</style></head><body><h2>Shopping List for: ${title}</h2><ul>${items.map(item => `<li>☐ ${item}</li>`).join('')}</ul></body></html>`);
        win.document.close(); win.print();
    }

    function showSearchView(recipeTitle = '') {
        searchSection.style.display = 'block';
        resultsSection.style.display = 'flex';
        recipeDetailsSection.style.display = 'none';
        recipeDetailsSection.innerHTML = '';
        if (recipeTitle) {
            searchInputTitle.value = recipeTitle;
        }
    }

    const stringToColor = (str) => {
        if (!str) return 'rgba(200, 200, 200, 0.85)';
        let hash = 0;
        str.split('').forEach(char => {
            hash = char.charCodeAt(0) + ((hash << 5) - hash);
        });
        const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
        const color = "00000".substring(0, 6 - c.length) + c;
        let r = parseInt(color.substring(0, 2), 16);
        let g = parseInt(color.substring(2, 4), 16);
        let b = parseInt(color.substring(4, 6), 16);

        r = Math.floor((r + 180)); // Lighter colors
        g = Math.floor((g + 180));
        b = Math.floor((b + 180));

        return `rgba(${r > 255 ? 255 : r}, ${g > 255 ? 255 : g}, ${b > 255 ? 255 : b}, 0.85)`;
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
        performSearch({ title: title });
    });

    searchButtonIngredients.addEventListener('click', () => {
        const ingredients = searchInputIngredients.value.trim();
        performSearch({ ingredients: ingredients });
    });

    searchButtonShopping.addEventListener('click', () => {
        const shopping_list = searchInputShopping.value.trim();
        performSearch({ shopping_list: shopping_list });
    });

    // --- Event Listeners for Clear Buttons and Input ---
    document.querySelectorAll('.input-group').forEach(group => {
        const input = group.querySelector('input');
        const clearBtn = group.querySelector('.clear-btn');

        if (input && clearBtn) {
            input.addEventListener('input', () => {
                clearBtn.style.display = input.value.length > 0 ? 'inline' : 'none';
            });

            clearBtn.addEventListener('click', () => {
                input.value = '';
                clearBtn.style.display = 'none';
                input.focus();
            });
        }
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

    // --- Initial Page Load Logic ---
    const urlParams = new URLSearchParams(window.location.search);
    const recipeId = urlParams.get('number');
    const recipeName = urlParams.get('name');

    if (recipeName) {
        searchInputTitle.value = recipeName;
    }

    if (recipeId) {
        fetchRecipeDetails(recipeId);
    } else {
        // Initial fetch of random recipes if no ID is specified
        performSearch({});
    }
});
