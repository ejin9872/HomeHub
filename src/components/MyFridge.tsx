import { useState, useRef, useEffect, useCallback } from 'react'
import { fetchFridgeItems, saveFridgeItems } from '../fridgeApi'
import './MyFridge.css'

export interface FridgeItem {
  id: string
  name: string
  quantity: string
  category: string
}

export const CATEGORIES = [
  { value: 'produce', emoji: '🥬', label: 'Produce' },
  { value: 'dairy', emoji: '🥛', label: 'Dairy' },
  { value: 'meat', emoji: '🥩', label: 'Meat' },
  { value: 'pantry', emoji: '🥫', label: 'Pantry' },
  { value: 'frozen', emoji: '❄️', label: 'Frozen' },
  { value: 'spices', emoji: '🌿', label: 'Spices' },
  { value: 'grains', emoji: '🌾', label: 'Grains' },
  { value: 'other', emoji: '📦', label: 'Other' },
]

export const UNITS = [
  { value: '', label: '—' },
  { value: 'cup', label: 'cup' },
  { value: 'tbsp', label: 'tbsp' },
  { value: 'tsp', label: 'tsp' },
  { value: 'oz', label: 'oz' },
  { value: 'fl oz', label: 'fl oz' },
  { value: 'lb', label: 'lb' },
  { value: 'g', label: 'g' },
  { value: 'kg', label: 'kg' },
  { value: 'ml', label: 'ml' },
  { value: 'liter', label: 'liter' },
  { value: 'pint', label: 'pint' },
  { value: 'quart', label: 'quart' },
  { value: 'gallon', label: 'gallon' },
  { value: 'piece', label: 'piece' },
  { value: 'slice', label: 'slice' },
  { value: 'dozen', label: 'dozen' },
  { value: 'bunch', label: 'bunch' },
  { value: 'head', label: 'head' },
  { value: 'clove', label: 'clove' },
  { value: 'stick', label: 'stick' },
  { value: 'loaf', label: 'loaf' },
  { value: 'can', label: 'can' },
  { value: 'jar', label: 'jar' },
  { value: 'bottle', label: 'bottle' },
  { value: 'bag', label: 'bag' },
  { value: 'box', label: 'box' },
  { value: 'package', label: 'package' },
]

export interface Ingredient { name: string; category: string }

export const COMMON_INGREDIENTS: Ingredient[] = [
  // Produce
  { name: 'Avocado', category: 'produce' },
  { name: 'Banana', category: 'produce' },
  { name: 'Bell pepper', category: 'produce' },
  { name: 'Blueberries', category: 'produce' },
  { name: 'Broccoli', category: 'produce' },
  { name: 'Cabbage', category: 'produce' },
  { name: 'Carrot', category: 'produce' },
  { name: 'Cauliflower', category: 'produce' },
  { name: 'Celery', category: 'produce' },
  { name: 'Cherry tomatoes', category: 'produce' },
  { name: 'Corn', category: 'produce' },
  { name: 'Cucumber', category: 'produce' },
  { name: 'Eggplant', category: 'produce' },
  { name: 'Garlic', category: 'produce' },
  { name: 'Ginger', category: 'produce' },
  { name: 'Green beans', category: 'produce' },
  { name: 'Green onion', category: 'produce' },
  { name: 'Jalapeño', category: 'produce' },
  { name: 'Kale', category: 'produce' },
  { name: 'Lemon', category: 'produce' },
  { name: 'Lettuce', category: 'produce' },
  { name: 'Lime', category: 'produce' },
  { name: 'Mango', category: 'produce' },
  { name: 'Mushrooms', category: 'produce' },
  { name: 'Onion', category: 'produce' },
  { name: 'Orange', category: 'produce' },
  { name: 'Peas', category: 'produce' },
  { name: 'Potato', category: 'produce' },
  { name: 'Spinach', category: 'produce' },
  { name: 'Strawberries', category: 'produce' },
  { name: 'Sweet potato', category: 'produce' },
  { name: 'Tomato', category: 'produce' },
  { name: 'Zucchini', category: 'produce' },
  // Dairy
  { name: 'Butter', category: 'dairy' },
  { name: 'Cheddar cheese', category: 'dairy' },
  { name: 'Cottage cheese', category: 'dairy' },
  { name: 'Cream cheese', category: 'dairy' },
  { name: 'Eggs', category: 'dairy' },
  { name: 'Feta cheese', category: 'dairy' },
  { name: 'Greek yogurt', category: 'dairy' },
  { name: 'Heavy cream', category: 'dairy' },
  { name: 'Milk', category: 'dairy' },
  { name: 'Mozzarella', category: 'dairy' },
  { name: 'Parmesan', category: 'dairy' },
  { name: 'Sour cream', category: 'dairy' },
  { name: 'Whipped cream', category: 'dairy' },
  { name: 'Yogurt', category: 'dairy' },
  // Meat
  { name: 'Bacon', category: 'meat' },
  { name: 'Chicken breast', category: 'meat' },
  { name: 'Chicken thighs', category: 'meat' },
  { name: 'Ground beef', category: 'meat' },
  { name: 'Ground turkey', category: 'meat' },
  { name: 'Ham', category: 'meat' },
  { name: 'Hot dogs', category: 'meat' },
  { name: 'Italian sausage', category: 'meat' },
  { name: 'Lamb chops', category: 'meat' },
  { name: 'Pork chops', category: 'meat' },
  { name: 'Pork tenderloin', category: 'meat' },
  { name: 'Salmon', category: 'meat' },
  { name: 'Sausage', category: 'meat' },
  { name: 'Shrimp', category: 'meat' },
  { name: 'Steak', category: 'meat' },
  { name: 'Tuna', category: 'meat' },
  { name: 'Turkey', category: 'meat' },
  // Pantry
  { name: 'Baking powder', category: 'pantry' },
  { name: 'Baking soda', category: 'pantry' },
  { name: 'Black beans', category: 'pantry' },
  { name: 'Brown sugar', category: 'pantry' },
  { name: 'Canned tomatoes', category: 'pantry' },
  { name: 'Chickpeas', category: 'pantry' },
  { name: 'Chocolate chips', category: 'pantry' },
  { name: 'Coconut milk', category: 'pantry' },
  { name: 'Cornstarch', category: 'pantry' },
  { name: 'Flour', category: 'pantry' },
  { name: 'Granulated sugar', category: 'pantry' },
  { name: 'Honey', category: 'pantry' },
  { name: 'Hot sauce', category: 'pantry' },
  { name: 'Ketchup', category: 'pantry' },
  { name: 'Kidney beans', category: 'pantry' },
  { name: 'Maple syrup', category: 'pantry' },
  { name: 'Mayonnaise', category: 'pantry' },
  { name: 'Mustard', category: 'pantry' },
  { name: 'Olive oil', category: 'pantry' },
  { name: 'Peanut butter', category: 'pantry' },
  { name: 'Salsa', category: 'pantry' },
  { name: 'Soy sauce', category: 'pantry' },
  { name: 'Sriracha', category: 'pantry' },
  { name: 'Tomato paste', category: 'pantry' },
  { name: 'Tomato sauce', category: 'pantry' },
  { name: 'Vanilla extract', category: 'pantry' },
  { name: 'Vegetable oil', category: 'pantry' },
  { name: 'Vinegar', category: 'pantry' },
  { name: 'Worcestershire sauce', category: 'pantry' },
  // Frozen
  { name: 'Frozen berries', category: 'frozen' },
  { name: 'Frozen broccoli', category: 'frozen' },
  { name: 'Frozen corn', category: 'frozen' },
  { name: 'Frozen peas', category: 'frozen' },
  { name: 'Frozen pizza', category: 'frozen' },
  { name: 'Frozen shrimp', category: 'frozen' },
  { name: 'Frozen spinach', category: 'frozen' },
  { name: 'Ice cream', category: 'frozen' },
  // Spices
  { name: 'Basil', category: 'spices' },
  { name: 'Bay leaves', category: 'spices' },
  { name: 'Black pepper', category: 'spices' },
  { name: 'Cayenne pepper', category: 'spices' },
  { name: 'Chili flakes', category: 'spices' },
  { name: 'Chili powder', category: 'spices' },
  { name: 'Cilantro', category: 'spices' },
  { name: 'Cinnamon', category: 'spices' },
  { name: 'Cumin', category: 'spices' },
  { name: 'Dill', category: 'spices' },
  { name: 'Garlic powder', category: 'spices' },
  { name: 'Italian seasoning', category: 'spices' },
  { name: 'Nutmeg', category: 'spices' },
  { name: 'Onion powder', category: 'spices' },
  { name: 'Oregano', category: 'spices' },
  { name: 'Paprika', category: 'spices' },
  { name: 'Parsley', category: 'spices' },
  { name: 'Rosemary', category: 'spices' },
  { name: 'Salt', category: 'spices' },
  { name: 'Smoked paprika', category: 'spices' },
  { name: 'Thyme', category: 'spices' },
  { name: 'Turmeric', category: 'spices' },
  // Grains
  { name: 'Bagels', category: 'grains' },
  { name: 'Bread', category: 'grains' },
  { name: 'Brown rice', category: 'grains' },
  { name: 'Couscous', category: 'grains' },
  { name: 'Elbow macaroni', category: 'grains' },
  { name: 'Fettuccine', category: 'grains' },
  { name: 'Granola', category: 'grains' },
  { name: 'Oats', category: 'grains' },
  { name: 'Penne', category: 'grains' },
  { name: 'Quinoa', category: 'grains' },
  { name: 'Ramen noodles', category: 'grains' },
  { name: 'Spaghetti', category: 'grains' },
  { name: 'Tortillas', category: 'grains' },
  { name: 'White rice', category: 'grains' },
  // Other
  { name: 'Almonds', category: 'other' },
  { name: 'Almond milk', category: 'other' },
  { name: 'Cashews', category: 'other' },
  { name: 'Chia seeds', category: 'other' },
  { name: 'Coconut oil', category: 'other' },
  { name: 'Coffee', category: 'other' },
  { name: 'Oat milk', category: 'other' },
  { name: 'Peanuts', category: 'other' },
  { name: 'Pecans', category: 'other' },
  { name: 'Sesame oil', category: 'other' },
  { name: 'Tofu', category: 'other' },
  { name: 'Walnuts', category: 'other' },
]

function MyFridge() {
  const [items, setItems] = useState<FridgeItem[]>([])
  const [loaded, setLoaded] = useState(false)
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0].value)

  // Load fridge from server on mount
  useEffect(() => {
    fetchFridgeItems().then(data => {
      setItems(data)
      setLoaded(true)
    })
  }, [])

  // Sync to server whenever items change (after initial load)
  useEffect(() => {
    if (loaded) {
      saveFridgeItems(items)
    }
  }, [items, loaded])

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<Ingredient[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(-1)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  const updateSuggestions = useCallback((value: string) => {
    const q = value.toLowerCase().trim()
    if (!q) { setSuggestions([]); setShowSuggestions(false); return }
    const matches = COMMON_INGREDIENTS.filter(i =>
      i.name.toLowerCase().includes(q)
    ).slice(0, 8)
    setSuggestions(matches)
    setShowSuggestions(matches.length > 0)
    setHighlightIdx(-1)
  }, [])

  const selectSuggestion = useCallback((ingredient: Ingredient) => {
    setName(ingredient.name)
    setCategory(ingredient.category)
    setSuggestions([])
    setShowSuggestions(false)
    setHighlightIdx(-1)
  }, [])

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
        nameInputRef.current && !nameInputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleNameChange = (value: string) => {
    setName(value)
    updateSuggestions(value)
  }

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') addItem()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIdx(prev => (prev + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIdx(prev => (prev <= 0 ? suggestions.length - 1 : prev - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlightIdx >= 0) {
        selectSuggestion(suggestions[highlightIdx])
      } else {
        setShowSuggestions(false)
        addItem()
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  const formatQuantity = () => {
    const q = quantity.trim()
    const u = unit
    if (!q && !u) return ''
    if (!q && u) return u
    if (q && !u) return q
    return `${q} ${u}`
  }

  const addItem = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    if (items.some(i => i.name.toLowerCase() === trimmed.toLowerCase())) return
    setItems(prev => [...prev, {
      id: Date.now().toString(),
      name: trimmed,
      quantity: formatQuantity(),
      category,
    }])
    setName('')
    setQuantity('')
    setUnit('')
    setSuggestions([])
    setShowSuggestions(false)
    nameInputRef.current?.focus()
  }

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const clearAll = () => setItems([])

  const grouped = CATEGORIES.reduce((acc, cat) => {
    const catItems = items.filter(i => i.category === cat.value)
    if (catItems.length > 0) acc.push({ ...cat, items: catItems })
    return acc
  }, [] as (typeof CATEGORIES[number] & { items: FridgeItem[] })[])

  return (
    <div className="fridge">
      <div className="fridge-form">
        <div className="fridge-inputs">
          <div className="fridge-name-wrap">
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              onKeyDown={handleNameKeyDown}
              onFocus={() => { if (name.trim()) updateSuggestions(name) }}
              placeholder="Ingredient name"
              className="fridge-name-input"
              autoComplete="off"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="fridge-suggestions" ref={suggestionsRef}>
                {suggestions.map((s, i) => {
                  const catInfo = CATEGORIES.find(c => c.value === s.category)
                  return (
                    <button
                      key={s.name}
                      className={`fridge-suggestion ${i === highlightIdx ? 'highlighted' : ''}`}
                      onMouseDown={e => { e.preventDefault(); selectSuggestion(s) }}
                      onMouseEnter={() => setHighlightIdx(i)}
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
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            placeholder="Qty"
            className="fridge-qty-input"
          />
          <select
            value={unit}
            onChange={e => setUnit(e.target.value)}
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
              className={`fridge-cat ${category === cat.value ? 'active' : ''}`}
              onClick={() => setCategory(cat.value)}
              title={cat.label}
            >
              <span className="fridge-cat-emoji">{cat.emoji}</span>
              <span className="fridge-cat-label">{cat.label}</span>
            </button>
          ))}
        </div>

        <button className="fridge-add-btn" onClick={addItem}>Add to Fridge</button>
      </div>

      {items.length === 0 ? (
        <div className="fridge-empty">
          Your fridge is empty! Add ingredients above to get started. 🧊
        </div>
      ) : (
        <>
          {grouped.map(group => (
            <div key={group.value} className="fridge-group">
              <h3 className="fridge-group-title">{group.emoji} {group.label}</h3>
              <div className="fridge-group-items">
                {group.items.map(item => (
                  <div key={item.id} className="fridge-item">
                    <span className="fridge-item-name">{item.name}</span>
                    {item.quantity && <span className="fridge-item-qty">{item.quantity}</span>}
                    <button className="fridge-item-delete" onClick={() => deleteItem(item.id)}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="fridge-footer">
            <span>{items.length} ingredient{items.length !== 1 ? 's' : ''} in your fridge</span>
            <button className="fridge-clear" onClick={clearAll}>Clear all</button>
          </div>
        </>
      )}
    </div>
  )
}

export default MyFridge
