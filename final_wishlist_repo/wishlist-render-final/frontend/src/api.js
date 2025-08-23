const API_BASE = import.meta.env.VITE_API_BASE || '/api'

export async function listItems() {
  const res = await fetch(`${API_BASE}/items`)
  return res.json()
}

export async function addItemFD(formData, pin) {
  const headers = {}
  if (pin) headers['x-auth-pin'] = pin
  const res = await fetch(`${API_BASE}/items`, { method: 'POST', headers, body: formData })
  return res.json()
}

export async function deleteItem(id, pin) {
  const headers = {}
  if (pin) headers['x-auth-pin'] = pin
  const res = await fetch(`${API_BASE}/items/${id}`, { method: 'DELETE', headers })
  return res.json()
}
