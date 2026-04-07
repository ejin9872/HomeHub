import { useState, useCallback, useEffect } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { fetchFridgeItems } from '../fridgeApi'
import type { FridgeItem } from './MyFridge'
import './Discover.css'

interface MealSummary {
  idMeal: string
  strMeal: string
  strMealThumb: string
}

export interface Recipe {
  id: string
  name: string
  thumbnail: string
  category: string
  area: string
  instructions: string
  ingredients: { name: string; measure: string }[]
  source: string
}

interface ShoppingListItem {
  ingredient: string
  measure: string
}

function parseRecipeFromApi(meal: Record<string, string>): Recipe {
  const ingredients: { name: string; measure: string }[] = []
  for (let i = 1; i <= 20; i++) {
    const name = meal[`strIngredient${i}`]?.trim()
    const measure = meal[`strMeasure${i}`]?.trim()
    if (name) ingredients.push({ name, measure: measure || '' })
  }
  return {
    id: meal.idMeal,
    name: meal.strMeal,
    thumbnail: meal.strMealThumb,
    category: meal.strCategory || '',
    area: meal.strArea || '',
    instructions: meal.strInstructions || '',
    ingredients,
    source: meal.strSource || '',
  }
}

function Discover({ initialSearch }: {
  initialSearch?: { term: string; type: 'ingredient' | 'category' | 'name'; label: string } | null
}) {
  const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>([])
  const [savedRecipes, setSavedRecipes] = useLocalStorage<Recipe[]>('homehub-saved-recipes', [])

  useEffect(() => {
    fetchFridgeItems().then(setFridgeItems)
  }, [])
  const [shoppingList, setShoppingList] = useLocalStorage<ShoppingListItem[]>('homehub-shopping-list', [])
  const [searchTerm, setSearchTerm] = useState('')
  const [meals, setMeals] = useState<MealSummary[]>([])
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [searchLabel, setSearchLabel] = useState('')

  const fridgeNames = fridgeItems.map(i => i.name.toLowerCase())

  const searchByIngredient = useCallback(async (ingredient: string) => {
    setIsSearching(true)
    setError(null)
    setSelectedRecipe(null)
    setHasSearched(true)
    try {
      const res = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(ingredient)}`)
      const data = await res.json()
      setMeals(data.meals || [])
      if (!data.meals) setError('No recipes found for that ingredient.')
    } catch {
      setError('Failed to search recipes. Check your internet connection.')
      setMeals([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  const searchByCategory = useCallback(async (category: string) => {
    setIsSearching(true)
    setError(null)
    setSelectedRecipe(null)
    setHasSearched(true)
    try {
      const res = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?c=${encodeURIComponent(category)}`)
      const data = await res.json()
      setMeals(data.meals || [])
      if (!data.meals) setError('No recipes found.')
    } catch {
      setError('Failed to search recipes. Check your internet connection.')
      setMeals([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  const searchByName = useCallback(async (name: string) => {
    setIsSearching(true)
    setError(null)
    setSelectedRecipe(null)
    setHasSearched(true)
    try {
      const res = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(name)}`)
      const data = await res.json()
      const summaries: MealSummary[] = (data.meals || []).map((m: Record<string, string>) => ({
        idMeal: m.idMeal,
        strMeal: m.strMeal,
        strMealThumb: m.strMealThumb,
      }))
      setMeals(summaries)
      if (!data.meals) setError('No recipes found for that search.')
    } catch {
      setError('Failed to search recipes. Check your internet connection.')
      setMeals([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  useEffect(() => {
    if (!initialSearch) return
    setSearchLabel(initialSearch.label)
    if (initialSearch.type === 'ingredient') searchByIngredient(initialSearch.term)
    else if (initialSearch.type === 'category') searchByCategory(initialSearch.term)
    else searchByName(initialSearch.term)
  }, [initialSearch, searchByIngredient, searchByCategory, searchByName])

  const loadRecipeDetail= useCallback(async (id: string) => {
    setIsLoadingDetail(true)
    try {
      const res = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`)
      const data = await res.json()
      if (data.meals?.[0]) {
        setSelectedRecipe(parseRecipeFromApi(data.meals[0]))
      }
    } catch {
      setError('Failed to load recipe details.')
    } finally {
      setIsLoadingDetail(false)
    }
  }, [])

  const handleSearch = () => {
    const term = searchTerm.trim()
    if (term) {
      setSearchLabel(`Recipes with "${term}"`)
      searchByIngredient(term)
    }
  }

  const searchFromFridge = (ingredientName: string) => {
    setSearchTerm(ingredientName)
    setSearchLabel(`Recipes with "${ingredientName}"`)
    searchByIngredient(ingredientName)
  }

  const isSaved = (id: string) => savedRecipes.some(r => r.id === id)

  const saveRecipe = (recipe: Recipe) => {
    if (!isSaved(recipe.id)) {
      setSavedRecipes(prev => [...prev, recipe])
    }
  }

  const unsaveRecipe = (id: string) => {
    setSavedRecipes(prev => prev.filter(r => r.id !== id))
  }

  const isInFridge = (ingredient: string) =>
    fridgeNames.includes(ingredient.toLowerCase())

  const getMissingIngredients = (recipe: Recipe) =>
    recipe.ingredients.filter(ing => !isInFridge(ing.name))

  const addToShoppingList = (recipe: Recipe) => {
    const missing = getMissingIngredients(recipe)
    setShoppingList(prev => {
      const existing = new Set(prev.map(i => i.ingredient.toLowerCase()))
      const newItems = missing.filter(m => !existing.has(m.name.toLowerCase()))
      return [...prev, ...newItems.map(m => ({ ingredient: m.name, measure: m.measure }))]
    })
  }

  return (
    <div className="discover">
      {/* Search bar */}
      <div className="discover-search">
        <div className="discover-search-bar">
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Search by ingredient (e.g. chicken)"
            className="discover-search-input"
          />
          <button className="discover-search-btn" onClick={handleSearch} disabled={isSearching}>
            {isSearching ? '…' : '🔍'}
          </button>
        </div>
        {fridgeItems.length > 0 && (
          <div className="discover-fridge-chips">
            <span className="discover-chips-label">From your fridge:</span>
            {fridgeItems.slice(0, 10).map(item => (
              <button
                key={item.id}
                className="discover-chip"
                onClick={() => searchFromFridge(item.name)}
              >
                {item.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <div className="discover-error">{error}</div>}

      {searchLabel && !selectedRecipe && (
        <h2 className="discover-title">{searchLabel}</h2>
      )}

      {/* Recipe detail modal */}
      {selectedRecipe && (
        <div className="discover-detail">
          <button className="discover-back" onClick={() => setSelectedRecipe(null)}>← Back to results</button>
          <div className="discover-detail-card">
            <img src={selectedRecipe.thumbnail} alt={selectedRecipe.name} className="discover-detail-img" />
            <div className="discover-detail-info">
              <h2>{selectedRecipe.name}</h2>
              <div className="discover-detail-tags">
                {selectedRecipe.category && <span className="discover-tag">{selectedRecipe.category}</span>}
                {selectedRecipe.area && <span className="discover-tag">{selectedRecipe.area}</span>}
              </div>

              <div className="discover-detail-actions">
                <button
                  className={`discover-save-btn ${isSaved(selectedRecipe.id) ? 'saved' : ''}`}
                  onClick={() => isSaved(selectedRecipe.id) ? unsaveRecipe(selectedRecipe.id) : saveRecipe(selectedRecipe)}
                >
                  {isSaved(selectedRecipe.id) ? '❤️ Saved' : '🤍 Save Recipe'}
                </button>
                <button className="discover-shop-btn" onClick={() => addToShoppingList(selectedRecipe)}>
                  🛒 Add Missing to Shopping List
                </button>
              </div>

              <h3>Ingredients</h3>
              <ul className="discover-ingredients">
                {selectedRecipe.ingredients.map((ing, i) => (
                  <li key={i} className={isInFridge(ing.name) ? 'in-fridge' : 'missing'}>
                    <span className="discover-ing-status">{isInFridge(ing.name) ? '✅' : '❌'}</span>
                    <span className="discover-ing-name">{ing.name}</span>
                    {ing.measure && <span className="discover-ing-measure">{ing.measure}</span>}
                  </li>
                ))}
              </ul>

              <h3>Instructions</h3>
              <div className="discover-instructions">
                {selectedRecipe.instructions.split('\n').filter(Boolean).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>

              {selectedRecipe.source && (
                <a href={selectedRecipe.source} target="_blank" rel="noopener noreferrer" className="discover-source">
                  View original source ↗
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Search results grid */}
      {!selectedRecipe && (
        <>
          {isSearching && <div className="discover-loading">Searching recipes…</div>}
          {!isSearching && hasSearched && meals.length > 0 && (
            <div className="discover-grid">
              {meals.map(meal => (
                <button
                  key={meal.idMeal}
                  className="discover-card"
                  onClick={() => loadRecipeDetail(meal.idMeal)}
                  disabled={isLoadingDetail}
                >
                  <img src={meal.strMealThumb} alt={meal.strMeal} className="discover-card-img" />
                  <span className="discover-card-name">{meal.strMeal}</span>
                  {isSaved(meal.idMeal) && <span className="discover-card-saved">❤️</span>}
                </button>
              ))}
            </div>
          )}
          {!isSearching && !hasSearched && (
            <div className="discover-empty">
              Search for an ingredient above to discover recipes! 🍳
            </div>
          )}
        </>
      )}

      {/* Shopping list section */}
      {shoppingList.length > 0 && !selectedRecipe && (
        <div className="discover-shopping">
          <div className="discover-shopping-header">
            <h3>🛒 Shopping List</h3>
            <button className="discover-shopping-clear" onClick={() => setShoppingList([])}>Clear</button>
          </div>
          {shoppingList.map((item, i) => (
            <div key={i} className="discover-shopping-item">
              <span>{item.ingredient}</span>
              {item.measure && <span className="discover-shopping-measure">{item.measure}</span>}
              <button
                className="discover-shopping-remove"
                onClick={() => setShoppingList(prev => prev.filter((_, idx) => idx !== i))}
              >✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Discover
