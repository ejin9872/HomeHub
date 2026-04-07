import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import * as cheerio from 'cheerio'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import {
  registerUser, loginUser,
  createToken, verifyToken,
  getAllUsers, adminCreateUser, updateUser, deleteUser,
  requireAuth,
} from './auth.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// --- Recipe sources helpers ---

const RECIPE_SOURCES_PATH = join(__dirname, 'recipeSources.json')
const FRIDGES_PATH = join(__dirname, 'fridges.json')

function loadRecipeSources() {
  if (!existsSync(RECIPE_SOURCES_PATH)) return []
  return JSON.parse(readFileSync(RECIPE_SOURCES_PATH, 'utf-8'))
}

function saveRecipeSources(sources) {
  writeFileSync(RECIPE_SOURCES_PATH, JSON.stringify(sources, null, 2))
}

// --- Fridge storage helpers ---

function loadAllFridges() {
  if (!existsSync(FRIDGES_PATH)) return {}
  try {
    return JSON.parse(readFileSync(FRIDGES_PATH, 'utf-8'))
  } catch {
    return {}
  }
}

function saveFridges(fridges) {
  writeFileSync(FRIDGES_PATH, JSON.stringify(fridges, null, 2))
}

function getUserFridge(userId) {
  const fridges = loadAllFridges()
  return fridges[userId] || []
}

function setUserFridge(userId, items) {
  const fridges = loadAllFridges()
  fridges[userId] = items
  saveFridges(fridges)
}

const app = express()
app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

// --- Auth routes ---

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }
    const user = await registerUser(name, email, password)
    const token = createToken(user)
    res.json({ user, token })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }
    const user = await loginUser(email, password)
    const token = createToken(user)
    res.json({ user, token })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  try {
    const user = verifyToken(authHeader.slice(7))
    res.json({ user: { id: user.id, name: user.name, email: user.email } })
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
})

// --- Fridge routes (auth required) ---

app.get('/api/fridge', requireAuth, (req, res) => {
  res.json(getUserFridge(req.user.id))
})

app.put('/api/fridge', requireAuth, (req, res) => {
  const items = req.body
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'Body must be an array of fridge items' })
  }
  setUserFridge(req.user.id, items)
  res.json(items)
})

// --- Admin routes ---

app.get('/api/admin/users', (_req, res) => {
  res.json(getAllUsers())
})

app.post('/api/admin/users', async (req, res) => {
  try {
    const { name, email, password } = req.body
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' })
    }
    const user = await adminCreateUser(name, email, password)
    res.json(user)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.put('/api/admin/users/:id', async (req, res) => {
  try {
    const user = await updateUser(req.params.id, req.body)
    res.json(user)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.delete('/api/admin/users/:id', (req, res) => {
  try {
    deleteUser(req.params.id)
    res.json({ success: true })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// --- Recipe sources admin routes ---

app.get('/api/admin/recipe-sources', (_req, res) => {
  res.json(loadRecipeSources())
})

app.post('/api/admin/recipe-sources', (req, res) => {
  const { title, url, enabled, estimatedPercent } = req.body
  if (!title?.trim() || !url?.trim()) {
    return res.status(400).json({ error: 'Title and URL are required' })
  }
  const sources = loadRecipeSources()
  const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  if (sources.some(s => s.id === id)) {
    return res.status(400).json({ error: 'A source with this name already exists' })
  }
  const source = {
    id,
    title: title.trim(),
    url: url.trim().replace(/^https?:\/\//, '').replace(/^www\./, ''),
    enabled: enabled !== false,
    estimatedPercent: Math.min(100, Math.max(0, parseInt(estimatedPercent) || 0)),
  }
  sources.push(source)
  saveRecipeSources(sources)
  res.json(source)
})

app.put('/api/admin/recipe-sources/:id', (req, res) => {
  const sources = loadRecipeSources()
  const idx = sources.findIndex(s => s.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Source not found' })

  const { title, url, enabled, estimatedPercent } = req.body
  if (title !== undefined) sources[idx].title = title.trim()
  if (url !== undefined) sources[idx].url = url.trim().replace(/^https?:\/\//, '').replace(/^www\./, '')
  if (enabled !== undefined) sources[idx].enabled = !!enabled
  if (estimatedPercent !== undefined) sources[idx].estimatedPercent = Math.min(100, Math.max(0, parseInt(estimatedPercent) || 0))

  saveRecipeSources(sources)
  res.json(sources[idx])
})

app.delete('/api/admin/recipe-sources/:id', (req, res) => {
  let sources = loadRecipeSources()
  const idx = sources.findIndex(s => s.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Source not found' })
  sources.splice(idx, 1)
  saveRecipeSources(sources)
  res.json({ success: true })
})

// --- Admin fridge routes ---

app.get('/api/admin/fridge/:userId', (req, res) => {
  res.json(getUserFridge(req.params.userId))
})

app.put('/api/admin/fridge/:userId', (req, res) => {
  const items = req.body
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'Body must be an array of fridge items' })
  }
  setUserFridge(req.params.userId, items)
  res.json(items)
})

// --- Recipe search & proxy ---

const searchCache = new Map()
const CACHE_TTL = 15 * 60 * 1000
const SEARCH_PAGE_SIZE = 20
const MAX_SEARCH_RESULTS = 100

// Verify a URL is an individual recipe page by checking for Recipe structured data
// Returns: { type: 'recipe', image } | { type: 'blocked' } | { type: 'listicle', links }
async function verifyRecipePage(url) {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
    })
    clearTimeout(timeout)

    if (!response.ok) return { type: 'blocked' }
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) return { type: 'blocked' }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Extract og:image while we have the HTML
    const image = $('meta[property="og:image"]').attr('content')
      || $('meta[name="twitter:image"]').attr('content')
      || $('meta[itemprop="image"]').attr('content')
      || ''

    // Check for JSON-LD Recipe
    let recipeData = null
    $('script[type="application/ld+json"]').each((_i, el) => {
      if (recipeData) return
      try {
        const data = JSON.parse($(el).html())
        const candidates = Array.isArray(data)
          ? data
          : data['@graph'] ? data['@graph'] : [data]
        for (const item of candidates) {
          const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']]
          if (types.includes('Recipe')) { recipeData = item; return }
        }
      } catch { /* skip malformed JSON-LD */ }
    })
    if (recipeData) {
      // Extract card metadata from the recipe
      const rating = recipeData.aggregateRating
        ? parseFloat(recipeData.aggregateRating.ratingValue) || null
        : null
      const ratingCount = recipeData.aggregateRating
        ? parseInt(recipeData.aggregateRating.ratingCount || recipeData.aggregateRating.reviewCount) || 0
        : 0
      const ingredients = Array.isArray(recipeData.recipeIngredient) ? recipeData.recipeIngredient.length : 0
      const totalTime = recipeData.totalTime || recipeData.cookTime || ''
      return { type: 'recipe', image, rating, ratingCount, ingredients, totalTime }
    }

    // Check for recipe microdata
    if ($('[itemtype*="schema.org/Recipe"]').length > 0) return { type: 'recipe', image }

    // Check for common recipe plugin markup (WPRM, Tasty, etc.)
    if ($('.wprm-recipe, .tasty-recipe, [class*="recipe-card-"]').length > 0) return { type: 'recipe', image }

    // If we got HTML but no recipe markers, it's a listicle/article
    // Extract recipe links from the page to use as fallback results
    const links = []
    const seen = new Set()
    const selectors = [
      '[class*="recipe-listicle-card"] h2 a',
      '[class*="recipe-card"] h2 a, [class*="recipe-card"] h3 a',
      '[class*="card__title"] a',
      'article h2 a, article h3 a',
      '.entry-content h2 a, .entry-content h3 a',
      '.post-content h2 a, .post-content h3 a',
      '.list-item h2 a, .list-item h3 a',
      'main h2 a, main h3 a',
    ]
    for (const sel of selectors) {
      $(sel).each((_, el) => {
        // Skip links inside comment sections, nav, footer, sidebar
        if ($(el).closest('#comments, .comments, .comment-respond, [class*="comment"], nav, footer, aside, .sidebar, .widget, [role="navigation"], [role="complementary"]').length) return

        const href = $(el).attr('href')
        const text = $(el).text().trim().replace(/\s+/g, ' ')
        if (!href || !text || text.length < 5 || text.length > 120) return

        // Filter out obvious non-recipe titles
        const lower = text.toLowerCase()
        if (/^(cancel|leave|post|submit|sign|log|subscribe|follow|share|print|jump|skip|read more|view all|see all|next|prev)/i.test(lower)) return
        if (/\b(reply|comment|newsletter|privacy|cookie|terms|login|signup)\b/i.test(lower)) return

        try {
          const u = new URL(href, url)
          if (u.protocol !== 'http:' && u.protocol !== 'https:') return
          const key = u.origin + u.pathname
          if (seen.has(key)) return
          seen.add(key)
          const domain = u.hostname.replace('www.', '')

          // Find a nearby image and metadata in the same card/article container
          const card = $(el).closest('article, [class*="card"], li, .list-item')
          let linkImage = ''
          let totalTime = ''
          if (card.length) {
            const img = card.find('img').first()
            linkImage = img.attr('data-src') || img.attr('src') || ''
            if (linkImage && (linkImage.includes('1x1') || linkImage.includes('data:image'))) linkImage = ''

            // Extract total time from card text (e.g. "Total Time: 1 hour, 30 minutes")
            const cardText = card.text().replace(/\s+/g, ' ')
            const tm = cardText.match(/Total Time:\s*([\d]+\s*hours?)?[,\s]*([\d]+\s*(?:minutes?|mins?))?/i)
            if (tm) {
              const hrs = tm[1] ? parseInt(tm[1]) : 0
              const mins = tm[2] ? parseInt(tm[2]) : 0
              if (hrs || mins) totalTime = 'PT' + (hrs ? hrs + 'H' : '') + (mins ? mins + 'M' : '')
            }
          }

          links.push({ title: text, url: u.href, snippet: '', domain, image: linkImage || undefined, totalTime: totalTime || undefined })
        } catch {}
      })
      if (links.length >= 5) break
    }
    return { type: 'listicle', links }
  } catch {
    return { type: 'blocked' }
  }
}

// For blocked results where we can't fetch the page, check the title for listicle signals
function titleLooksLikeListicle(title) {
  const t = title.toLowerCase()
  if (/\b\d+\+?\s/.test(t)) return true
  if (/\btop\s+\d+\b/.test(t)) return true
  if (/\bour\s+(favorite|favourite|best|most)\b/.test(t)) return true
  if (/\bmost\s+popular\b/.test(t)) return true
  if (/\brecipe ideas\b/.test(t)) return true
  if (/\baccording\s+to\b/.test(t)) return true
  // Title is just "[Category] Recipes" with no specific dish name
  if (/^[\w\s]{3,25}\brecipes\s*[-|:]?\s*$/i.test(t)) return true
  return false
}

// Shared recipe extraction from HTML — used by both /meta and /extract endpoints
function parseRecipeFromHtml(html, url) {
  const $ = cheerio.load(html)
  const domain = new URL(url).hostname.replace('www.', '')

  // Find JSON-LD Recipe data
  let recipe = null
  $('script[type="application/ld+json"]').each((_i, el) => {
    if (recipe) return
    try {
      const data = JSON.parse($(el).html())
      const candidates = Array.isArray(data)
        ? data
        : data['@graph'] ? data['@graph'] : [data]
      for (const item of candidates) {
        const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']]
        if (types.includes('Recipe')) { recipe = item; break }
      }
    } catch { /* skip malformed JSON-LD */ }
  })

  if (recipe) {
    let image = ''
    if (Array.isArray(recipe.image)) {
      image = typeof recipe.image[0] === 'string' ? recipe.image[0] : recipe.image[0]?.url || ''
    } else if (typeof recipe.image === 'object') {
      image = recipe.image.url || ''
    } else {
      image = recipe.image || ''
    }

    let instructions = []
    const raw = recipe.recipeInstructions
    if (typeof raw === 'string') {
      instructions = raw.split(/\n+/).filter(Boolean).map(s => s.trim())
    } else if (Array.isArray(raw)) {
      for (const item of raw) {
        if (typeof item === 'string') {
          instructions.push(item.trim())
        } else if (item['@type'] === 'HowToStep') {
          instructions.push(item.text?.trim() || '')
        } else if (item['@type'] === 'HowToSection') {
          const sectionItems = item.itemListElement || []
          for (const sub of sectionItems) {
            instructions.push(sub.text?.trim() || '')
          }
        }
      }
    }
    instructions = instructions.filter(Boolean)

    let nutrition = null
    if (recipe.nutrition) {
      const n = recipe.nutrition
      nutrition = {}
      const fields = [
        ['calories', 'Calories'], ['fatContent', 'Fat'],
        ['saturatedFatContent', 'Saturated Fat'], ['cholesterolContent', 'Cholesterol'],
        ['sodiumContent', 'Sodium'], ['carbohydrateContent', 'Carbs'],
        ['fiberContent', 'Fiber'], ['sugarContent', 'Sugar'],
        ['proteinContent', 'Protein'],
      ]
      for (const [key, label] of fields) {
        if (n[key]) nutrition[label] = n[key]
      }
      if (Object.keys(nutrition).length === 0) nutrition = null
    }

    let rating = null
    if (recipe.aggregateRating) {
      rating = {
        value: parseFloat(recipe.aggregateRating.ratingValue) || 0,
        count: parseInt(recipe.aggregateRating.ratingCount || recipe.aggregateRating.reviewCount) || 0,
      }
    }

    let author = ''
    if (typeof recipe.author === 'string') author = recipe.author
    else if (Array.isArray(recipe.author)) author = recipe.author.map(a => a.name || a).join(', ')
    else if (recipe.author?.name) author = recipe.author.name

    return {
      name: recipe.name || '',
      image,
      description: recipe.description || '',
      prepTime: recipe.prepTime || '',
      cookTime: recipe.cookTime || '',
      totalTime: recipe.totalTime || '',
      servings: typeof recipe.recipeYield === 'string'
        ? recipe.recipeYield
        : Array.isArray(recipe.recipeYield) ? recipe.recipeYield[0] : '',
      author,
      source: domain, sourceUrl: url,
      rating,
      ingredients: recipe.recipeIngredient || [],
      instructions,
      notes: recipe.description || '',
      nutrition,
    }
  }

  // Fallback: scrape from HTML
  let fallbackName = $('meta[property="og:title"]').attr('content')
    || $('h1').first().text().trim()
    || $('title').text().trim() || ''
  let fallbackImage = $('meta[property="og:image"]').attr('content') || ''
  let fallbackDescription = $('meta[property="og:description"]').attr('content')
    || $('meta[name="description"]').attr('content') || ''

  let fallbackIngredients = []
  $('[itemprop="recipeIngredient"]').each((_i, el) => {
    const text = $(el).text().trim()
    if (text) fallbackIngredients.push(text)
  })

  let fallbackInstructions = []
  $('[itemprop="recipeInstructions"]').each((_i, el) => {
    const steps = $(el).find('li, p, [itemprop="step"], [itemprop="text"]')
    if (steps.length > 0) {
      steps.each((_j, step) => {
        const text = $(step).text().trim()
        if (text && text.length > 5) fallbackInstructions.push(text)
      })
    } else {
      const text = $(el).text().trim()
      if (text) fallbackInstructions.push(...text.split(/\n+/).filter(s => s.trim().length > 5).map(s => s.trim()))
    }
  })

  if (fallbackIngredients.length === 0) {
    $('.wprm-recipe-ingredient, .tasty-recipe-ingredients li, .recipe-ingredients li, .ingredients li').each((_i, el) => {
      const text = $(el).text().trim()
      if (text && text.length > 2) fallbackIngredients.push(text)
    })
  }

  if (fallbackInstructions.length === 0) {
    $('.wprm-recipe-instruction, .tasty-recipe-instructions li, .recipe-instructions li, .instructions li, .directions li, .recipe-steps li, .steps li').each((_i, el) => {
      const text = $(el).text().trim()
      if (text && text.length > 5) fallbackInstructions.push(text)
    })
  }

  if (fallbackIngredients.length === 0) {
    const recipeCard = $('[class*="recipe-card"], [class*="recipe_card"], [class*="recipeCard"], [id*="recipe"]').first()
    if (recipeCard.length) {
      recipeCard.find('ul li').each((_i, el) => {
        const text = $(el).text().trim()
        if (text && text.length > 2 && fallbackIngredients.length < 30) {
          fallbackIngredients.push(text)
        }
      })
      if (fallbackInstructions.length === 0) {
        recipeCard.find('ol li').each((_i, el) => {
          const text = $(el).text().trim()
          if (text && text.length > 5) fallbackInstructions.push(text)
        })
      }
    }
  }

  let fallbackPrepTime = '', fallbackCookTime = '', fallbackTotalTime = '', fallbackServings = ''
  const prepEl = $('[itemprop="prepTime"]')
  const cookEl = $('[itemprop="cookTime"]')
  const totalEl = $('[itemprop="totalTime"]')
  const yieldEl = $('[itemprop="recipeYield"]')
  if (prepEl.length) fallbackPrepTime = prepEl.attr('content') || prepEl.attr('datetime') || prepEl.text().trim()
  if (cookEl.length) fallbackCookTime = cookEl.attr('content') || cookEl.attr('datetime') || cookEl.text().trim()
  if (totalEl.length) fallbackTotalTime = totalEl.attr('content') || totalEl.attr('datetime') || totalEl.text().trim()
  if (yieldEl.length) fallbackServings = yieldEl.attr('content') || yieldEl.text().trim()

  const wprmName = $('.wprm-recipe-name, .tasty-recipe-title, .recipe-title').first().text().trim()
  if (wprmName) fallbackName = wprmName

  return {
    name: fallbackName,
    image: fallbackImage,
    description: fallbackDescription,
    prepTime: fallbackPrepTime,
    cookTime: fallbackCookTime,
    totalTime: fallbackTotalTime,
    servings: fallbackServings,
    author: '',
    source: domain, sourceUrl: url,
    rating: null,
    ingredients: fallbackIngredients,
    instructions: fallbackInstructions,
    notes: '',
    nutrition: null,
  }
}

// Fetch one page of DuckDuckGo results and extract candidate URLs
async function fetchDdgCandidates(query, nextFormData) {
  let response
  if (!nextFormData) {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query + ' recipe')}`
    response = await fetch(searchUrl)
  } else {
    response = await fetch('https://html.duckduckgo.com/html/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(nextFormData).toString(),
    })
  }

  if (!response.ok) throw new Error(`Search provider returned ${response.status}`)

  const html = await response.text()
  const $ = cheerio.load(html)

  const candidates = []
  const localSeen = new Set()

  // Domains that should never appear in recipe results
  const blockedDomains = [
    'shopping.yahoo.com', 'r.search.yahoo.com', 'search.yahoo.com',
    'ads.yahoo.com', 'yahoo.com/shopping',
    'ebay.com', 'etsy.com', 'walmart.com', 'target.com',
    'facebook.com', 'instagram.com', 'twitter.com', 'tiktok.com',
    'youtube.com', 'youtu.be',
  ]

  $('.result').each((_i, el) => {
    // Skip sponsored/ad results
    if ($(el).hasClass('result--ad') || $(el).find('.badge--ad, .result__ad').length) return

    const titleEl = $(el).find('.result__a')
    const snippetEl = $(el).find('.result__snippet')
    const title = titleEl.text().trim()
    let href = titleEl.attr('href') || ''
    const snippet = snippetEl.text().trim()

    if (href.includes('uddg=')) {
      try {
        const url = new URL(href, 'https://duckduckgo.com')
        href = decodeURIComponent(url.searchParams.get('uddg') || href)
      } catch {
        const match = href.match(/[?&]uddg=([^&]+)/)
        if (match) href = decodeURIComponent(match[1])
      }
    }

    // Skip DDG ad redirect links
    if (href.includes('/y.js') || href.includes('duckduckgo.com/y.js')) return

    if (title && href && href.startsWith('http')) {
      try {
        const hostname = new URL(href).hostname
        if (hostname.includes('duckduckgo.com') || hostname.includes('duck.com')) return
        if (blockedDomains.some(d => hostname.includes(d))) return
        if (localSeen.has(href)) return
        localSeen.add(href)
        const domain = hostname.replace('www.', '')
        candidates.push({ title, url: href, snippet, domain })
      } catch { /* skip invalid URLs */ }
    }
  })

  // Parse "Next" page form for DDG pagination
  let nextPage = null
  const nextBtn = $('input[value="Next"]')
  if (nextBtn.length) {
    const form = nextBtn.closest('form')
    if (form.length) {
      nextPage = {}
      form.find('input[type="hidden"]').each((_i, el) => {
        const name = $(el).attr('name')
        const value = $(el).attr('value')
        if (name) nextPage[name] = value || ''
      })
    }
  }

  return { candidates, nextPage }
}

// Verify candidates and filter into confirmed recipe results
async function verifyAndFilterCandidates(candidates, seenUrls) {
  const fresh = candidates.filter(c => !seenUrls.has(c.url))

  const verifications = await Promise.all(
    fresh.map(c => verifyRecipePage(c.url))
  )

  const results = []

  for (let i = 0; i < fresh.length; i++) {
    const v = verifications[i]
    if (v.type === 'recipe') {
      const item = { ...fresh[i] }
      if (v.image) item.image = v.image
      if (v.rating) item.rating = v.rating
      if (v.ratingCount) item.ratingCount = v.ratingCount
      if (v.ingredients) item.ingredientCount = v.ingredients
      if (v.totalTime) item.totalTime = v.totalTime
      if (!seenUrls.has(item.url)) {
        results.push(item)
        seenUrls.add(item.url)
      }
    } else if (v.type === 'blocked') {
      // We couldn't fetch this page, so only include it if the title
      // strongly suggests a single recipe (not a listicle or article)
      if (!seenUrls.has(fresh[i].url) && !titleLooksLikeListicle(fresh[i].title)
          && /recipe/i.test(fresh[i].title + ' ' + fresh[i].url)) {
        results.push(fresh[i])
        seenUrls.add(fresh[i].url)
      }
    } else if (v.type === 'listicle') {
      for (const link of v.links) {
        if (!seenUrls.has(link.url)) {
          seenUrls.add(link.url)
          results.push(link)
        }
      }
    }
  }

  return results
}

app.get('/api/recipes/search', async (req, res) => {
  const query = req.query.q
  const page = parseInt(req.query.page) || 0
  if (!query) return res.status(400).json({ error: 'Query parameter q is required' })

  const cacheKey = query.toLowerCase().trim()
  let entry = searchCache.get(cacheKey)

  if (entry && Date.now() - entry.time > CACHE_TTL) {
    searchCache.delete(cacheKey)
    entry = null
  }

  if (!entry) {
    entry = {
      results: [],
      nextFormData: null,
      exhausted: false,
      time: Date.now(),
      seenUrls: new Set(),
    }
    searchCache.set(cacheKey, entry)
  }

  const needed = Math.min((page + 1) * SEARCH_PAGE_SIZE, MAX_SEARCH_RESULTS)

  try {
    let fetchAttempts = 0
    while (entry.results.length < needed && !entry.exhausted && fetchAttempts < 10) {
      fetchAttempts++
      const { candidates, nextPage } = await fetchDdgCandidates(query, entry.nextFormData)

      if (candidates.length === 0) {
        entry.exhausted = true
        break
      }

      const newResults = await verifyAndFilterCandidates(candidates, entry.seenUrls)
      entry.results.push(...newResults)

      if (!nextPage || Object.keys(nextPage).length === 0) {
        entry.exhausted = true
      } else {
        entry.nextFormData = nextPage
      }
    }

    if (entry.results.length >= MAX_SEARCH_RESULTS) {
      entry.results = entry.results.slice(0, MAX_SEARCH_RESULTS)
      entry.exhausted = true
    }

    const start = page * SEARCH_PAGE_SIZE
    const end = Math.min(start + SEARCH_PAGE_SIZE, entry.results.length)
    const slice = entry.results.slice(start, end)
    const hasMore = end < entry.results.length || (!entry.exhausted && entry.results.length < MAX_SEARCH_RESULTS)

    res.json({ results: slice, hasMore, total: entry.results.length })
  } catch (err) {
    console.error('Search error:', err.message)
    res.status(500).json({ error: 'Failed to search for recipes' })
  }
})

app.get('/api/recipes/meta', async (req, res) => {
  const url = req.query.url
  if (!url) return res.json({ image: '', description: '' })

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
    })
    clearTimeout(timeout)

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return res.json({ image: '', description: '', blocked: true })
    }

    const html = await response.text()
    const recipe = parseRecipeFromHtml(html, url)

    res.json({
      image: recipe.image || '',
      description: recipe.description || '',
      rating: recipe.rating?.value || undefined,
      ratingCount: recipe.rating?.count || undefined,
      ingredientCount: recipe.ingredients?.length || undefined,
      totalTime: recipe.totalTime || undefined,
      recipe: recipe.name ? recipe : undefined,
    })
  } catch {
    res.json({ image: '', description: '' })
  }
})

app.get('/api/recipes/extract', async (req, res) => {
  const url = req.query.url
  if (!url) return res.status(400).json({ error: 'URL parameter is required' })

  const blockedResponse = (u) => {
    const domain = new URL(u).hostname.replace('www.', '')
    return {
      name: '', image: '', description: '',
      prepTime: '', cookTime: '', totalTime: '',
      servings: '', author: '',
      source: domain, sourceUrl: u,
      rating: null, ingredients: [], instructions: [],
      notes: '', nutrition: null, blocked: true,
    }
  }

  try {
    const response = await fetch(url, { redirect: 'follow' })

    if (!response.ok) {
      return res.json(blockedResponse(url))
    }

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return res.json(blockedResponse(url))
    }

    const html = await response.text()
    res.json(parseRecipeFromHtml(html, url))
  } catch (err) {
    console.error('Extract error:', err.message)
    res.json(blockedResponse(url))
  }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`\n🍳 HomeHub Server → http://localhost:${PORT}\n`)
})
