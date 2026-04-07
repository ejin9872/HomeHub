import type { FridgeItem } from './components/MyFridge'

function getAuthToken(): string | null {
  try {
    const raw = localStorage.getItem('homehub-auth')
    if (!raw) return null
    return JSON.parse(raw)?.token ?? null
  } catch {
    return null
  }
}

export async function fetchFridgeItems(): Promise<FridgeItem[]> {
  const token = getAuthToken()
  if (!token) return []
  try {
    const res = await fetch('/api/fridge', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

export async function saveFridgeItems(items: FridgeItem[]): Promise<void> {
  const token = getAuthToken()
  if (!token) return
  await fetch('/api/fridge', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(items),
  })
}
