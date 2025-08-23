import { useEffect, useMemo, useState } from "react";
import api from "./api";

const currencySymbols = { MNT: "₮", USD: "$", EUR: "€" };

function Label({ children }) { return <span className="text-label">{children}</span>; }
function Field({ label, className = "", ...rest }) { return (<label className={"grid gap-1 " + className}><Label>{label}</Label><input {...rest} className="input" /></label>); }
function Select({ label, className = "", children, ...rest }) { return (<label className={"grid gap-1 " + className}><Label>{label}</Label><select {...rest} className="select">{children}</select></label>); }

export default function App() {
  const [pin, setPin] = useState(localStorage.getItem("pin") || "");
  const [pinOk, setPinOk] = useState(false);
  useEffect(() => { if (pin) { api.defaults.headers.common["x-pin"] = pin; localStorage.setItem("pin", pin);} else { delete api.defaults.headers.common["x-pin"]; localStorage.removeItem("pin"); } }, [pin]);

  const [theme, setTheme] = useState(() => { try { return localStorage.getItem("theme") || "dark"; } catch { return "dark"; } });
  useEffect(() => { const root = document.documentElement; if (theme === "light") root.classList.remove("dark"); else root.classList.add("dark"); try { localStorage.setItem("theme", theme); } catch {} }, [theme]);

  const [wishes, setWishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: "", description: "", price: "", currency: "MNT", image: "", link: "", owner: "Munhu" });
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("all");

  const fetchWishes = async () => {
    try { const res = await api.get("/wishes"); setWishes(res.data); setPinOk(true); setError(""); }
    catch (e) { setPinOk(false); setError(e?.response?.data?.error || "Ачааллахад алдаа."); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchWishes(); }, [pin]);

  const totalsByCurrency = useMemo(() => {
    const totals = {}; for (const w of wishes) { if (w.price != null) totals[w.currency] = (totals[w.currency] || 0) + Number(w.price); }
    return totals;
  }, [wishes]);

  const addWish = async (e) => {
    e.preventDefault(); setError("");
    let imageUrl = form.image;
    try {
      if (file) { const fd = new FormData(); fd.append("file", file); const up = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" }}); imageUrl = up.data.url; }
      const payload = { ...form, image: imageUrl, price: form.price === "" ? null : Number(form.price) };
      const res = await api.post("/wishes", payload);
      setWishes([res.data, ...wishes]);
      setForm({ title: "", description: "", price: "", currency: "MNT", image: "", link: "", owner: "Munhu" });
      setFile(null);
    } catch (e) { setError(e?.response?.data?.error || "Нэмэхэд алдаа."); }
  };

  const toggleBought = async (w) => { try { const res = await api.put(`/wishes/${w.id}`, { bought: !w.bought }); setWishes(wishes.map(x => x.id === w.id ? res.data : x)); } catch { setError("Шинэчлэхэд алдаа."); } };
  const removeWish = async (id) => { if (!confirm("Энэ мөрийг устгах уу?")) return; try { await api.delete(`/wishes/${id}`); setWishes(wishes.filter(x => x.id !== id)); } catch { setError("Устгахад алдаа."); } };

  const exportCsv = () => (window.location.href = "/api/export/csv");
  const downloadSqlite = () => (window.location.href = "/api/backup/sqlite");
  const importCsv = async (evt) => { const f = evt.target.files?.[0]; if (!f) return; const fd = new FormData(); fd.append("file", f); try { await api.post("/restore/csv", fd, { headers: { "Content-Type": "multipart/form-data" } }); await fetchWishes(); alert("CSV-ээс уншиж нэмлээ."); evt.target.value=""; } catch { setError("CSV импорт алдаа."); } };

  const filtered = wishes.filter(w => ownerFilter === "all" ? true : w.owner === ownerFilter);

  if (!pinOk) {
    return (
      <div className="container py-16 grid gap-4 max-w-md">
        <div className="text-4xl">🔐</div>
        <h1 className="text-3xl font-bold">PIN нэвтрэх</h1>
        <p className="text-gray-600 dark:text-gray-300">Хэрэв сервер дээр PIN тохироогүй бол хоосон орхиод нэвтэрнэ.</p>
        <Field label="PIN код" type="password" placeholder="****" value={pin} onChange={(e)=>setPin(e.target.value)} />
        <button onClick={fetchWishes} className="btn btn-primary">Нэвтрэх</button>
        {error && <div className="text-red-500">{error}</div>}
      </div>
    );
  }

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-10 backdrop-blur bg-white/60 dark:bg-gray-900/60 border-b border-white/50 dark:border-white/10">
        <div className="container py-3 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-pink-500 text-white grid place-items-center">💖</div>
            <h1 className="text-2xl font-bold">M & N Wishlist</h1>
          </div>
          <div className="flex-1" />
          <div className="hidden md:flex items-center gap-3 text-sm">
            {Object.entries(totalsByCurrency).map(([c, v]) => (<span key={c} className="badge">{({MNT:"₮",USD:"$",EUR:"€"})[c]} {v.toFixed(2)} {c}</span>))}
          </div>
          <button className="btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? "🌞 Light" : "🌙 Dark"}</button>
          <div className="relative">
            <button className="btn" onClick={(e)=>{e.preventDefault(); const el=document.getElementById('menu-dd'); if(el){ el.classList.toggle('hidden'); }}}>☰ Экспорт/Нөөц</button>
            <div id="menu-dd" className="hidden absolute right-0 mt-2 w-56 card p-2 grid gap-1 z-20">
              <button className="btn" onClick={exportCsv}>⬇️ CSV экспорт</button>
              <label className="btn cursor-pointer">⬆️ CSV импорт<input type="file" accept=".csv" className="hidden" onChange={importCsv} /></label>
              <button className="btn" onClick={downloadSqlite}>⬇️ DB нөөц</button>
            </div>
          </div>
          <Select label=" " value={ownerFilter} onChange={(e)=>setOwnerFilter(e.target.value)}>
            <option value="all">Бүгд</option>
            <option value="Munhu">Munhu</option>
            <option value="Nomuna">Nomuna</option>
          </Select>
        </div>
      </header>

      <main className="container py-8 grid gap-8">
        <form onSubmit={addWish} className="card p-4 md:p-6 grid md:grid-cols-2 gap-4">
          <Field label="Item" placeholder="ж: Lego Set" value={form.title} onChange={(e)=>setForm({...form, title:e.target.value})} required />
          <Select label="Валют" value={form.currency} onChange={(e)=>setForm({...form, currency:e.target.value})}>
            <option value="MNT">MNT (₮)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
          </Select>
          <Field label="Үнэ" type="number" placeholder="ж: 49.99" value={form.price} onChange={(e)=>setForm({...form, price:e.target.value})} step="0.01" />
          <Select label="Хэнийх" value={form.owner} onChange={(e)=>setForm({...form, owner:e.target.value})}>
            <option value="Munhu">Munhu</option>
            <option value="Nomuna">Nomuna</option>
          </Select>
          <Field label="Зурагны линк" placeholder="https://..." value={form.image} onChange={(e)=>setForm({...form, image:e.target.value})} />
          <Field label="Холбоос" placeholder="https://..." value={form.link} onChange={(e)=>setForm({...form, link:e.target.value})} />
          <label className="grid gap-1">
            <Label>Зураг upload</Label>
            <input type="file" accept="image/*" onChange={(e)=>setFile(e.target.files?.[0] || null)} className="input"/>
          </label>
          <label className="md:col-span-2 grid gap-1">
            <Label>Дэлгэрэнгүй</Label>
            <textarea className="input h-28" placeholder="Дэлгэрэнгүй"
              value={form.description} onChange={(e)=>setForm({...form, description:e.target.value})} />
          </label>
          <div className="md:col-span-2 flex gap-3">
            <button className="btn btn-primary">➕ Нэмэх</button>
            {error && <span className="text-red-500 self-center">{error}</span>}
          </div>
        </form>

        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card p-4 grid gap-3">
                <div className="skeleton h-40" /><div className="skeleton h-6 w-2/3" /><div className="skeleton h-4 w-1/2" /><div className="skeleton h-8 w-1/3" />
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="col-span-full text-center text-gray-600 dark:text-gray-300">Хоосон байна ✨</div>
          ) : filtered.map(w => (
            <article key={w.id} className={"card overflow-hidden hover:shadow transition grid"}>
              <div className="relative">
                {w.image ? (<img src={w.image} alt={w.title} className="w-full h-48 object-cover" />)
                         : (<div className="w-full h-48 bg-gray-100 dark:bg-gray-800 grid place-items-center text-gray-400">Зураг алга</div>)}
                {w.price != null && (<div className="absolute top-3 right-3 badge bg-pink-500 text-white">{currencySymbols[w.currency]} {w.price}</div>)}
                {w.bought && (<div className="absolute bottom-3 left-3 badge bg-green-500 text-white">Авсан</div>)}
              </div>
              <div className="p-4 grid gap-2">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold">{w.title}</h2>
                  <span className="badge">{w.owner}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">{w.description}</p>
                <div className="flex gap-2 mt-2">
                  <button onClick={()=>toggleBought(w)} className={"btn " + (w.bought ? "" : "bg-green-100 dark:bg-green-900/30")}>{w.bought ? "❌ Аваагүй болгох" : "✅ Авсан"}</button>
                  <button onClick={()=>removeWish(w.id)} className="btn">🗑️ Устгах</button>
                  {w.link && (<a href={w.link} target="_blank" className="btn">↗ Холбоос</a>)}
                </div>
              </div>
            </article>
          ))}
        </section>
      </main>

      <footer className="container py-8 text-sm text-gray-500">
        <div>Бидний мөрөөдлийн жагсаалт</div>
      </footer>
    </div>
  );
}
