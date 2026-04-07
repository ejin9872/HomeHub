import { useState, useEffect, useMemo } from 'react'
import { cacheGet, cacheSet } from '../cache'
import { fetchFridgeItems } from '../fridgeApi'
import { ingredientMatches } from '../ingredientMatch'
import type { FridgeItem } from './MyFridge'
import './RecipePage.css'

interface RecipeData {
  name: string
  image: string
  description: string
  prepTime: string
  cookTime: string
  totalTime: string
  servings: string
  author: string
  source: string
  sourceUrl: string
  rating: { value: number; count: number } | null
  ingredients: string[]
  instructions: string[]
  notes: string
  nutrition: Record<string, string> | null
  blocked?: boolean
}

function ingredientMatchesFridge(ingredient: string, fridgeItems: FridgeItem[]): boolean {
  return fridgeItems.some(item => ingredientMatches(item.name, ingredient))
}

function parseDuration(iso: string): string {
  if (!iso) return ''
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return iso.replace('PT', '').toLowerCase()
  const hours = parseInt(match[1]) || 0
  const minutes = parseInt(match[2]) || 0
  const parts: string[] = []
  if (hours) parts.push(`${hours} hr`)
  if (minutes) parts.push(`${minutes} min`)
  return parts.join(' ') || ''
}

function renderStars(value: number) {
  const stars: string[] = []
  const rounded = Math.round(value * 2) / 2
  for (let i = 1; i <= 5; i++) {
    if (i <= rounded) stars.push('★')
    else if (i - 0.5 === rounded) stars.push('⯨')
    else stars.push('☆')
  }
  return stars.join('')
}

interface RecipePageProps {
  url: string
  onBack: () => void
}

function RecipePage({ url, onBack }: RecipePageProps) {
  const [recipe, setRecipe] = useState<RecipeData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>([])
  const [ingredientView, setIngredientView] = useState<'all' | 'owned'>('all')

  useEffect(() => {
    fetchFridgeItems().then(setFridgeItems)
  }, [])

  const fridgeMatchSet = useMemo(() => {
    if (!recipe) return new Set<number>()
    const matches = new Set<number>()
    recipe.ingredients.forEach((ing, i) => {
      if (ingredientMatchesFridge(ing, fridgeItems)) matches.add(i)
    })
    return matches
  }, [recipe, fridgeItems])

  useEffect(() => {
    // Check localStorage cache — only use if recipe has actual content
    const cached = cacheGet<RecipeData>('recipe', url)
    if (cached && cached.name && (cached.ingredients?.length > 0 || cached.instructions?.length > 0)) {
      setRecipe(cached)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    fetch(`/api/recipes/extract?url=${encodeURIComponent(url)}`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to load recipe')
        return r.json()
      })
      .then(data => {
        setRecipe(data)
        if (!data.blocked && data.name) {
          cacheSet('recipe', url, data)
        }
      })
      .catch(() => setError('Unable to extract recipe data from this page.'))
      .finally(() => setIsLoading(false))
  }, [url])

  if (isLoading) {
    return (
      <div className="recipe-page">
        <div className="recipe-page-nav">
          <button className="recipe-back-btn" onClick={onBack}>← Back to results</button>
        </div>
        <div className="recipe-loading">Loading recipe…</div>
      </div>
    )
  }

  if (error || !recipe) {
    return (
      <div className="recipe-page">
        <div className="recipe-page-nav">
          <button className="recipe-back-btn" onClick={onBack}>← Back to results</button>
        </div>
        <div className="recipe-error">
          <p>{error || 'Failed to load recipe.'}</p>
          <a href={url} target="_blank" rel="noopener noreferrer">
            View on original site ↗
          </a>
        </div>
      </div>
    )
  }

  // If the site blocked us, show a friendly redirect message
  if (recipe.blocked) {
    return (
      <div className="recipe-page">
        <div className="recipe-page-nav">
          <button className="recipe-back-btn" onClick={onBack}>← Back to results</button>
        </div>
        <div className="recipe-blocked">
          <h2>This recipe is hosted on {recipe.source}</h2>
          <p>This site doesn't allow automated access, but you can view the full recipe directly:</p>
          <a className="recipe-blocked-link" href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer">
            View recipe on {recipe.source} ↗
          </a>
        </div>
      </div>
    )
  }

  const prepTime = parseDuration(recipe.prepTime)
  const cookTime = parseDuration(recipe.cookTime)
  const totalTime = parseDuration(recipe.totalTime)

  return (
    <div className="recipe-page">
      <div className="recipe-page-nav">
        <button className="recipe-back-btn" onClick={onBack}>← Back to results</button>
        <a className="recipe-source-link" href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer">
          View on {recipe.source} ↗
        </a>
      </div>

      {recipe.image && (
        <div className="recipe-hero">
          <img src={recipe.image} alt={recipe.name} />
        </div>
      )}

      <div className="recipe-header">
        <h1 className="recipe-name">{recipe.name}</h1>

        {recipe.author && (
          <p className="recipe-author">By {recipe.author}</p>
        )}

        {recipe.rating && recipe.rating.value > 0 && (
          <div className="recipe-rating">
            <span className="recipe-stars">{renderStars(recipe.rating.value)}</span>
            <span className="recipe-rating-text">
              {recipe.rating.value.toFixed(1)}
              {recipe.rating.count > 0 && ` (${recipe.rating.count} reviews)`}
            </span>
          </div>
        )}

        {(prepTime || cookTime || totalTime || recipe.servings) && (
          <div className="recipe-meta">
            {prepTime && (
              <div className="recipe-meta-item">
                <span className="recipe-meta-label">Prep Time</span>
                <span className="recipe-meta-value">{prepTime}</span>
              </div>
            )}
            {cookTime && (
              <div className="recipe-meta-item">
                <span className="recipe-meta-label">Cook Time</span>
                <span className="recipe-meta-value">{cookTime}</span>
              </div>
            )}
            {totalTime && (
              <div className="recipe-meta-item">
                <span className="recipe-meta-label">Total Time</span>
                <span className="recipe-meta-value">{totalTime}</span>
              </div>
            )}
            {recipe.servings && (
              <div className="recipe-meta-item">
                <span className="recipe-meta-label">Servings</span>
                <span className="recipe-meta-value">{recipe.servings}</span>
              </div>
            )}
          </div>
        )}

        {recipe.description && recipe.description !== recipe.notes && (
          <p className="recipe-description">{recipe.description}</p>
        )}
      </div>

      <div className="recipe-body">
        {recipe.ingredients.length > 0 && (
          <section className="recipe-ingredients">
            <h2>Ingredients</h2>
            <div className="ingredients-tabs">
              <button
                className={`ingredients-tab ${ingredientView === 'all' ? 'active' : ''}`}
                onClick={() => setIngredientView('all')}
              >
                All
              </button>
              <button
                className={`ingredients-tab ${ingredientView === 'owned' ? 'active' : ''}`}
                onClick={() => setIngredientView('owned')}
              >
                Owned
              </button>
            </div>
            {ingredientView === 'all' ? (
              <ul>
                {recipe.ingredients.map((ing, i) => (
                  <li key={i}>{ing}</li>
                ))}
              </ul>
            ) : (
              <>
                {fridgeMatchSet.size > 0 && (
                  <>
                    <p className="ingredients-section-label">In Your Fridge</p>
                    <ul>
                      {recipe.ingredients.filter((_, i) => fridgeMatchSet.has(i)).map((ing, i) => (
                        <li key={`owned-${i}`}>{ing}</li>
                      ))}
                    </ul>
                  </>
                )}
                {fridgeMatchSet.size > 0 && fridgeMatchSet.size < recipe.ingredients.length && (
                  <hr className="ingredients-divider" />
                )}
                {fridgeMatchSet.size < recipe.ingredients.length && (
                  <>
                    <p className="ingredients-section-label">Shopping List</p>
                    <ul>
                      {recipe.ingredients.filter((_, i) => !fridgeMatchSet.has(i)).map((ing, i) => (
                        <li key={`missing-${i}`}>{ing}</li>
                      ))}
                    </ul>
                  </>
                )}
                {fridgeItems.length === 0 && (
                  <p className="ingredients-empty-fridge">
                    Add items to <strong>My Fridge</strong> to see what you already have.
                  </p>
                )}
              </>
            )}
          </section>
        )}

        {recipe.instructions.length > 0 && (
          <section className="recipe-instructions">
            <h2>Instructions</h2>
            <ol>
              {recipe.instructions.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </section>
        )}

        {recipe.ingredients.length === 0 && recipe.instructions.length === 0 && (
          <section className="recipe-instructions">
            <div className="recipe-no-data">
              <p>Full recipe details couldn't be extracted from this site.</p>
              <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer">
                View full recipe on {recipe.source} ↗
              </a>
            </div>
          </section>
        )}
      </div>

      {recipe.notes && (
        <section className="recipe-notes">
          <h2>Notes</h2>
          <p>{recipe.notes}</p>
        </section>
      )}

      {recipe.nutrition && Object.keys(recipe.nutrition).length > 0 && (
        <section className="recipe-nutrition">
          <h2>Nutrition Information</h2>
          <div className="nutrition-grid">
            {Object.entries(recipe.nutrition).map(([label, value]) => (
              <div key={label} className="nutrition-item">
                <span className="nutrition-value">{value}</span>
                <span className="nutrition-label">{label}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="recipe-footer">
        <span className="recipe-footer-source">
          Recipe from <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer">{recipe.source}</a>
        </span>
      </div>
    </div>
  )
}

export default RecipePage
