import { useState, useEffect, useCallback } from 'react'
import { fetchFridgeItems } from '../fridgeApi'
import { ingredientMatches } from '../ingredientMatch'
import type { FridgeItem } from './MyFridge'
import './Recommended.css'

interface MealSummary {
  idMeal: string
  strMeal: string
  strMealThumb: string
}

interface MealDetail {
  idMeal: string
  strMeal: string
  strMealThumb: string
  strCategory: string
  strArea: string
  strInstructions: string
  [key: string]: string | null
}

interface RecommendedRecipe {
  id: string
  name: string
  thumbnail: string
  category: string
  area: string
  sourceUrl: string
  matchPercent: number
  matchedIngredients: string[]
  totalIngredients: number
}

// Categories whose items are useful as search terms
const SEARCH_CATEGORIES = new Set(['produce', 'dairy', 'meat', 'grains', 'frozen'])

function extractIngredients(meal: MealDetail): string[] {
  const ingredients: string[] = []
  for (let i = 1; i <= 20; i++) {
    const name = meal[`strIngredient${i}`]
    if (name && name.trim()) ingredients.push(name.trim())
  }
  return ingredients
}

// Group recipe ingredients that refer to the same core item
// e.g. "butter", "unsalted butter", "melted butter" → one unique ingredient
function deduplicateIngredients(ingredients: string[]): string[][] {
  const groups: string[][] = []
  for (const ing of ingredients) {
    const existingGroup = groups.find(group =>
      group.some(existing => ingredientMatches(existing, ing))
    )
    if (existingGroup) {
      existingGroup.push(ing)
    } else {
      groups.push([ing])
    }
  }
  return groups
}

interface RecommendedProps {
  onRecipeClick: (name: string, sourceUrl: string) => void
}

function Recommended({ onRecipeClick }: RecommendedProps) {
  const [recipes, setRecipes] = useState<RecommendedRecipe[]>([])
  const [loading, setLoading] = useState(true)
  const [fridgeCount, setFridgeCount] = useState(0)

  const findRecommendations = useCallback(async () => {
    setLoading(true)

    const fridgeItems: FridgeItem[] = await fetchFridgeItems()

    setFridgeCount(fridgeItems.length)

    if (fridgeItems.length === 0) {
      setRecipes([])
      setLoading(false)
      return
    }

    // Pick the best ingredients for search queries
    const searchItems = fridgeItems
      .filter(i => SEARCH_CATEGORIES.has(i.category))
      .map(i => i.name)

    // Also include pantry/other items if we have too few search items
    const allNames = fridgeItems.map(i => i.name)
    const queryIngredients = searchItems.length >= 3
      ? searchItems.slice(0, 8)
      : allNames.slice(0, 8)

    if (queryIngredients.length === 0) {
      setRecipes([])
      setLoading(false)
      return
    }

    // Search TheMealDB for each ingredient, collect candidate meals
    const mealCandidates = new Map<string, { meal: MealSummary; hits: number }>()

    const searches = queryIngredients.map(async (ingredient) => {
      try {
        const res = await fetch(
          `https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(ingredient)}`
        )
        const data = await res.json()
        const meals: MealSummary[] = data.meals || []
        for (const m of meals) {
          const existing = mealCandidates.get(m.idMeal)
          if (existing) {
            existing.hits++
          } else {
            mealCandidates.set(m.idMeal, { meal: m, hits: 1 })
          }
        }
      } catch { /* skip failed searches */ }
    })

    await Promise.all(searches)

    // Sort candidates by hit count (most fridge ingredients matched)
    const sortedCandidates = [...mealCandidates.values()]
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 20) // Check top 20 candidates

    if (sortedCandidates.length === 0) {
      setRecipes([])
      setLoading(false)
      return
    }

    // Fetch full details for top candidates to compute exact match %
    const detailResults = await Promise.all(
      sortedCandidates.map(async ({ meal }) => {
        try {
          const res = await fetch(
            `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${meal.idMeal}`
          )
          const data = await res.json()
          return data.meals?.[0] as MealDetail | undefined
        } catch {
          return undefined
        }
      })
    )

    // Calculate match percentage for each recipe
    const recommended: RecommendedRecipe[] = []

    for (const detail of detailResults) {
      if (!detail) continue
      const recipeIngredients = extractIngredients(detail)
      if (recipeIngredients.length === 0) continue

      // Deduplicate variants of the same ingredient (e.g. butter / unsalted butter / melted butter)
      const uniqueGroups = deduplicateIngredients(recipeIngredients)

      const matched: string[] = []
      for (const group of uniqueGroups) {
        // A group is matched if any variant matches a fridge item
        if (group.some(ri => allNames.some(fn => ingredientMatches(fn, ri)))) {
          matched.push(group[0])
        }
      }

      const matchPercent = Math.round((matched.length / uniqueGroups.length) * 100)
      if (matched.length >= 2) {
        recommended.push({
          id: detail.idMeal,
          name: detail.strMeal,
          thumbnail: detail.strMealThumb,
          category: detail.strCategory || '',
          area: detail.strArea || '',
          sourceUrl: detail.strSource || '',
          matchPercent,
          matchedIngredients: matched,
          totalIngredients: uniqueGroups.length,
        })
      }
    }

    recommended.sort((a, b) => b.matchPercent - a.matchPercent)
    setRecipes(recommended)
    setLoading(false)
  }, [])

  useEffect(() => {
    findRecommendations()
  }, [findRecommendations])

  // Listen for storage events (fridge updated in another tab or same-tab writes)
  useEffect(() => {
    const handler = () => findRecommendations()
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [findRecommendations])

  if (loading) {
    return (
      <section className="recommended">
        <h2 className="recommended-title">🍽️ Recommended for You</h2>
        <div className="recommended-loading">
          <div className="loading-spinner" />
          <span>Finding recipes from your fridge…</span>
        </div>
      </section>
    )
  }

  if (fridgeCount === 0) {
    return (
      <section className="recommended">
        <h2 className="recommended-title">🍽️ Recommended for You</h2>
        <p className="recommended-empty">
          Add ingredients to <strong>My Fridge</strong> to get personalized recipe recommendations!
        </p>
      </section>
    )
  }

  if (recipes.length === 0) {
    return (
      <section className="recommended">
        <h2 className="recommended-title">🍽️ Recommended for You</h2>
        <p className="recommended-empty">
          No recipes found matching your fridge ingredients. Try adding more items!
        </p>
      </section>
    )
  }

  return (
    <section className="recommended">
      <div className="recommended-header">
        <h2 className="recommended-title">🍽️ Recommended for You</h2>
        <span className="recommended-subtitle">
          Based on {fridgeCount} ingredient{fridgeCount !== 1 ? 's' : ''} in your fridge
        </span>
      </div>

      <div className="recommended-scroll">
        {recipes.map(recipe => (
          <button
            key={recipe.id}
            className="recommended-card"
            onClick={() => onRecipeClick(recipe.name, recipe.sourceUrl)}
          >
            <div className="recommended-card-img-wrap">
              <img src={recipe.thumbnail} alt={recipe.name} className="recommended-card-img" />
              <span className="recommended-match-badge">
                {recipe.matchPercent}% match
              </span>
            </div>
            <div className="recommended-card-info">
              <h3 className="recommended-card-title">{recipe.name}</h3>
              <div className="recommended-card-meta">
                {recipe.category && <span className="recommended-tag">{recipe.category}</span>}
                {recipe.area && <span className="recommended-tag">{recipe.area}</span>}
              </div>
              <p className="recommended-card-match">
                {recipe.matchedIngredients.length} of {recipe.totalIngredients} ingredients in your fridge
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}

export default Recommended
