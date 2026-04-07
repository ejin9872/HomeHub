import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { cacheGet, cacheSet, cacheMergeSearchMeta } from '../cache'
import './SearchResults.css'

interface SearchResult {
  title: string
  url: string
  snippet: string
  domain: string
  image?: string
  rating?: number
  ratingCount?: number
  ingredientCount?: number
  totalTime?: string
  categories?: string[]
}

interface SearchResponse {
  results: SearchResult[]
  hasMore: boolean
  total: number
}

interface CachedSearch {
  results: SearchResult[]
  hasMore: boolean
}

interface SearchResultsProps {
  query: string
  onRecipeClick: (url: string) => void
}

function parseDuration(iso: string): string {
  if (!iso) return ''
  // Handle both PT1H30M and P0Y0M0DT4H0M0.000S formats
  const match = iso.match(/T(?:(\d+)H)?(?:(\d+)M)?/)
  if (!match) return ''
  const hours = parseInt(match[1]) || 0
  const minutes = parseInt(match[2]) || 0
  return hours * 60 + minutes ? `${hours * 60 + minutes}` : ''
}

function getDurationLabel(iso: string): { text: string; className: string } | null {
  const mins = parseInt(parseDuration(iso))
  if (!mins) return null
  if (mins <= 30) return { text: `${mins} min`, className: 'badge-fast' }
  if (mins <= 60) return { text: `${mins} min`, className: 'badge-medium' }
  const hrs = Math.floor(mins / 60)
  const rem = mins % 60
  const label = rem ? `${hrs} hr ${rem} min` : `${hrs} hr`
  return { text: label, className: 'badge-slow' }
}

function getComplexity(count: number): { text: string; className: string } | null {
  if (!count) return null
  if (count <= 6) return { text: 'Easy', className: 'badge-easy' }
  if (count <= 12) return { text: 'Medium', className: 'badge-medium-complexity' }
  return { text: 'Advanced', className: 'badge-hard' }
}

const PAGE_SIZE = 20

function parseNutritionValue(value: string | undefined): number {
  if (!value) return -1
  const match = value.match(/[\d.]+/)
  return match ? parseFloat(match[0]) : -1
}

const GLUTEN_RE = /\b(flour|wheat|bread|pasta|noodle|barley|rye|semolina|couscous|cracker|breadcrumb|panko|tortilla|pita|biscuit|spaghetti|macaroni|fettuccine|lasagna|croissant|pastry|pie crust|pizza dough)\b/
const DAIRY_RE = /\b(milk|cheese|butter|cream|yogurt|sour cream|whey|casein|ghee|ricotta|mozzarella|parmesan|cheddar|mascarpone|gruyere|cream cheese|buttermilk|condensed milk|evaporated milk|whipped cream|ice cream|half-and-half|half and half)\b/
const MEAT_RE = /\b(chicken|beef|pork|lamb|turkey|bacon|sausage|ham|steak|ground meat|ground beef|ground pork|ground turkey|ground chicken|veal|duck|goose|venison|bison|prosciutto|pepperoni|salami|chorizo|meatball|ribeye|sirloin|tenderloin|roast|ribs|drumstick|thigh|breast|wing)\b/
const FISH_RE = /\b(fish|salmon|tuna|shrimp|prawn|crab|lobster|clam|mussel|oyster|scallop|cod|tilapia|halibut|anchov|sardine|mackerel|squid|calamari|octopus|mahi|swordfish|trout|bass|snapper|catfish)\b/
const EGG_RE = /\b(eggs?)\b/
const NUT_RE = /\b(almond|walnut|pecan|cashew|pistachio|hazelnut|macadamia|peanut|pine nut|nut butter|peanut butter|almond butter|cashew butter|brazil nut|praline)\b/
const GRAIN_RE = /\b(flour|wheat|bread|rice|oat|corn|barley|rye|quinoa|millet|buckwheat|bulgur|couscous|pasta|noodle|cereal|granola|polenta|grits|tortilla|crouton)\b/
const LEGUME_RE = /\b(beans?|lentils?|chickpeas?|peas?|soy|soybean|tofu|tempeh|edamame|hummus)\b/
const SUGAR_RE = /\b(sugar|syrup|honey|molasses|agave|brown sugar|powdered sugar|confectioner|corn syrup|maple syrup|caramel)\b/

function categorizeRecipe(
  ingredients: string[],
  nutrition: Record<string, string> | null
): string[] {
  const tags: string[] = []
  if (ingredients.length === 0 && !nutrition) return tags

  const text = ingredients.map(s => s.toLowerCase()).join(' | ')

  if (ingredients.length > 0) {
    const hasMeat = MEAT_RE.test(text)
    const hasFish = FISH_RE.test(text)
    const hasDairy = DAIRY_RE.test(text)
    const hasEggs = EGG_RE.test(text)
    const hasGluten = GLUTEN_RE.test(text)
    const hasGrains = GRAIN_RE.test(text)
    const hasLegumes = LEGUME_RE.test(text)
    const hasSugar = SUGAR_RE.test(text)
    const hasNuts = NUT_RE.test(text)

    // Diet categories with smart dedup
    if (!hasMeat && !hasFish && !hasDairy && !hasEggs) {
      tags.push('Vegan')
    } else if (!hasMeat && !hasFish) {
      tags.push('Vegetarian')
    }

    if (!hasGrains && !hasLegumes && !hasDairy && !hasSugar && (hasMeat || hasFish)) {
      tags.push('Paleo')
    }

    if (!hasGluten && !tags.includes('Paleo')) tags.push('Gluten-Free')
    if (!hasDairy && !tags.includes('Vegan')) tags.push('Dairy-Free')
    if (hasNuts) tags.push('Contains Nuts')
  }

  if (nutrition) {
    const cal = parseNutritionValue(nutrition['Calories'])
    const protein = parseNutritionValue(nutrition['Protein'])
    const carbs = parseNutritionValue(nutrition['Carbs'])
    const fat = parseNutritionValue(nutrition['Fat'])

    if (carbs >= 0 && carbs <= 20 && fat >= 20) {
      tags.push('Keto')
    } else if (carbs >= 0 && carbs <= 20 && cal > 0) {
      tags.push('Low Carb')
    }
    if (protein >= 20) tags.push('High Protein')
    if (cal > 0 && cal <= 400) tags.push('Diet Friendly')
  }

  return tags
}

const CATEGORY_CLASSES: Record<string, string> = {
  'Vegan': 'cat-vegan',
  'Vegetarian': 'cat-vegetarian',
  'Gluten-Free': 'cat-gluten-free',
  'Dairy-Free': 'cat-dairy-free',
  'Paleo': 'cat-paleo',
  'Keto': 'cat-keto',
  'High Protein': 'cat-high-protein',
  'Low Carb': 'cat-low-carb',
  'Diet Friendly': 'cat-diet-friendly',
  'Contains Nuts': 'cat-contains-nuts',
}

function SearchResults({ query, onRecipeClick }: SearchResultsProps) {
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)

  const pageRef = useRef(0)
  const loadingRef = useRef(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const [filters, setFilters] = useState({
    minRating: null as number | null,
    maxTime: null as number | null,
    difficulty: null as string | null,
    categories: [] as string[],
  })

  const availableCategories = useMemo(() => {
    const cats = new Set<string>()
    results.forEach(r => r.categories?.forEach(c => cats.add(c)))
    const order = ['Vegan', 'Vegetarian', 'Gluten-Free', 'Dairy-Free', 'Paleo', 'Keto', 'High Protein', 'Low Carb', 'Diet Friendly', 'Contains Nuts']
    return order.filter(c => cats.has(c))
  }, [results])

  const hasActiveFilters = filters.minRating !== null || filters.maxTime !== null || filters.difficulty !== null || filters.categories.length > 0

  const filteredResults = useMemo(() => {
    if (!hasActiveFilters) return results
    return results.filter(r => {
      if (filters.minRating && (!r.rating || r.rating < filters.minRating)) return false
      if (filters.maxTime) {
        const mins = r.totalTime ? parseInt(parseDuration(r.totalTime)) : 0
        if (!mins || mins > filters.maxTime) return false
      }
      if (filters.difficulty) {
        const c = r.ingredientCount ? getComplexity(r.ingredientCount) : null
        if (!c || c.text !== filters.difficulty) return false
      }
      if (filters.categories.length > 0) {
        if (!r.categories) return false
        for (const cat of filters.categories) {
          if (!r.categories.includes(cat)) return false
        }
      }
      return true
    })
  }, [results, filters, hasActiveFilters])

  const toggleRating = (val: number) =>
    setFilters(f => ({ ...f, minRating: f.minRating === val ? null : val }))
  const toggleTime = (val: number) =>
    setFilters(f => ({ ...f, maxTime: f.maxTime === val ? null : val }))
  const toggleDifficulty = (val: string) =>
    setFilters(f => ({ ...f, difficulty: f.difficulty === val ? null : val }))
  const toggleCategory = (cat: string) =>
    setFilters(f => ({
      ...f,
      categories: f.categories.includes(cat)
        ? f.categories.filter(c => c !== cat)
        : [...f.categories, cat],
    }))
  const clearFilters = () =>
    setFilters({ minRating: null, maxTime: null, difficulty: null, categories: [] })

  const lazyLoadMeta = useCallback((data: SearchResult[], q: string, startIndex: number) => {
    if (!Array.isArray(data)) return
    data.forEach((result, i) => {
      const absoluteIndex = startIndex + i
      const hasAllMeta = result.image && result.rating && result.ingredientCount && result.totalTime
      const hasRecipeCache = cacheGet('recipe', result.url)
      if (hasAllMeta && hasRecipeCache) return

      setTimeout(() => {
        fetch(`/api/recipes/meta?url=${encodeURIComponent(result.url)}`)
          .then(r => r.json())
          .then(meta => {
            if (meta.recipe && meta.recipe.name && 
                (meta.recipe.ingredients?.length > 0 || meta.recipe.instructions?.length > 0)) {
              cacheSet('recipe', result.url, meta.recipe)
            }

            const patch: Partial<SearchResult> = {}
            if (!result.image && meta.image) patch.image = meta.image
            if (!result.rating && meta.rating) patch.rating = meta.rating
            if (!result.ratingCount && meta.ratingCount) patch.ratingCount = meta.ratingCount
            if (!result.ingredientCount && meta.ingredientCount) patch.ingredientCount = meta.ingredientCount
            if (!result.totalTime && meta.totalTime) patch.totalTime = meta.totalTime

            if (meta.recipe && !result.categories) {
              const cats = categorizeRecipe(
                meta.recipe.ingredients || [],
                meta.recipe.nutrition || null
              )
              if (cats.length > 0) patch.categories = cats
            }

            if (Object.keys(patch).length === 0) return
            setResults(prev => prev.map((r, idx) => idx === absoluteIndex ? { ...r, ...patch } : r))
            cacheMergeSearchMeta(q, absoluteIndex, patch)
          })
          .catch(() => {})
      }, i * 200)
    })
  }, [])

  const search = useCallback(async (q: string) => {
    setIsLoading(true)
    setError(null)
    setResults([])
    setHasMore(false)
    pageRef.current = 0
    try {
      const raw = cacheGet<CachedSearch | SearchResult[]>('search', q)
      // Handle both new { results, hasMore } and legacy plain-array cache format
      const cached: CachedSearch | null = raw
        ? Array.isArray(raw) ? { results: raw, hasMore: true } : raw
        : null
      if (cached && cached.results) {
        setResults(cached.results)
        setHasMore(cached.hasMore)
        pageRef.current = Math.max(0, Math.ceil(cached.results.length / PAGE_SIZE) - 1)
        setIsLoading(false)
        lazyLoadMeta(cached.results, q, 0)
        return
      }

      const res = await fetch(`/api/recipes/search?q=${encodeURIComponent(q)}&page=0`)
      if (!res.ok) {
        let serverMsg = ''
        try { const body = await res.json(); serverMsg = body.error || '' } catch { /* not JSON */ }
        throw new Error(serverMsg || `Search returned HTTP ${res.status}`)
      }
      const body = await res.json()
      // Handle both new paginated { results, hasMore } and legacy plain-array responses
      const data: SearchResponse = Array.isArray(body)
        ? { results: body, hasMore: false, total: body.length }
        : body
      setResults(data.results)
      setHasMore(data.hasMore)
      cacheSet('search', q, { results: data.results, hasMore: data.hasMore })
      lazyLoadMeta(data.results, q, 0)
    } catch (err) {
      const detail = err instanceof Error ? err.message : ''
      setError(detail || 'Failed to search for recipes. Make sure both servers are running (npm run dev:full).')
    } finally {
      setIsLoading(false)
    }
  }, [lazyLoadMeta])

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return
    loadingRef.current = true
    setIsLoadingMore(true)

    try {
      const nextPage = pageRef.current + 1
      const res = await fetch(`/api/recipes/search?q=${encodeURIComponent(query)}&page=${nextPage}`)
      if (!res.ok) throw new Error('Failed to load more')
      const body = await res.json()
      const data: SearchResponse = Array.isArray(body)
        ? { results: body, hasMore: false, total: body.length }
        : body

      setResults(prev => {
        const updated = [...prev, ...data.results]
        cacheSet('search', query, { results: updated, hasMore: data.hasMore })
        lazyLoadMeta(data.results, query, prev.length)
        return updated
      })
      setHasMore(data.hasMore)
      pageRef.current = nextPage
    } catch {
      // Silent fail — user can scroll again to retry
    } finally {
      setIsLoadingMore(false)
      loadingRef.current = false
    }
  }, [hasMore, query, lazyLoadMeta])

  // IntersectionObserver triggers loadMore when sentinel enters viewport
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loadingRef.current) {
          loadMore()
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadMore])

  useEffect(() => {
    if (query) search(query)
  }, [query, search])

  if (isLoading) {
    return <div className="search-loading">Searching for recipes…</div>
  }

  if (error) {
    return <div className="search-error">{error}</div>
  }

  return (
    <div className="search-results">
      <h2 className="search-title">Results for "{query}"</h2>

      {results.length > 0 && (
        <div className="search-filters">
          <div className="filter-group">
            <span className="filter-label">Rating</span>
            <button className={`filter-chip ${filters.minRating === 4 ? 'active' : ''}`} onClick={() => toggleRating(4)}>★ 4+</button>
            <button className={`filter-chip ${filters.minRating === 3 ? 'active' : ''}`} onClick={() => toggleRating(3)}>★ 3+</button>
          </div>
          <div className="filter-group">
            <span className="filter-label">Time</span>
            <button className={`filter-chip ${filters.maxTime === 30 ? 'active' : ''}`} onClick={() => toggleTime(30)}>≤ 30 min</button>
            <button className={`filter-chip ${filters.maxTime === 60 ? 'active' : ''}`} onClick={() => toggleTime(60)}>≤ 1 hour</button>
          </div>
          <div className="filter-group">
            <span className="filter-label">Difficulty</span>
            <button className={`filter-chip ${filters.difficulty === 'Easy' ? 'active' : ''}`} onClick={() => toggleDifficulty('Easy')}>Easy</button>
            <button className={`filter-chip ${filters.difficulty === 'Medium' ? 'active' : ''}`} onClick={() => toggleDifficulty('Medium')}>Medium</button>
            <button className={`filter-chip ${filters.difficulty === 'Advanced' ? 'active' : ''}`} onClick={() => toggleDifficulty('Advanced')}>Advanced</button>
          </div>
          {availableCategories.length > 0 && (
            <div className="filter-group">
              <span className="filter-label">Diet</span>
              {availableCategories.map(cat => (
                <button
                  key={cat}
                  className={`filter-chip ${filters.categories.includes(cat) ? 'active' : ''}`}
                  onClick={() => toggleCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
          {hasActiveFilters && (
            <button className="filter-clear" onClick={clearFilters}>✕ Clear</button>
          )}
        </div>
      )}

      {hasActiveFilters && filteredResults.length === 0 && results.length > 0 && (
        <div className="search-empty">No recipes match your filters. Try removing some filters.</div>
      )}

      {results.length === 0 && (
        <div className="search-empty">No recipes found. Try a different search term.</div>
      )}

      <div className="search-grid">
        {filteredResults.map((result, i) => {
          const duration = result.totalTime ? getDurationLabel(result.totalTime) : null
          const complexity = result.ingredientCount ? getComplexity(result.ingredientCount) : null

          return (
            <button
              key={i}
              className="search-card"
              onClick={() => onRecipeClick(result.url)}
            >
              <div className="search-card-img-wrapper">
                {result.image ? (
                  <img src={result.image} alt={result.title} className="search-card-img" />
                ) : (
                  <div className="search-card-placeholder">🍽️</div>
                )}
              </div>
              <div className="search-card-info">
                <span className="search-card-domain">{result.domain}</span>
                <h3 className="search-card-title">{result.title}</h3>
                {(result.rating || duration || complexity) && (
                  <div className="search-card-meta">
                    {result.rating && (
                      <span className="search-card-rating">
                        ★ {result.rating.toFixed(1)}
                        {result.ratingCount ? <span className="rating-count">({result.ratingCount})</span> : null}
                      </span>
                    )}
                    {complexity && (
                      <span className={`search-card-badge ${complexity.className}`}>{complexity.text}</span>
                    )}
                    {duration && (
                      <span className={`search-card-badge ${duration.className}`}>⏱ {duration.text}</span>
                    )}
                  </div>
                )}
                {result.snippet && <p className="search-card-snippet">{result.snippet}</p>}
                {result.categories && result.categories.length > 0 && (
                  <div className="search-card-categories">
                    {result.categories.map(cat => (
                      <span key={cat} className={`category-badge ${CATEGORY_CLASSES[cat] || ''}`}>{cat}</span>
                    ))}
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      <div ref={sentinelRef} className="search-sentinel" />

      {isLoadingMore && (
        <div className="search-loading-more">
          <div className="loading-spinner" />
          <span>Loading more recipes…</span>
        </div>
      )}

      {!hasMore && results.length > 0 && !isLoadingMore && (
        <div className="search-end">No more recipes to load</div>
      )}
    </div>
  )
}

export default SearchResults
