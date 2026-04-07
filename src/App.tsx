import { useState, useEffect, useCallback } from 'react'
import './App.css'
import AdminPanel from './components/AdminPanel'
import SearchResults from './components/SearchResults'
import RecipePage from './components/RecipePage'
import SavedRecipes from './components/SavedRecipes'
import MyFridge from './components/MyFridge'
import Recommended from './components/Recommended'

type View = 'home' | 'search' | 'recipe' | 'fridge' | 'saved'

interface AuthUser {
  id: string
  name: string
  email: string
}

function loadAuth(): { user: AuthUser; token: string } | null {
  try {
    const raw = localStorage.getItem('homehub-auth')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed?.user && parsed?.token) return parsed
    return null
  } catch {
    return null
  }
}

interface MenuCategory {
  label: string
  items: { label: string; query: string }[]
}

const menuCategories: MenuCategory[] = [
  {
    label: 'Breakfast',
    items: [
      { label: 'Breakfast Ideas', query: 'breakfast recipes' },
      { label: 'Egg Recipes', query: 'egg recipes' },
      { label: 'Pancakes', query: 'pancake recipes' },
      { label: 'French Toast', query: 'french toast recipe' },
      { label: 'Muffins', query: 'muffin recipes' },
    ],
  },
  {
    label: 'Lunch',
    items: [
      { label: 'Soup Recipes', query: 'soup recipes' },
      { label: 'Salad Recipes', query: 'salad recipes' },
      { label: 'Sandwich Ideas', query: 'sandwich recipes' },
      { label: 'Pasta Dishes', query: 'pasta recipes' },
      { label: 'Wraps & Rolls', query: 'wrap recipes' },
    ],
  },
  {
    label: 'Dinner',
    items: [
      { label: 'Chicken Dinners', query: 'chicken dinner recipes' },
      { label: 'Beef Recipes', query: 'beef recipes' },
      { label: 'Pork Recipes', query: 'pork recipes' },
      { label: 'Seafood', query: 'seafood recipes' },
      { label: 'Lamb', query: 'lamb recipes' },
      { label: 'Vegetarian', query: 'vegetarian dinner recipes' },
    ],
  },
  {
    label: 'Holidays',
    items: [
      { label: 'Thanksgiving', query: 'thanksgiving recipes' },
      { label: 'Christmas Recipes', query: 'christmas dinner recipes' },
      { label: 'Easter', query: 'easter recipes' },
      { label: 'Halloween', query: 'halloween recipes' },
    ],
  },
  {
    label: 'Parties',
    items: [
      { label: 'Appetizers', query: 'appetizer recipes' },
      { label: 'Side Dishes', query: 'side dish recipes' },
      { label: 'Dips & Spreads', query: 'dip recipes' },
      { label: 'Finger Foods', query: 'finger food recipes' },
    ],
  },
  {
    label: 'Healthy',
    items: [
      { label: 'Vegan Recipes', query: 'vegan recipes' },
      { label: 'Vegetarian', query: 'vegetarian recipes' },
      { label: 'Salads', query: 'healthy salad recipes' },
      { label: 'Smoothies', query: 'smoothie recipes' },
    ],
  },
  {
    label: 'Dessert',
    items: [
      { label: 'All Desserts', query: 'dessert recipes' },
      { label: 'Cake Recipes', query: 'cake recipes' },
      { label: 'Cookie Recipes', query: 'cookie recipes' },
      { label: 'Pie Recipes', query: 'pie recipes' },
      { label: 'Brownies', query: 'brownie recipes' },
    ],
  },
]

const featuredCategories = [
  { emoji: '🍗', label: 'Chicken', query: 'chicken recipes' },
  { emoji: '🥩', label: 'Beef', query: 'beef recipes' },
  { emoji: '🐟', label: 'Seafood', query: 'seafood recipes' },
  { emoji: '🥗', label: 'Vegetarian', query: 'vegetarian recipes' },
  { emoji: '🍝', label: 'Pasta', query: 'pasta recipes' },
  { emoji: '🍰', label: 'Dessert', query: 'dessert recipes' },
  { emoji: '🍳', label: 'Breakfast', query: 'breakfast recipes' },
  { emoji: '🌱', label: 'Vegan', query: 'vegan recipes' },
]

function parseRoute(): { view: View; param: string } {
  const path = window.location.pathname
  const params = new URLSearchParams(window.location.search)

  if (path === '/search') return { view: 'search', param: params.get('q') || '' }
  if (path === '/recipe') return { view: 'recipe', param: params.get('url') || '' }
  if (path === '/fridge') return { view: 'fridge', param: '' }
  if (path === '/saved') return { view: 'saved', param: '' }
  return { view: 'home', param: '' }
}

function App() {
  const initial = parseRoute()
  const [view, setView] = useState<View>(initial.view)
  const [routeParam, setRouteParam] = useState(initial.param)
  const [headerSearch, setHeaderSearch] = useState('')
  const [auth, setAuth] = useState<{ user: AuthUser; token: string } | null>(() => loadAuth())
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')

  // Clear old shared fridge cache (now per-user on server)
  useEffect(() => {
    localStorage.removeItem('homehub-fridge')
  }, [])
  const [authName, setAuthName] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const isSignedIn = auth !== null

  if (window.location.pathname === '/admin') {
    return <AdminPanel />
  }

  const navigate = useCallback((path: string) => {
    window.history.pushState(null, '', path)
    const route = parseRoute()
    setView(route.view)
    setRouteParam(route.param)
  }, [])

  // Handle browser back/forward
  useEffect(() => {
    const onPopState = () => {
      const route = parseRoute()
      setView(route.view)
      setRouteParam(route.param)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  // Redirect away from protected routes if not signed in
  useEffect(() => {
    if (!auth && (view === 'fridge' || view === 'saved')) {
      navigate('/')
    }
  }, [auth, view, navigate])

  const handleHeaderSearch = () => {
    const term = headerSearch.trim()
    if (term) {
      navigate(`/search?q=${encodeURIComponent(term)}`)
      setHeaderSearch('')
    }
  }

  const goHome = () => navigate('/')

  const openAuthModal = () => {
    setAuthMode('login')
    setAuthName('')
    setAuthEmail('')
    setAuthPassword('')
    setAuthError('')
    setShowAuthModal(true)
  }

  const handleAuthSubmit = async () => {
    setAuthError('')
    setAuthLoading(true)
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const body = authMode === 'login'
        ? { email: authEmail, password: authPassword }
        : { name: authName, email: authEmail, password: authPassword }
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Authentication failed')
      const authData = { user: data.user, token: data.token }
      localStorage.setItem('homehub-auth', JSON.stringify(authData))
      setAuth(authData)
      setShowAuthModal(false)
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleSignOut = () => {
    localStorage.removeItem('homehub-auth')
    setAuth(null)
    if (view === 'fridge' || view === 'saved') {
      navigate('/')
    }
  }

  return (
    <div className="site">
      <header className="site-header">
        <div className="header-inner">
          <button className="site-logo" onClick={goHome}>🍳 HomeHub</button>
          <div className="header-search">
            <input
              type="text"
              value={headerSearch}
              onChange={e => setHeaderSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleHeaderSearch()}
              placeholder="Search recipes..."
            />
            <button onClick={handleHeaderSearch} aria-label="Search">🔍</button>
          </div>
          <div className="header-links">
            {isSignedIn && (
              <>
                <button
                  className={`header-link ${view === 'saved' ? 'active' : ''}`}
                  onClick={() => navigate('/saved')}
                >
                  ❤️ <span className="header-link-text">Saved</span>
                </button>
                <button
                  className={`header-link ${view === 'fridge' ? 'active' : ''}`}
                  onClick={() => navigate('/fridge')}
                >
                  🧊 <span className="header-link-text">My Fridge</span>
                </button>
              </>
            )}
            {isSignedIn ? (
              <button className="header-link header-signin" onClick={handleSignOut}>
                Sign Out
              </button>
            ) : (
              <button className="header-link header-signin" onClick={openAuthModal}>
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      <nav className="site-nav">
        <div className="nav-inner">
          {menuCategories.map(cat => (
            <div key={cat.label} className="nav-menu-item">
              <button className="nav-menu-btn">{cat.label}</button>
              <div className="nav-dropdown">
                {cat.items.map(item => (
                  <button
                    key={item.label}
                    className="nav-dropdown-item"
                    onClick={() => {
                      navigate(`/search?q=${encodeURIComponent(item.query)}`)
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {view === 'home' && (
        <section className="hero">
          <div className="hero-content">
            <h2>What's in Your Kitchen?</h2>
            <p>Find delicious recipes with ingredients you already have</p>
            <button className="hero-cta" onClick={() => navigate('/fridge')}>
              Open My Fridge
            </button>
          </div>
        </section>
      )}

      <main className="site-main">
        {view === 'home' && (
          <>
            <Recommended
              onRecipeClick={(name, sourceUrl) => {
                if (sourceUrl) {
                  navigate(`/recipe?url=${encodeURIComponent(sourceUrl)}`)
                } else {
                  navigate(`/search?q=${encodeURIComponent(name + ' recipe')}`)
                }
              }}
            />
            <section className="featured">
              <h2 className="featured-title">Browse by Category</h2>
              <div className="featured-grid">
                {featuredCategories.map(cat => (
                  <button
                    key={cat.label}
                    className="featured-card"
                    onClick={() => navigate(`/search?q=${encodeURIComponent(cat.query)}`)}
                  >
                    <span className="featured-emoji">{cat.emoji}</span>
                    <span className="featured-label">{cat.label}</span>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}
        {view === 'search' && routeParam && (
          <SearchResults
            key={routeParam}
            query={routeParam}
            onRecipeClick={(url) => navigate(`/recipe?url=${encodeURIComponent(url)}`)}
          />
        )}
        {view === 'recipe' && routeParam && (
          <RecipePage
            url={routeParam}
            onBack={() => window.history.back()}
          />
        )}
        {view === 'fridge' && isSignedIn && <MyFridge />}
        {view === 'saved' && isSignedIn && <SavedRecipes />}
      </main>

      {showAuthModal && (
        <div className="auth-overlay" onClick={() => setShowAuthModal(false)}>
          <div className="auth-modal" onClick={e => e.stopPropagation()}>
            <button className="auth-close" onClick={() => setShowAuthModal(false)}>✕</button>
            <h2>{authMode === 'login' ? 'Sign In' : 'Create Account'}</h2>
            {authError && <p className="auth-error">{authError}</p>}
            <form onSubmit={e => { e.preventDefault(); handleAuthSubmit() }}>
              {authMode === 'register' && (
                <input
                  type="text"
                  placeholder="Name"
                  value={authName}
                  onChange={e => setAuthName(e.target.value)}
                  required
                />
              )}
              <input
                type="email"
                placeholder="Email"
                value={authEmail}
                onChange={e => setAuthEmail(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={authPassword}
                onChange={e => setAuthPassword(e.target.value)}
                required
              />
              <button type="submit" className="auth-submit" disabled={authLoading}>
                {authLoading ? 'Please wait…' : authMode === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            </form>
            <p className="auth-switch">
              {authMode === 'login' ? (
                <>Don't have an account? <button onClick={() => { setAuthMode('register'); setAuthError('') }}>Sign Up</button></>
              ) : (
                <>Already have an account? <button onClick={() => { setAuthMode('login'); setAuthError('') }}>Sign In</button></>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default App