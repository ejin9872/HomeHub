import { useState } from 'react'
import './App.css'
import UnitConverter from './components/UnitConverter'
import TodoList from './components/TodoList'
import Schedule from './components/Schedule'
import ShoppingList from './components/ShoppingList'
import Budget from './components/Budget'

const tabs = [
  { id: 'converter', label: 'Conversions', icon: '⚖️', component: UnitConverter },
  { id: 'todo', label: 'To-Do', icon: '✅', component: TodoList },
  { id: 'schedule', label: 'Schedule', icon: '📅', component: Schedule },
  { id: 'shopping', label: 'Shopping', icon: '🛒', component: ShoppingList },
  { id: 'budget', label: 'Budget', icon: '💰', component: Budget },
]

function App() {
  const [activeTab, setActiveTab] = useState('converter')
  const ActiveComponent = tabs.find(t => t.id === activeTab)!.component

  return (
    <div className="app">
      <header className="app-header">
        <h1>🏠 HomeHub</h1>
        <p>Your friendly daily companion</p>
      </header>
      <nav className="tab-nav">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            data-tab={tab.id}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </nav>
      <main className="tab-content">
        <ActiveComponent />
      </main>
    </div>
  )
}

export default App