import { useState } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import './TodoList.css'

interface Todo {
  id: string
  text: string
  completed: boolean
  createdAt: number
  deadline?: string
  deadlineTime?: string
  urgency: 'low' | 'medium' | 'high' | 'urgent'
  repeat: 'none' | 'daily' | 'weekly' | 'monthly'
  addToCalendar: boolean
}

type Filter = 'all' | 'active' | 'completed'

const URGENCY_OPTIONS = [
  { value: 'low' as const, label: 'Low', color: '#7cb9a8' },
  { value: 'medium' as const, label: 'Medium', color: '#f4a261' },
  { value: 'high' as const, label: 'High', color: '#e8836b' },
  { value: 'urgent' as const, label: 'Urgent', color: '#e55555' },
]

const REPEAT_OPTIONS = [
  { value: 'none' as const, label: 'None' },
  { value: 'daily' as const, label: 'Daily' },
  { value: 'weekly' as const, label: 'Weekly' },
  { value: 'monthly' as const, label: 'Monthly' },
]

const URGENCY_COLORS: Record<string, string> = {
  low: '#7cb9a8', medium: '#f4a261', high: '#e8836b', urgent: '#e55555',
}

function getNextRepeatDate(date: string, repeat: string): string {
  const d = new Date(date + 'T00:00:00')
  switch (repeat) {
    case 'daily': d.setDate(d.getDate() + 1); break
    case 'weekly': d.setDate(d.getDate() + 7); break
    case 'monthly': d.setMonth(d.getMonth() + 1); break
  }
  return d.toISOString().slice(0, 10)
}

function formatDeadline(date?: string, time?: string): string {
  if (!date) return ''
  const d = new Date(date + 'T00:00:00')
  const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  if (time) {
    const [h, m] = time.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const hour = h % 12 || 12
    return `${dateStr} at ${hour}:${String(m).padStart(2, '0')} ${ampm}`
  }
  return dateStr
}

function TodoList() {
  const [todos, setTodos] = useLocalStorage<Todo[]>('homehub-todos', [])
  const [input, setInput] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [deadline, setDeadline] = useState('')
  const [deadlineTime, setDeadlineTime] = useState('')
  const [urgency, setUrgency] = useState<Todo['urgency']>('low')
  const [repeat, setRepeat] = useState<Todo['repeat']>('none')
  const [addToCalendar, setAddToCalendar] = useState(false)

  const resetForm = () => {
    setInput('')
    setDeadline('')
    setDeadlineTime('')
    setUrgency('low')
    setRepeat('none')
    setAddToCalendar(false)
  }

  const addTodo = () => {
    const text = input.trim()
    if (!text) return

    setTodos(prev => [...prev, {
      id: Date.now().toString(),
      text,
      completed: false,
      createdAt: Date.now(),
      deadline: deadline || undefined,
      deadlineTime: deadlineTime || undefined,
      urgency,
      repeat,
      addToCalendar,
    }])

    if (addToCalendar && deadline) {
      try {
        const events = JSON.parse(localStorage.getItem('homehub-schedule') || '[]')
        events.push({
          id: (Date.now() + 1).toString(),
          date: deadline,
          title: text,
          time: deadlineTime || '',
          color: URGENCY_COLORS[urgency] || '#8b7ec8',
        })
        localStorage.setItem('homehub-schedule', JSON.stringify(events))
      } catch { /* ignore */ }
    }

    resetForm()
  }

  const toggleTodo = (id: string) => {
    setTodos(prev => {
      const todo = prev.find(t => t.id === id)
      if (!todo) return prev
      const updated = prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
      if (!todo.completed && todo.repeat !== 'none' && todo.deadline) {
        updated.push({
          ...todo,
          id: Date.now().toString(),
          completed: false,
          createdAt: Date.now(),
          deadline: getNextRepeatDate(todo.deadline, todo.repeat),
        })
      }
      return updated
    })
  }

  const deleteTodo = (id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id))
  }

  const clearCompleted = () => {
    setTodos(prev => prev.filter(t => !t.completed))
  }

  const filtered = todos.filter(t => {
    if (filter === 'active') return !t.completed
    if (filter === 'completed') return t.completed
    return true
  })

  const activeCount = todos.filter(t => !t.completed).length

  return (
    <div className="todo">
      <div className="todo-input-row">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTodo()}
          placeholder="What needs to be done?"
        />
        <button className="todo-add-btn" onClick={addTodo}>Add</button>
      </div>

      <div className="todo-options">
        <div className="todo-option-row">
          <span className="option-label">📅 Deadline</span>
          <div className="option-controls">
            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
            <input type="time" value={deadlineTime} onChange={e => setDeadlineTime(e.target.value)} />
          </div>
        </div>
        <div className="todo-option-row">
          <span className="option-label">⚡ Urgency</span>
          <div className="option-controls">
            {URGENCY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                className={`urgency-btn ${urgency === opt.value ? 'active' : ''}`}
                style={{ '--urgency-color': opt.color } as React.CSSProperties}
                onClick={() => setUrgency(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="todo-option-row">
          <span className="option-label">🔄 Repeat</span>
          <div className="option-controls">
            {REPEAT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                className={`repeat-btn ${repeat === opt.value ? 'active' : ''}`}
                onClick={() => setRepeat(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <label className="todo-calendar-check">
          <input type="checkbox" checked={addToCalendar} onChange={e => setAddToCalendar(e.target.checked)} />
          <span>Add to calendar</span>
        </label>
      </div>

      <div className="todo-filters">
        {(['all', 'active', 'completed'] as Filter[]).map(f => (
          <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <ul className="todo-list">
        {filtered.length === 0 && (
          <li className="todo-empty">
            {filter === 'completed' ? 'No completed tasks yet!' : filter === 'active' ? 'All done! 🎉' : 'Add your first task above!'}
          </li>
        )}
        {filtered.map(todo => (
          <li key={todo.id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
            <button className="todo-check" onClick={() => toggleTodo(todo.id)}>
              {todo.completed ? '☑️' : '⬜'}
            </button>
            <div className="todo-item-content">
              <span className="todo-text">{todo.text}</span>
              {(todo.deadline || (todo.repeat && todo.repeat !== 'none')) && (
                <div className="todo-meta">
                  {todo.deadline && <span className="todo-deadline">📅 {formatDeadline(todo.deadline, todo.deadlineTime)}</span>}
                  {todo.repeat && todo.repeat !== 'none' && <span className="todo-repeat">🔄 {todo.repeat}</span>}
                </div>
              )}
            </div>
            <span className="urgency-dot" style={{ background: URGENCY_COLORS[todo.urgency] || '#7cb9a8' }} title={todo.urgency} />
            <button className="todo-delete" onClick={() => deleteTodo(todo.id)}>✕</button>
          </li>
        ))}
      </ul>

      <div className="todo-footer">
        <span>{activeCount} item{activeCount !== 1 ? 's' : ''} left</span>
        {todos.some(t => t.completed) && (
          <button className="clear-btn" onClick={clearCompleted}>Clear completed</button>
        )}
      </div>
    </div>
  )
}

export default TodoList