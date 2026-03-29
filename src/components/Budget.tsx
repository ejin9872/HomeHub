import { useState } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import './Budget.css'

interface BudgetEntry {
  id: string
  description: string
  amount: number
  type: 'income' | 'expense'
  category: string
  date: string
}

const EXPENSE_CATEGORIES = ['🏠 Housing', '🍕 Food', '🚗 Transport', '💡 Utilities', '🎬 Entertainment', '💊 Health', '🛍️ Shopping', '📦 Other']
const INCOME_CATEGORIES = ['💼 Salary', '💰 Freelance', '🎁 Gifts', '📦 Other']

function Budget() {
  const [entries, setEntries] = useLocalStorage<BudgetEntry[]>('homehub-budget', [])
  const [monthlyBudget, setMonthlyBudget] = useLocalStorage<number>('homehub-budget-limit', 0)
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0])
  const [showBudgetInput, setShowBudgetInput] = useState(false)
  const [budgetInput, setBudgetInput] = useState(monthlyBudget.toString())

  const now = new Date()
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const monthEntries = entries.filter(e => e.date.startsWith(currentMonthKey))
  const totalIncome = monthEntries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0)
  const totalExpenses = monthEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
  const balance = totalIncome - totalExpenses
  const budgetUsed = monthlyBudget > 0 ? (totalExpenses / monthlyBudget) * 100 : 0

  const addEntry = () => {
    if (!description.trim() || !amount || isNaN(Number(amount)) || Number(amount) <= 0) return
    setEntries(prev => [...prev, {
      id: Date.now().toString(),
      description: description.trim(),
      amount: Number(amount),
      type,
      category,
      date: new Date().toISOString().slice(0, 10),
    }])
    setDescription('')
    setAmount('')
  }

  const deleteEntry = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  const saveBudget = () => {
    setMonthlyBudget(Number(budgetInput) || 0)
    setShowBudgetInput(false)
  }

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  const expensesByCategory = EXPENSE_CATEGORIES.map(cat => ({
    category: cat,
    total: monthEntries.filter(e => e.type === 'expense' && e.category === cat).reduce((s, e) => s + e.amount, 0),
  })).filter(c => c.total > 0)

  return (
    <div className="budget">
      <div className="budget-summary">
        <div className="summary-card income">
          <span className="summary-label">Income</span>
          <span className="summary-amount">${totalIncome.toFixed(2)}</span>
        </div>
        <div className="summary-card expenses">
          <span className="summary-label">Expenses</span>
          <span className="summary-amount">${totalExpenses.toFixed(2)}</span>
        </div>
        <div className={`summary-card balance ${balance >= 0 ? 'positive' : 'negative'}`}>
          <span className="summary-label">Balance</span>
          <span className="summary-amount">${balance.toFixed(2)}</span>
        </div>
      </div>

      {monthlyBudget > 0 && (
        <div className="budget-progress">
          <div className="budget-progress-header">
            <span>Monthly Budget: ${monthlyBudget.toFixed(2)}</span>
            <span className={budgetUsed > 100 ? 'over-budget' : ''}>{budgetUsed.toFixed(0)}% used</span>
          </div>
          <div className="budget-bar">
            <div
              className={`budget-bar-fill ${budgetUsed > 90 ? 'warning' : ''} ${budgetUsed > 100 ? 'over' : ''}`}
              style={{ width: `${Math.min(budgetUsed, 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="budget-set-row">
        {showBudgetInput ? (
          <div className="budget-set-form">
            <input
              type="number"
              value={budgetInput}
              onChange={e => setBudgetInput(e.target.value)}
              placeholder="Monthly budget"
              onKeyDown={e => e.key === 'Enter' && saveBudget()}
            />
            <button onClick={saveBudget}>Save</button>
            <button className="budget-set-cancel" onClick={() => setShowBudgetInput(false)}>Cancel</button>
          </div>
        ) : (
          <button className="budget-set-btn" onClick={() => { setBudgetInput(monthlyBudget.toString()); setShowBudgetInput(true) }}>
            {monthlyBudget > 0 ? '✏️ Edit budget' : '📊 Set monthly budget'}
          </button>
        )}
      </div>

      <div className="budget-form">
        <div className="budget-type-toggle">
          <button className={`type-btn ${type === 'expense' ? 'active expense' : ''}`} onClick={() => { setType('expense'); setCategory(EXPENSE_CATEGORIES[0]) }}>Expense</button>
          <button className={`type-btn ${type === 'income' ? 'active income' : ''}`} onClick={() => { setType('income'); setCategory(INCOME_CATEGORIES[0]) }}>Income</button>
        </div>
        <div className="budget-form-fields">
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addEntry()}
            placeholder="Description"
            className="budget-desc-input"
          />
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addEntry()}
            placeholder="$0.00"
            className="budget-amount-input"
            min="0"
            step="0.01"
          />
          <select value={category} onChange={e => setCategory(e.target.value)} className="budget-cat-select">
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button className="budget-add-btn" onClick={addEntry}>Add</button>
        </div>
      </div>

      {expensesByCategory.length > 0 && (
        <div className="budget-categories">
          <h3>Spending by Category</h3>
          {expensesByCategory.map(({ category: cat, total }) => (
            <div key={cat} className="cat-row">
              <span className="cat-name">{cat}</span>
              <div className="cat-bar-container">
                <div className="cat-bar" style={{ width: `${(total / totalExpenses) * 100}%` }} />
              </div>
              <span className="cat-amount">${total.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="budget-entries">
        <h3>Recent Transactions</h3>
        {monthEntries.length === 0 ? (
          <div className="budget-empty">No transactions this month. Add one above!</div>
        ) : (
          [...monthEntries].reverse().map(entry => (
            <div key={entry.id} className={`budget-entry ${entry.type}`}>
              <div className="entry-info">
                <span className="entry-desc">{entry.description}</span>
                <span className="entry-cat">{entry.category}</span>
              </div>
              <span className={`entry-amount ${entry.type}`}>
                {entry.type === 'income' ? '+' : '-'}${entry.amount.toFixed(2)}
              </span>
              <button className="entry-delete" onClick={() => deleteEntry(entry.id)}>✕</button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default Budget
