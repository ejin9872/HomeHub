import { useState } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import './Schedule.css'

interface ScheduleEvent {
  id: string
  date: string
  title: string
  time: string
  color: string
}

const COLORS = ['#e8836b', '#7cb9a8', '#8b7ec8', '#f4a261', '#5b9bd5', '#e76f8a', '#4ecdc4', '#ffd166', '#95afc0', '#6c5ce7']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

function formatDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function Schedule() {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [events, setEvents] = useLocalStorage<ScheduleEvent[]>('homehub-schedule', [])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null)
  const [formTitle, setFormTitle] = useState('')
  const [formTime, setFormTime] = useState('')
  const [formColor, setFormColor] = useState(COLORS[0])

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)
  const todayStr = formatDate(today.getFullYear(), today.getMonth(), today.getDate())

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
    else setCurrentMonth(m => m - 1)
  }

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) }
    else setCurrentMonth(m => m + 1)
  }

  const goToday = () => {
    setCurrentMonth(today.getMonth())
    setCurrentYear(today.getFullYear())
  }

  const getNearestFutureTime = (): string => {
    const now = new Date()
    const minutes = now.getMinutes()
    const roundedMinutes = Math.ceil((minutes + 1) / 30) * 30
    const hours = now.getHours() + Math.floor(roundedMinutes / 60)
    const mins = roundedMinutes % 60
    return `${String(hours % 24).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
  }

  const openAddForm = (date: string) => {
    setSelectedDate(date)
    setEditingEvent(null)
    setFormTitle('')
    setFormTime(getNearestFutureTime())
    setFormColor(COLORS[0])
    setShowForm(true)
  }

  const openEditForm = (event: ScheduleEvent) => {
    setSelectedDate(event.date)
    setEditingEvent(event)
    setFormTitle(event.title)
    setFormTime(event.time)
    setFormColor(event.color)
    setShowForm(true)
  }

  const saveEvent = () => {
    if (!formTitle.trim() || !selectedDate) return
    if (editingEvent) {
      setEvents(prev => prev.map(e => e.id === editingEvent.id
        ? { ...e, title: formTitle.trim(), time: formTime, color: formColor }
        : e
      ))
    } else {
      setEvents(prev => [...prev, {
        id: Date.now().toString(),
        date: selectedDate,
        title: formTitle.trim(),
        time: formTime,
        color: formColor,
      }])
    }
    setShowForm(false)
  }

  const deleteEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id))
    setShowForm(false)
  }

  const getEventsForDate = (date: string) => events.filter(e => e.date === date)

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className="schedule">
      <div className="schedule-header">
        <button className="nav-btn" onClick={prevMonth}>‹</button>
        <div className="schedule-title">
          <h2>{MONTHS[currentMonth]} {currentYear}</h2>
          <button className="today-btn" onClick={goToday}>Today</button>
        </div>
        <button className="nav-btn" onClick={nextMonth}>›</button>
      </div>
      <div className="calendar-grid">
        {DAYS.map(d => <div key={d} className="cal-day-header">{d}</div>)}
        {cells.map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} className="cal-cell empty" />
          const dateStr = formatDate(currentYear, currentMonth, day)
          const dayEvents = getEventsForDate(dateStr)
          const isToday = dateStr === todayStr
          return (
            <div
              key={dateStr}
              className={`cal-cell ${isToday ? 'today' : ''} ${selectedDate === dateStr ? 'selected' : ''}`}
              onClick={() => openAddForm(dateStr)}
            >
              <span className="cal-day-num">{day}</span>
              <div className="cal-events">
                {dayEvents.slice(0, 3).map(ev => (
                  <div
                    key={ev.id}
                    className="cal-event-dot"
                    style={{ background: ev.color }}
                    title={ev.title}
                    onClick={e => { e.stopPropagation(); openEditForm(ev) }}
                  >
                    {ev.title.length > 8 ? ev.title.slice(0, 8) + '…' : ev.title}
                  </div>
                ))}
                {dayEvents.length > 3 && <span className="cal-more">+{dayEvents.length - 3}</span>}
              </div>
            </div>
          )
        })}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{editingEvent ? 'Edit Event' : 'New Event'}</h3>
            <p className="modal-date">{selectedDate}</p>
            <input
              type="text"
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              placeholder="Event title"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && saveEvent()}
            />
            <input
              type="time"
              value={formTime}
              onChange={e => setFormTime(e.target.value)}
            />
            <div className="color-picker">
              {COLORS.map(c => (
                <button
                  key={c}
                  className={`color-swatch ${formColor === c ? 'active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setFormColor(c)}
                />
              ))}
            </div>
            <div className="modal-actions">
              {editingEvent && (
                <button className="modal-delete" onClick={() => deleteEvent(editingEvent.id)}>Delete</button>
              )}
              <button className="modal-cancel" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="modal-save" onClick={saveEvent}>Save</button>
            </div>
          </div>
        </div>
      )}

      {selectedDate && !showForm && getEventsForDate(selectedDate).length > 0 && (
        <div className="day-events-list">
          <h3>Events for {selectedDate}</h3>
          {getEventsForDate(selectedDate).map(ev => (
            <div key={ev.id} className="day-event-item" onClick={() => openEditForm(ev)}>
              <span className="day-event-color" style={{ background: ev.color }} />
              <span className="day-event-time">{ev.time || 'All day'}</span>
              <span className="day-event-title">{ev.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Schedule
