import { useState, useEffect, useRef, useCallback } from 'react'
import { CATEGORIES, UNITS, COMMON_INGREDIENTS } from './MyFridge'
import type { Ingredient } from './MyFridge'
import './AdminPanel.css'
import './MyFridge.css'

interface AdminUser {
  id: string
  name: string
  email: string
  provider: string
  createdAt: string
}

interface RecipeSource {
  id: string
  title: string
  url: string
  enabled: boolean
  estimatedPercent: number
}

interface FridgeItem {
  id: string
  name: string
  quantity: string
  category: string
}

type AdminTab = 'users' | 'sources' | 'fridge'

function AdminPanel() {
  const [tab, setTab] = useState<AdminTab>('users')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [sources, setSources] = useState<RecipeSource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')

  // Recipe source form state
  const [showSourceForm, setShowSourceForm] = useState(false)
  const [editingSource, setEditingSource] = useState<RecipeSource | null>(null)
  const [sourceTitle, setSourceTitle] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [sourcePercent, setSourcePercent] = useState('')

  // Fridge management state
  const [fridgeUserId, setFridgeUserId] = useState('')
  const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>([])
  const [fridgeLoading, setFridgeLoading] = useState(false)
  const [fridgeName, setFridgeName] = useState('')
  const [fridgeQty, setFridgeQty] = useState('')
  const [fridgeUnit, setFridgeUnit] = useState('')
  const [fridgeCategory, setFridgeCategory] = useState(CATEGORIES[0].value)

  // Fridge autocomplete state
  const [fridgeSuggestions, setFridgeSuggestions] = useState<Ingredient[]>([])
  const [showFridgeSuggestions, setShowFridgeSuggestions] = useState(false)
  const [fridgeHighlightIdx, setFridgeHighlightIdx] = useState(-1)
  const fridgeNameRef = useRef<HTMLInputElement>(null)
  const fridgeSuggestionsRef = useRef<HTMLDivElement>(null)

  useEffect(() => { fetchUsers(); fetchSources() }, [])

  const fetchUsers = async () => {
    try {
      const r = await fetch('/api/admin/users')
      if (!r.ok) throw new Error('Failed to fetch')
      setUsers(await r.json())
      setError(null)
    } catch {
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const fetchSources = async () => {
    try {
      const r = await fetch('/api/admin/recipe-sources')
      if (!r.ok) throw new Error('Failed to fetch')
      setSources(await r.json())
    } catch {
      setError('Failed to load recipe sources')
    }
  }

  // --- User form handlers ---

  const openCreateForm = () => {
    setEditingUser(null)
    setFormName('')
    setFormEmail('')
    setFormPassword('')
    setShowForm(true)
    setError(null)
  }

  const openEditForm = (user: AdminUser) => {
    setEditingUser(user)
    setFormName(user.name)
    setFormEmail(user.email)
    setFormPassword('')
    setShowForm(true)
    setError(null)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingUser(null)
    setError(null)
  }

  const handleSave = async () => {
    if (!formName.trim() || !formEmail.trim()) {
      setError('Name and email are required')
      return
    }

    try {
      if (editingUser) {
        const body: Record<string, string> = { name: formName.trim(), email: formEmail.trim() }
        if (formPassword) body.password = formPassword
        const r = await fetch(`/api/admin/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!r.ok) { const d = await r.json(); throw new Error(d.error) }
      } else {
        if (!formPassword || formPassword.length < 6) {
          setError('Password must be at least 6 characters')
          return
        }
        const r = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formName.trim(), email: formEmail.trim(), password: formPassword }),
        })
        if (!r.ok) { const d = await r.json(); throw new Error(d.error) }
      }
      closeForm()
      await fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed')
    }
  }

  const handleDelete = async (user: AdminUser) => {
    if (!confirm(`Delete user "${user.name}" (${user.email})?`)) return
    try {
      const r = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' })
      if (!r.ok) throw new Error('Failed to delete')
      await fetchUsers()
    } catch {
      setError('Failed to delete user')
    }
  }

  // --- Recipe source handlers ---

  const openSourceForm = (source?: RecipeSource) => {
    if (source) {
      setEditingSource(source)
      setSourceTitle(source.title)
      setSourceUrl(source.url)
      setSourcePercent(String(source.estimatedPercent))
    } else {
      setEditingSource(null)
      setSourceTitle('')
      setSourceUrl('')
      setSourcePercent('')
    }
    setShowSourceForm(true)
    setError(null)
  }

  const closeSourceForm = () => {
    setShowSourceForm(false)
    setEditingSource(null)
    setError(null)
  }

  const handleSaveSource = async () => {
    if (!sourceTitle.trim() || !sourceUrl.trim()) {
      setError('Title and URL are required')
      return
    }

    try {
      const body = {
        title: sourceTitle.trim(),
        url: sourceUrl.trim(),
        enabled: editingSource ? editingSource.enabled : true,
        estimatedPercent: parseInt(sourcePercent) || 0,
      }

      if (editingSource) {
        const r = await fetch(`/api/admin/recipe-sources/${editingSource.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!r.ok) { const d = await r.json(); throw new Error(d.error) }
      } else {
        const r = await fetch('/api/admin/recipe-sources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!r.ok) { const d = await r.json(); throw new Error(d.error) }
      }

      closeSourceForm()
      await fetchSources()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed')
    }
  }

  const handleToggleSource = async (source: RecipeSource) => {
    try {
      const r = await fetch(`/api/admin/recipe-sources/${source.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !source.enabled }),
      })
      if (!r.ok) throw new Error('Failed to update')
      await fetchSources()
    } catch {
      setError('Failed to toggle source')
    }
  }

  const handleDeleteSource = async (source: RecipeSource) => {
    if (!confirm(`Remove "${source.title}" from recipe sources?`)) return
    try {
      const r = await fetch(`/api/admin/recipe-sources/${source.id}`, { method: 'DELETE' })
      if (!r.ok) throw new Error('Failed to delete')
      await fetchSources()
    } catch {
      setError('Failed to delete source')
    }
  }

  // --- Fridge handlers ---

  const updateFridgeSuggestions = useCallback((value: string) => {
    const q = value.toLowerCase().trim()
    if (!q) { setFridgeSuggestions([]); setShowFridgeSuggestions(false); return }
    const matches = COMMON_INGREDIENTS.filter(i =>
      i.name.toLowerCase().includes(q)
    ).slice(0, 8)
    setFridgeSuggestions(matches)
    setShowFridgeSuggestions(matches.length > 0)
    setFridgeHighlightIdx(-1)
  }, [])

  const selectFridgeSuggestion = useCallback((ingredient: Ingredient) => {
    setFridgeName(ingredient.name)
    setFridgeCategory(ingredient.category)
    setFridgeSuggestions([])
    setShowFridgeSuggestions(false)
    setFridgeHighlightIdx(-1)
  }, [])

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        fridgeSuggestionsRef.current && !fridgeSuggestionsRef.current.contains(e.target as Node) &&
        fridgeNameRef.current && !fridgeNameRef.current.contains(e.target as Node)
      ) {
        setShowFridgeSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleFridgeNameChange = (value: string) => {
    setFridgeName(value)
    updateFridgeSuggestions(value)
  }

  const handleFridgeNameKeyDown = (e: React.KeyboardEvent) => {
    if (!showFridgeSuggestions || fridgeSuggestions.length === 0) {
      if (e.key === 'Enter') handleAddFridgeItem()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFridgeHighlightIdx(prev => (prev + 1) % fridgeSuggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFridgeHighlightIdx(prev => (prev <= 0 ? fridgeSuggestions.length - 1 : prev - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (fridgeHighlightIdx >= 0) {
        selectFridgeSuggestion(fridgeSuggestions[fridgeHighlightIdx])
      } else {
        setShowFridgeSuggestions(false)
        handleAddFridgeItem()
      }
    } else if (e.key === 'Escape') {
      setShowFridgeSuggestions(false)
    }
  }

  const fetchUserFridge = async (userId: string) => {
    if (!userId) { setFridgeItems([]); return }
    setFridgeLoading(true)
    try {
      const r = await fetch(`/api/admin/fridge/${userId}`)
      if (!r.ok) throw new Error('Failed to fetch')
      setFridgeItems(await r.json())
      setError(null)
    } catch {
      setError('Failed to load fridge items')
      setFridgeItems([])
    } finally {
      setFridgeLoading(false)
    }
  }

  const saveUserFridge = async (userId: string, items: FridgeItem[]) => {
    try {
      const r = await fetch(`/api/admin/fridge/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(items),
      })
      if (!r.ok) throw new Error('Failed to save')
      setFridgeItems(items)
    } catch {
      setError('Failed to save fridge items')
    }
  }

  const handleSelectFridgeUser = (userId: string) => {
    setFridgeUserId(userId)
    fetchUserFridge(userId)
  }

  const formatFridgeQty = () => {
    const q = fridgeQty.trim()
    const u = fridgeUnit
    if (!q && !u) return ''
    if (!q && u) return u
    if (q && !u) return q
    return `${q} ${u}`
  }

  const handleAddFridgeItem = async () => {
    const trimmed = fridgeName.trim()
    if (!trimmed || !fridgeUserId) return
    if (fridgeItems.some(i => i.name.toLowerCase() === trimmed.toLowerCase())) {
      setError('Item already in fridge')
      return
    }
    const newItem: FridgeItem = {
      id: Date.now().toString(),
      name: trimmed,
      quantity: formatFridgeQty(),
      category: fridgeCategory,
    }
    await saveUserFridge(fridgeUserId, [...fridgeItems, newItem])
    setFridgeName('')
    setFridgeQty('')
    setFridgeUnit('')
    setFridgeSuggestions([])
    setShowFridgeSuggestions(false)
    fridgeNameRef.current?.focus()
  }

  const handleDeleteFridgeItem = async (id: string) => {
    if (!fridgeUserId) return
    await saveUserFridge(fridgeUserId, fridgeItems.filter(i => i.id !== id))
  }

  const enabledSources = sources.filter(s => s.enabled)
  const totalPercent = enabledSources.reduce((sum, s) => sum + s.estimatedPercent, 0)

  return (
    <div className="admin">
      <header className="admin-header">
        <div>
          <h1>🔧 HomeHub Admin</h1>
          <p>{tab === 'users' ? 'User Management' : tab === 'sources' ? 'Recipe Source Configuration' : 'Fridge Management'}</p>
        </div>
        <a href="/" className="admin-back">← Back to HomeHub</a>
      </header>

      <div className="admin-tabs">
        <button
          className={`admin-tab ${tab === 'users' ? 'active' : ''}`}
          onClick={() => { setTab('users'); setError(null) }}
        >
          👤 Users
        </button>
        <button
          className={`admin-tab ${tab === 'sources' ? 'active' : ''}`}
          onClick={() => { setTab('sources'); setError(null) }}
        >
          🌐 Recipe Sources
        </button>
        <button
          className={`admin-tab ${tab === 'fridge' ? 'active' : ''}`}
          onClick={() => { setTab('fridge'); setError(null) }}
        >
          🧊 Fridge
        </button>
      </div>

      {error && <div className="admin-error">{error}</div>}

      {tab === 'users' && (
        <div className="admin-card">
          <div className="admin-toolbar">
            <h2>Users ({users.length})</h2>
            <button className="admin-add-btn" onClick={openCreateForm}>+ Add User</button>
          </div>

          {loading ? (
            <p className="admin-loading">Loading users…</p>
          ) : users.length === 0 ? (
            <p className="admin-empty">No users yet. Create one to get started.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Provider</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td className="admin-name">{u.name}</td>
                      <td>{u.email}</td>
                      <td><span className={`admin-badge ${u.provider}`}>{u.provider}</span></td>
                      <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="admin-actions">
                        <button className="admin-edit-btn" onClick={() => openEditForm(u)} title="Edit">✏️</button>
                        <button className="admin-delete-btn" onClick={() => handleDelete(u)} title="Delete">🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'sources' && (
        <div className="admin-card">
          <div className="admin-toolbar">
            <div>
              <h2>Recipe Sources ({sources.length})</h2>
              <p className="admin-toolbar-sub">
                {enabledSources.length} active · ~{totalPercent}% coverage
              </p>
            </div>
            <button className="admin-add-btn" onClick={() => openSourceForm()}>+ Add Source</button>
          </div>

          {sources.length === 0 ? (
            <p className="admin-empty">No recipe sources configured. Add one to get started.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Domain</th>
                    <th>Est. %</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.map(s => (
                    <tr key={s.id} className={!s.enabled ? 'admin-row-disabled' : ''}>
                      <td className="admin-name">{s.title}</td>
                      <td className="admin-domain">{s.url}</td>
                      <td>
                        <span className="admin-percent">{s.estimatedPercent}%</span>
                      </td>
                      <td>
                        <button
                          className={`admin-toggle ${s.enabled ? 'on' : 'off'}`}
                          onClick={() => handleToggleSource(s)}
                          title={s.enabled ? 'Disable' : 'Enable'}
                        >
                          <span className="admin-toggle-track">
                            <span className="admin-toggle-thumb" />
                          </span>
                          <span className="admin-toggle-label">{s.enabled ? 'On' : 'Off'}</span>
                        </button>
                      </td>
                      <td className="admin-actions">
                        <button className="admin-edit-btn" onClick={() => openSourceForm(s)} title="Edit">✏️</button>
                        <button className="admin-delete-btn" onClick={() => handleDeleteSource(s)} title="Remove">🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'fridge' && (
        <div className="admin-card">
          <div className="admin-toolbar">
            <h2>Manage User Fridge</h2>
          </div>
          <div className="admin-field">
            <label>Select User</label>
            <select
              value={fridgeUserId}
              onChange={e => handleSelectFridgeUser(e.target.value)}
              className="admin-fridge-select"
            >
              <option value="">— Choose a user —</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
              ))}
            </select>
          </div>

          {fridgeUserId && (
            <>
              <div className="fridge-form" style={{ marginTop: 16 }}>
                <div className="fridge-inputs">
                  <div className="fridge-name-wrap">
                    <input
                      ref={fridgeNameRef}
                      type="text"
                      value={fridgeName}
                      onChange={e => handleFridgeNameChange(e.target.value)}
                      onKeyDown={handleFridgeNameKeyDown}
                      onFocus={() => { if (fridgeName.trim()) updateFridgeSuggestions(fridgeName) }}
                      placeholder="Ingredient name"
                      className="fridge-name-input"
                      autoComplete="off"
                    />
                    {showFridgeSuggestions && fridgeSuggestions.length > 0 && (
                      <div className="fridge-suggestions" ref={fridgeSuggestionsRef}>
                        {fridgeSuggestions.map((s, i) => {
                          const catInfo = CATEGORIES.find(c => c.value === s.category)
                          return (
                            <button
                              key={s.name}
                              className={`fridge-suggestion ${i === fridgeHighlightIdx ? 'highlighted' : ''}`}
                              onMouseDown={e => { e.preventDefault(); selectFridgeSuggestion(s) }}
                              onMouseEnter={() => setFridgeHighlightIdx(i)}
                            >
                              <span className="fridge-suggestion-name">{s.name}</span>
                              <span className="fridge-suggestion-cat">{catInfo?.emoji} {catInfo?.label}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    value={fridgeQty}
                    onChange={e => setFridgeQty(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddFridgeItem()}
                    placeholder="Qty"
                    className="fridge-qty-input"
                  />
                  <select
                    value={fridgeUnit}
                    onChange={e => setFridgeUnit(e.target.value)}
                    className="fridge-unit-select"
                  >
                    {UNITS.map(u => (
                      <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                  </select>
                </div>

                <div className="fridge-categories">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.value}
                      className={`fridge-cat ${fridgeCategory === cat.value ? 'active' : ''}`}
                      onClick={() => setFridgeCategory(cat.value)}
                      title={cat.label}
                    >
                      <span className="fridge-cat-emoji">{cat.emoji}</span>
                      <span className="fridge-cat-label">{cat.label}</span>
                    </button>
                  ))}
                </div>

                <button className="fridge-add-btn" onClick={handleAddFridgeItem}>Add to Fridge</button>
              </div>

              {fridgeLoading ? (
                <p className="admin-loading">Loading fridge…</p>
              ) : fridgeItems.length === 0 ? (
                <p className="admin-empty">No items in this user's fridge.</p>
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Quantity</th>
                        <th>Category</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fridgeItems.map(item => {
                        const catInfo = CATEGORIES.find(c => c.value === item.category)
                        return (
                          <tr key={item.id}>
                            <td className="admin-name">{item.name}</td>
                            <td>{item.quantity || '—'}</td>
                            <td><span className="admin-badge">{catInfo ? `${catInfo.emoji} ${catInfo.label}` : item.category}</span></td>
                            <td className="admin-actions">
                              <button className="admin-delete-btn" onClick={() => handleDeleteFridgeItem(item.id)} title="Remove">🗑️</button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {showForm && (
        <div className="admin-form-overlay" onClick={closeForm}>
          <div className="admin-form" onClick={e => e.stopPropagation()}>
            <h3>{editingUser ? 'Edit User' : 'Create User'}</h3>
            <div className="admin-field">
              <label>Name</label>
              <input
                type="text"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="Full name"
                autoFocus
              />
            </div>
            <div className="admin-field">
              <label>Email</label>
              <input
                type="email"
                value={formEmail}
                onChange={e => setFormEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div className="admin-field">
              <label>{editingUser ? 'New Password (leave blank to keep)' : 'Password'}</label>
              <input
                type="password"
                value={formPassword}
                onChange={e => setFormPassword(e.target.value)}
                placeholder={editingUser ? 'Leave blank to keep current' : 'At least 6 characters'}
              />
            </div>
            <div className="admin-form-actions">
              <button className="admin-cancel-btn" onClick={closeForm}>Cancel</button>
              <button className="admin-save-btn" onClick={handleSave}>
                {editingUser ? 'Save Changes' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSourceForm && (
        <div className="admin-form-overlay" onClick={closeSourceForm}>
          <div className="admin-form" onClick={e => e.stopPropagation()}>
            <h3>{editingSource ? 'Edit Recipe Source' : 'Add Recipe Source'}</h3>
            <div className="admin-field">
              <label>Title</label>
              <input
                type="text"
                value={sourceTitle}
                onChange={e => setSourceTitle(e.target.value)}
                placeholder="e.g. Taste of Home"
                autoFocus
              />
            </div>
            <div className="admin-field">
              <label>Domain / URL</label>
              <input
                type="text"
                value={sourceUrl}
                onChange={e => setSourceUrl(e.target.value)}
                placeholder="e.g. tasteofhome.com/recipes"
              />
            </div>
            <div className="admin-field">
              <label>Estimated % of Recipes</label>
              <input
                type="number"
                min="0"
                max="100"
                value={sourcePercent}
                onChange={e => setSourcePercent(e.target.value)}
                placeholder="0–100"
              />
            </div>
            <div className="admin-form-actions">
              <button className="admin-cancel-btn" onClick={closeSourceForm}>Cancel</button>
              <button className="admin-save-btn" onClick={handleSaveSource}>
                {editingSource ? 'Save Changes' : 'Add Source'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPanel
