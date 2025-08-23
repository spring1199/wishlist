import { useEffect, useState } from 'react'
import { listItems, addItemFD, deleteItem } from './api'

export default function App() {
  const [items, setItems] = useState([])
  const [pin, setPin] = useState(localStorage.getItem('pin') || '1234')
  const [form, setForm] = useState({ title: '', price: '', currency: 'MNT', owner: 'Munhu', link: '', description: '' })
  const [file, setFile] = useState(null)
  const [msg, setMsg] = useState('')

  useEffect(() => { load() }, [])
  const load = async () => { try { setItems(await listItems()) } catch { setMsg('Сервертэй холбогдож чадсангүй.') } }

  const submit = async (e) => {
    e.preventDefault()
    const fd = new FormData()
    for (const [k,v] of Object.entries(form)) fd.append(k, v)
    if (file) fd.append('image', file)
    try {
      const res = await addItemFD(fd, pin)
      if (res.error) throw new Error(res.error)
      setMsg('Амжилттай нэмлээ.')
      setForm({ title:'', price:'', currency:'MNT', owner:'Munhu', link:'', description:'' })
      setFile(null)
      await load()
    } catch (e) { setMsg('Алдаа: ' + e.message) }
  }

  return (
    <div style={{maxWidth: 900, margin: '2rem auto', padding: '0 1rem', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto'}}>
      <header style={{display:'flex', alignItems:'center', gap:12, marginBottom:16}}>
        <div style={{fontSize:28}}>💖</div>
        <h1 style={{fontSize:24, fontWeight:700}}>M & N Wishlist</h1>
        <div style={{flex:1}} />
        <input placeholder="PIN" value={pin} onChange={e=>{setPin(e.target.value); localStorage.setItem('pin', e.target.value)}} style={{padding:6}}/>
      </header>

      <form onSubmit={submit} style={{display:'grid', gap:8, border:'1px solid #eee', padding:12, borderRadius:10}}>
        <label>Item <input required value={form.title} onChange={e=>setForm({...form, title:e.target.value})} /></label>
        <label>Үнэ <input type="number" value={form.price} onChange={e=>setForm({...form, price:e.target.value})} /></label>
        <label>Валют
          <select value={form.currency} onChange={e=>setForm({...form, currency:e.target.value})}>
            <option value="MNT">MNT</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </label>
        <label>Хэнийх
          <select value={form.owner} onChange={e=>setForm({...form, owner:e.target.value})}>
            <option>Munhu</option>
            <option>Nomuna</option>
          </select>
        </label>
        <label>Холбоос <input value={form.link} onChange={e=>setForm({...form, link:e.target.value})} /></label>
        <label>Зураг upload <input type="file" onChange={e=>setFile(e.target.files?.[0]||null)} /></label>
        <label>Дэлгэрэнгүй <textarea value={form.description} onChange={e=>setForm({...form, description:e.target.value})}/></label>
        <button>Нэмэх</button>
        {msg && <div>{msg}</div>}
      </form>

      <div style={{margin:'20px 0', height:1, background:'#eee'}} />

      <ul style={{display:'grid', gap:12, listStyle:'none', padding:0}}>
        {items.map(it => (
          <li key={it.id} style={{border:'1px solid #eee', borderRadius:10, padding:12, display:'grid', gap:8}}>
            <div style={{display:'flex', gap:8, alignItems:'center'}}>
              <strong style={{fontSize:18}}>{it.title}</strong>
              <span style={{marginLeft:'auto'}}>{it.price!=null? `${it.price} ${it.currency}`:''}</span>
            </div>
            <div style={{display:'flex', gap:10, alignItems:'center'}}>
              {it.image ? <img src={it.image} alt="" style={{width:120, height:90, objectFit:'cover', borderRadius:8}}/> : <div style={{width:120, height:90, background:'#f3f3f3', borderRadius:8}}/>}
              <div style={{flex:1}}>
                <div>{it.owner}</div>
                <div style={{color:'#666'}}>{it.description}</div>
                {it.link && <a href={it.link} target="_blank">↗ Холбоос</a>}
              </div>
              <button onClick={async()=>{await deleteItem(it.id, pin); await load()}}>🗑️ Устгах</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
