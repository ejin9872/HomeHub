import { useState } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import './ShoppingList.css'

interface ShoppingItem {
  id: string
  name: string
  quantity: string
  category: string
  checked: boolean
}

const CATEGORIES = [
  { value: '🥬 Produce', emoji: '🥬', label: 'Produce' },
  { value: '🥛 Dairy', emoji: '🥛', label: 'Dairy' },
  { value: '🥩 Meat', emoji: '🥩', label: 'Meat' },
  { value: '🍞 Bakery', emoji: '🍞', label: 'Bakery' },
  { value: '🥫 Pantry', emoji: '🥫', label: 'Pantry' },
  { value: '❄️ Frozen', emoji: '❄️', label: 'Frozen' },
  { value: '🥤 Drinks', emoji: '🥤', label: 'Drinks' },
  { value: '🧹 Household', emoji: '🧹', label: 'Home' },
  { value: '💄 Beauty', emoji: '💄', label: 'Beauty' },
  { value: '💊 Health', emoji: '💊', label: 'Health' },
  { value: '💻 Tech', emoji: '💻', label: 'Tech' },
  { value: '🔨 Projects', emoji: '🔨', label: 'Projects' },
  { value: '👶 Baby', emoji: '👶', label: 'Baby' },
  { value: '🐾 Pets', emoji: '🐾', label: 'Pets' },
  { value: '📦 Other', emoji: '📦', label: 'Other' },
]

function ShoppingList() {
  const [items, setItems] = useLocalStorage<ShoppingItem[]>('homehub-shopping', [])
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0].value)
  const [addToTodo, setAddToTodo] = useState(false)
  const [todoTitle, setTodoTitle] = useState('')

  const handleNameChange = (val: string) => {
    setName(val)
    if (addToTodo && (todoTitle === '' || todoTitle === `Purchase ${name.trim()}`)) {
      setTodoTitle(`Purchase ${val.trim()}`)
    }
  }

  const handleAddToTodoChange = (checked: boolean) => {
    setAddToTodo(checked)
    if (checked && !todoTitle) {
      setTodoTitle(`Purchase ${name.trim()}`)
    }
  }

  const addItem = () => {
    if (!name.trim()) return
    setItems(prev => [...prev, {
      id: Date.now().toString(),
      name: name.trim(),
      quantity: quantity.trim(),
      category,
      checked: false,
    }])

    if (addToTodo) {
      const title = todoTitle.trim() || `Purchase ${name.trim()}`
      try {
        const todos = JSON.parse(localStorage.getItem('homehub-todos') || '[]')
        todos.push({
          id: (Date.now() + 1).toString(),
          text: title,
          completed: false,
          createdAt: Date.now(),
          urgency: 'low',
          repeat: 'none',
          addToCalendar: false,
        })
        localStorage.setItem('homehub-todos', JSON.stringify(todos))
      } catch { /* ignore */ }
    }

    setName('')
    setQuantity('')
    setAddToTodo(false)
    setTodoTitle('')
  }

  const toggleItem = (id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i))
  }

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const clearChecked = () => {
    setItems(prev => prev.filter(i => !i.checked))
  }

  const allCatValues = CATEGORIES.map(c => c.value)
  const grouped = allCatValues.reduce((acc, catVal) => {
    const catItems = items.filter(i => i.category === catVal)
    if (catItems.length > 0) acc[catVal] = catItems
    return acc
  }, {} as Record<string, ShoppingItem[]>)

  const checkedCount = items.filter(i => i.checked).length

  return (
    <div className="shopping">
      <div className="shopping-form">
        <div className="shopping-inputs">
          <input
            type="text"
            value={name}
            onChange={e => handleNameChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            placeholder="Item name"
            className="shopping-name-input"
          />
          <input
            type="text"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            placeholder="Qty"
            className="shopping-qty-input"
          />
        </div>

        <div className="shopping-categories">
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              className={`cat-circle ${category === cat.value ? 'active' : ''}`}
              onClick={() => setCategory(cat.value)}
              title={cat.label}
            >
              <span className="cat-circle-emoji">{cat.emoji}</span>
              <span className="cat-circle-label">{cat.label}</span>
            </button>
          ))}
        </div>

        <div className="shopping-extras">
          <label className="shopping-todo-check">
            <input
              type="checkbox"
              checked={addToTodo}
              onChange={e => handleAddToTodoChange(e.target.checked)}
            />
            <span>Add to to-do</span>
          </label>
          {addToTodo && (
            <input
              type="text"
              value={todoTitle}
              onChange={e => setTodoTitle(e.target.value)}
              placeholder="To-do title"
              className="shopping-todo-title"
            />
          )}
        </div>

        <button className="shopping-add-btn" onClick={addItem}>Add Item</button>
      </div>

      {items.length === 0 ? (
        <div className="shopping-empty">Your shopping list is empty. Add items above! 🛒</div>
      ) : (
        <>
          {Object.entries(grouped).map(([cat, catItems]) => (
            <div key={cat} className="shopping-group">
              <h3 className="shopping-group-title">{cat}</h3>
              {catItems.map(item => (
                <div key={item.id} className={`shopping-item ${item.checked ? 'checked' : ''}`}>
                  <button className="shopping-check" onClick={() => toggleItem(item.id)}>
                    {item.checked ? '☑️' : '⬜'}
                  </button>
                  <span className="shopping-item-name">{item.name}</span>
                  {item.quantity && <span className="shopping-item-qty">{item.quantity}</span>}
                  <button className="shopping-item-delete" onClick={() => deleteItem(item.id)}>✕</button>
                </div>
              ))}
            </div>
          ))}
          <div className="shopping-footer">
            <span>{items.length} item{items.length !== 1 ? 's' : ''} · {checkedCount} checked</span>
            {checkedCount > 0 && (
              <button className="shopping-clear" onClick={clearChecked}>Clear checked</button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default ShoppingList