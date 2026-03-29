import { useState } from 'react'
import './UnitConverter.css'

interface Conversion {
  name: string
  from: string
  to: string
  convert: (val: number) => number
  reverse: (val: number) => number
}

const categories: Record<string, Conversion[]> = {
  '🌡️ Temperature': [
    { name: '°C ↔ °F', from: '°C', to: '°F', convert: (c) => c * 9 / 5 + 32, reverse: (f) => (f - 32) * 5 / 9 },
    { name: '°C ↔ K', from: '°C', to: 'K', convert: (c) => c + 273.15, reverse: (k) => k - 273.15 },
    { name: '°F ↔ K', from: '°F', to: 'K', convert: (f) => (f - 32) * 5 / 9 + 273.15, reverse: (k) => (k - 273.15) * 9 / 5 + 32 },
  ],
  '🥄 Kitchen Volume': [
    { name: 'tsp ↔ mL', from: 'tsp', to: 'mL', convert: (v) => v * 4.929, reverse: (v) => v / 4.929 },
    { name: 'tbsp ↔ mL', from: 'tbsp', to: 'mL', convert: (v) => v * 14.787, reverse: (v) => v / 14.787 },
    { name: 'cup ↔ mL', from: 'cup', to: 'mL', convert: (v) => v * 236.588, reverse: (v) => v / 236.588 },
    { name: 'cup ↔ L', from: 'cup', to: 'L', convert: (v) => v * 0.2366, reverse: (v) => v / 0.2366 },
    { name: 'fl oz ↔ mL', from: 'fl oz', to: 'mL', convert: (v) => v * 29.574, reverse: (v) => v / 29.574 },
    { name: 'pint ↔ L', from: 'pint', to: 'L', convert: (v) => v * 0.4732, reverse: (v) => v / 0.4732 },
    { name: 'quart ↔ L', from: 'quart', to: 'L', convert: (v) => v * 0.9464, reverse: (v) => v / 0.9464 },
    { name: 'gallon ↔ L', from: 'gallon', to: 'L', convert: (v) => v * 3.7854, reverse: (v) => v / 3.7854 },
  ],
  '⚖️ Weight': [
    { name: 'oz ↔ g', from: 'oz', to: 'g', convert: (v) => v * 28.3495, reverse: (v) => v / 28.3495 },
    { name: 'lb ↔ kg', from: 'lb', to: 'kg', convert: (v) => v * 0.4536, reverse: (v) => v / 0.4536 },
    { name: 'g ↔ kg', from: 'g', to: 'kg', convert: (v) => v / 1000, reverse: (v) => v * 1000 },
  ],
  '📏 Length': [
    { name: 'in ↔ cm', from: 'in', to: 'cm', convert: (v) => v * 2.54, reverse: (v) => v / 2.54 },
    { name: 'ft ↔ m', from: 'ft', to: 'm', convert: (v) => v * 0.3048, reverse: (v) => v / 0.3048 },
    { name: 'yd ↔ m', from: 'yd', to: 'm', convert: (v) => v * 0.9144, reverse: (v) => v / 0.9144 },
    { name: 'mi ↔ km', from: 'mi', to: 'km', convert: (v) => v * 1.6093, reverse: (v) => v / 1.6093 },
  ],
}

const cheatEveryday = [
  { name: 'Water freezes', c: '0', f: '32', k: '273' },
  { name: 'Refrigerator', c: '4', f: '39', k: '277' },
  { name: 'Room temp', c: '21', f: '70', k: '294' },
  { name: 'Body temp', c: '37', f: '98.6', k: '310' },
  { name: 'Hot tub', c: '40', f: '104', k: '313' },
  { name: 'Water boils', c: '100', f: '212', k: '373' },
]

const cheatOven = [
  { name: 'Warm', c: '120', f: '250' },
  { name: 'Low', c: '150', f: '300' },
  { name: 'Moderate', c: '180', f: '350' },
  { name: 'Mod-Hot', c: '190', f: '375' },
  { name: 'Hot', c: '200', f: '400' },
  { name: 'Very Hot', c: '230', f: '450' },
  { name: 'Broil', c: '260', f: '500' },
]

function UnitConverter() {
  const [selectedCategory, setSelectedCategory] = useState(Object.keys(categories)[0])
  const [selectedConversion, setSelectedConversion] = useState(0)
  const [fromValue, setFromValue] = useState('')
  const [toValue, setToValue] = useState('')

  const conversions = categories[selectedCategory]
  const current = conversions[selectedConversion]
  const isTemperature = selectedCategory === '🌡️ Temperature'

  const handleFromChange = (val: string) => {
    setFromValue(val)
    if (val === '' || isNaN(Number(val))) { setToValue(''); return }
    setToValue(current.convert(Number(val)).toFixed(4).replace(/\.?0+$/, ''))
  }

  const handleToChange = (val: string) => {
    setToValue(val)
    if (val === '' || isNaN(Number(val))) { setFromValue(''); return }
    setFromValue(current.reverse(Number(val)).toFixed(4).replace(/\.?0+$/, ''))
  }

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat)
    setSelectedConversion(0)
    setFromValue('')
    setToValue('')
  }

  const handleConversionChange = (idx: number) => {
    setSelectedConversion(idx)
    setFromValue('')
    setToValue('')
  }

  return (
    <div className="converter">
      <div className="converter-categories">
        {Object.keys(categories).map(cat => (
          <button
            key={cat}
            className={`cat-btn ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => handleCategoryChange(cat)}
          >
            {cat}
          </button>
        ))}
      </div>
      <div className="converter-options">
        {conversions.map((conv, idx) => (
          <button
            key={conv.name}
            className={`conv-btn ${selectedConversion === idx ? 'active' : ''}`}
            onClick={() => handleConversionChange(idx)}
          >
            {conv.name}
          </button>
        ))}
      </div>
      <div className="converter-fields">
        <div className="field-group">
          <label>{current.from}</label>
          <input
            type="number"
            value={fromValue}
            onChange={e => handleFromChange(e.target.value)}
            placeholder={`Enter ${current.from}`}
          />
        </div>
        <span className="swap-icon">⇄</span>
        <div className="field-group">
          <label>{current.to}</label>
          <input
            type="number"
            value={toValue}
            onChange={e => handleToChange(e.target.value)}
            placeholder={`Enter ${current.to}`}
          />
        </div>
      </div>

      {isTemperature && (
        <div className="cheat-sheet">
          <h3>📋 Quick Reference</h3>
          <div className="cheat-grid">
            <div className="cheat-section">
              <h4>Everyday Temperatures</h4>
              <table>
                <thead>
                  <tr><th></th><th>°C</th><th>°F</th><th>K</th></tr>
                </thead>
                <tbody>
                  {cheatEveryday.map(row => (
                    <tr key={row.name}>
                      <td className="cheat-label">{row.name}</td>
                      <td>{row.c}°</td>
                      <td>{row.f}°</td>
                      <td>{row.k}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="cheat-section">
              <h4>🍳 Oven Temperatures</h4>
              <table>
                <thead>
                  <tr><th></th><th>°C</th><th>°F</th></tr>
                </thead>
                <tbody>
                  {cheatOven.map(row => (
                    <tr key={row.name}>
                      <td className="cheat-label">{row.name}</td>
                      <td>{row.c}°</td>
                      <td>{row.f}°</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UnitConverter