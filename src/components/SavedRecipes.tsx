import { useState, useEffect } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { fetchFridgeItems } from '../fridgeApi'
import type { Recipe } from './Discover'
import type { FridgeItem } from './MyFridge'
import './SavedRecipes.css'

interface ShoppingListItem {
  ingredient: string
  measure: string
}

function SavedRecipes() {
  const [savedRecipes, setSavedRecipes] = useLocalStorage<Recipe[]>('homehub-saved-recipes', [])
  const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>([])
  const [shoppingList, setShoppingList] = useLocalStorage<ShoppingListItem[]>('homehub-shopping-list', [])
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetchFridgeItems().then(setFridgeItems)
  }, [])

  const fridgeNames = fridgeItems.map(i => i.name.toLowerCase())

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

  const removeRecipe = (id: string) => {
    setSavedRecipes(prev => prev.filter(r => r.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id)
  }

  if (savedRecipes.length === 0) {
    return (
      <div className="saved">
        <div className="saved-empty">
          No saved recipes yet. Discover recipes and save your favorites! ❤️
        </div>
      </div>
    )
  }

  return (
    <div className="saved">
      <div className="saved-count">{savedRecipes.length} saved recipe{savedRecipes.length !== 1 ? 's' : ''}</div>

      {savedRecipes.map(recipe => {
        const missing = getMissingIngredients(recipe)
        const haveCount = recipe.ingredients.length - missing.length
        const isExpanded = expandedId === recipe.id

        return (
          <div key={recipe.id} className="saved-card">
            <button className="saved-card-header" onClick={() => toggleExpand(recipe.id)}>
              <img src={recipe.thumbnail} alt={recipe.name} className="saved-card-img" />
              <div className="saved-card-info">
                <h3>{recipe.name}</h3>
                <div className="saved-card-meta">
                  {recipe.category && <span className="saved-tag">{recipe.category}</span>}
                  {recipe.area && <span className="saved-tag">{recipe.area}</span>}
                </div>
                <div className="saved-card-match">
                  <span className={`saved-match-badge ${haveCount === recipe.ingredients.length ? 'full' : missing.length === 0 ? 'full' : 'partial'}`}>
                    {haveCount}/{recipe.ingredients.length} ingredients
                  </span>
                </div>
              </div>
              <span className="saved-expand-icon">{isExpanded ? '▲' : '▼'}</span>
            </button>

            {isExpanded && (
              <div className="saved-card-detail">
                <div className="saved-card-actions">
                  <button className="saved-shop-btn" onClick={() => addToShoppingList(recipe)}>
                    🛒 Add {missing.length} Missing to Shopping List
                  </button>
                  <button className="saved-remove-btn" onClick={() => removeRecipe(recipe.id)}>
                    Remove
                  </button>
                </div>

                <h4>Ingredients</h4>
                <ul className="saved-ingredients">
                  {recipe.ingredients.map((ing, i) => (
                    <li key={i} className={isInFridge(ing.name) ? 'in-fridge' : 'missing'}>
                      <span className="saved-ing-status">{isInFridge(ing.name) ? '✅' : '❌'}</span>
                      <span className="saved-ing-name">{ing.name}</span>
                      {ing.measure && <span className="saved-ing-measure">{ing.measure}</span>}
                    </li>
                  ))}
                </ul>

                <h4>Instructions</h4>
                <div className="saved-instructions">
                  {recipe.instructions.split('\n').filter(Boolean).map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>

                {recipe.source && (
                  <a href={recipe.source} target="_blank" rel="noopener noreferrer" className="saved-source">
                    View original source ↗
                  </a>
                )}
              </div>
            )}
          </div>
        )
      })}

      {shoppingList.length > 0 && (
        <div className="saved-shopping">
          <div className="saved-shopping-header">
            <h3>🛒 Shopping List</h3>
            <button className="saved-shopping-clear" onClick={() => setShoppingList([])}>Clear</button>
          </div>
          {shoppingList.map((item, i) => (
            <div key={i} className="saved-shopping-item">
              <span>{item.ingredient}</span>
              {item.measure && <span className="saved-shopping-measure">{item.measure}</span>}
              <button
                className="saved-shopping-remove"
                onClick={() => setShoppingList(prev => prev.filter((_, idx) => idx !== i))}
              >✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default SavedRecipes
