import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [recipes, setRecipes] = useState([]);
  const [search, setSearch] = useState('');
  const [site, setSite] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  const fetchRecipes = React.useCallback(() => {
    let url = `http://localhost:3001/api/recipes?`;
    if (search) {
      url += `search=${search}`;
    }
    if (site) {
      url += `&site=${site}`;
    }

    fetch(url)
      .then(response => response.json())
      .then(data => {
        if (Array.isArray(data)) {
          setRecipes(data);
        } else {
          setRecipes([]);
        }
      })
      .catch(error => {
        console.error('Error fetching recipes:', error);
        setRecipes([]);
      });
  }, [search, site]);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  const fetchRecipeDetails = (id) => {
    fetch(`http://localhost:3001/api/recipes/${id}`)
      .then(response => response.json())
      .then(data => setSelectedRecipe(data))
      .catch(error => console.error('Error fetching recipe details:', error));
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Recipe Search</h1>
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search by title, ingredient, or shopping list item"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <input
            type="text"
            placeholder="Filter by site"
            value={site}
            onChange={e => setSite(e.target.value)}
          />
        </div>
      </header>
      <div className="container">
        <div className="recipe-list">
          {recipes.map(recipe => (
            <div key={recipe.id} className="recipe-item" onClick={() => fetchRecipeDetails(recipe.id)}>
              <h3>{recipe.title}</h3>
              <p>{recipe.site}</p>
            </div>
          ))}
        </div>
        {selectedRecipe && (
          <div className="recipe-details">
            <h2>{selectedRecipe.title}</h2>
            <h3>Ingredients</h3>
            <ul>
              {JSON.parse(selectedRecipe.ingredients).map((ingredient, index) => (
                <li key={index}>{ingredient}</li>
              ))}
            </ul>
            <h3>Directions</h3>
            <ol>
              {JSON.parse(selectedRecipe.directions).map((direction, index) => (
                <li key={index}>{direction}</li>
              ))}
            </ol>
            <h3>Shopping List</h3>
            <ul>
              {JSON.parse(selectedRecipe.ner).map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
            <a href={`http://${selectedRecipe.site}`} target="_blank" rel="noopener noreferrer">
              Original Recipe
            </a>
            <button onClick={() => setSelectedRecipe(null)}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
