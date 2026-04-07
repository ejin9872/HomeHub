import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const __dirname = dirname(fileURLToPath(import.meta.url))
const USERS_FILE = resolve(__dirname, 'users.json')
const JWT_SECRET = process.env.JWT_SECRET || 'homehub-dev-secret-please-change'

function loadUsers() {
  if (!existsSync(USERS_FILE)) return []
  try {
    return JSON.parse(readFileSync(USERS_FILE, 'utf8'))
  } catch {
    return []
  }
}

function saveUsers(users) {
  writeFileSync(USERS_FILE, JSON.stringify(users, null, 2))
}

export function createToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET)
}

export async function registerUser(name, email, password) {
  const users = loadUsers()
  if (users.find(u => u.email === email)) {
    throw new Error('An account with this email already exists')
  }
  const hash = await bcrypt.hash(password, 10)
  const user = {
    id: Date.now().toString(),
    name,
    email,
    password: hash,
    provider: 'local',
    createdAt: new Date().toISOString(),
  }
  users.push(user)
  saveUsers(users)
  return { id: user.id, name: user.name, email: user.email }
}

export async function loginUser(email, password) {
  const users = loadUsers()
  const user = users.find(u => u.email === email)
  if (!user) throw new Error('Invalid email or password')
  if (!user.password) throw new Error('Please use your password to sign in.')
  const valid = await bcrypt.compare(password, user.password)
  if (!valid) throw new Error('Invalid email or password')
  return { id: user.id, name: user.name, email: user.email }
}

export function getAllUsers() {
  return loadUsers().map(({ password, ...rest }) => rest)
}

export async function adminCreateUser(name, email, password) {
  const users = loadUsers()
  if (users.find(u => u.email === email)) {
    throw new Error('An account with this email already exists')
  }
  const user = {
    id: Date.now().toString(),
    name,
    email,
    password: password ? await bcrypt.hash(password, 10) : null,
    provider: password ? 'local' : 'admin',
    createdAt: new Date().toISOString(),
  }
  users.push(user)
  saveUsers(users)
  const { password: _, ...rest } = user
  return rest
}

export async function updateUser(id, data) {
  const users = loadUsers()
  const idx = users.findIndex(u => u.id === id)
  if (idx === -1) throw new Error('User not found')
  if (data.name) users[idx].name = data.name
  if (data.email) {
    if (users.find(u => u.email === data.email && u.id !== id)) {
      throw new Error('Email already in use')
    }
    users[idx].email = data.email
  }
  if (data.password) {
    users[idx].password = await bcrypt.hash(data.password, 10)
  }
  saveUsers(users)
  const { password, ...rest } = users[idx]
  return rest
}

export function deleteUser(id) {
  const users = loadUsers()
  const idx = users.findIndex(u => u.id === id)
  if (idx === -1) throw new Error('User not found')
  users.splice(idx, 1)
  saveUsers(users)
}

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  try {
    req.user = verifyToken(authHeader.slice(7))
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}
