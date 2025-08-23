const API_BASE = import.meta.env.VITE_API_BASE;

export async function getItems() {
  const res = await fetch(`${API_BASE}/items`);
  return res.json();
}

export async function addItem(data, pin) {
  const formData = new FormData();
  for (const key in data) {
    formData.append(key, data[key]);
  }

  const res = await fetch(`${API_BASE}/items`, {
    method: "POST",
    headers: pin ? { "x-auth-pin": pin } : {},
    body: formData
  });
  return res.json();
}
