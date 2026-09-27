const { useState, useEffect } = React;

// ── Inline SVG icons ──────────────────────────────────────────────────────────
const _Icon = ({ size = 24, className = "", children }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        className={className}>{children}</svg>
);
const Upload      = p => <_Icon {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></_Icon>;
const Spinner     = p => <_Icon {...p}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></_Icon>;
const CheckCircle = p => <_Icon {...p}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></_Icon>;
const Droplets    = p => <_Icon {...p}><path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"/><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"/></_Icon>;
const AlertTri    = p => <_Icon {...p}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></_Icon>;
const Search      = p => <_Icon {...p}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></_Icon>;
const Thermometer = p => <_Icon {...p}><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></_Icon>;
const Clock       = p => <_Icon {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></_Icon>;
const Heart       = p => <_Icon {...p}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></_Icon>;
const ImageIcon   = p => <_Icon {...p}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></_Icon>;
const UserIcon    = p => <_Icon {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></_Icon>;
const LogOut      = p => <_Icon {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></_Icon>;
const Trash       = p => <_Icon {...p}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></_Icon>;
const KeyIcon     = p => <_Icon {...p}><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></_Icon>;

// ── Supabase client (module-level, set during init) ───────────────────────────
let _sb = null;
let _authToken = null;

const getAuthHeaders = () => {
    const headers = {};
    if (_authToken) headers['Authorization'] = `Bearer ${_authToken}`;
    const geminiKey = localStorage.getItem('gemini_api_key');
    if (geminiKey) headers['X-Gemini-Key'] = geminiKey;
    return headers;
};

// ── API helpers ───────────────────────────────────────────────────────────────
const API_BASE = '/api';

const apiFetch = async (endpoint, options = {}) => {
    const headers = { ...options.headers, ...getAuthHeaders() };
    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    if (res.status === 401 && _sb) {
        await _sb.auth.signOut();
        return;
    }
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || res.statusText);
    }
    return res.json();
};

const imgSrc = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `/${path}`;
};

// ── Availability config ───────────────────────────────────────────────────────
const AVAIL = {
    available: { label: 'Available',   next: 'washing',   bg: 'bg-wada-celadon', Icon: CheckCircle },
    washing:   { label: 'In the wash', next: 'damaged',   bg: 'bg-wada-mustard', Icon: Droplets   },
    damaged:   { label: 'Damaged',     next: 'available', bg: 'bg-wada-carmine', Icon: AlertTri   },
};
const getAvail = (item) =>
    AVAIL[item.availability] || (item.available ? AVAIL.available : AVAIL.damaged);

// ── AuthScreen ────────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
    const [mode,     setMode]    = useState('login');  // 'login' | 'signup'
    const [email,    setEmail]   = useState('');
    const [password, setPassword] = useState('');
    const [loading,  setLoading] = useState(false);
    const [error,    setError]   = useState('');
    const [info,     setInfo]    = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); setInfo('');
        setLoading(true);
        try {
            if (mode === 'signup') {
                const { error } = await _sb.auth.signUp({ email, password });
                if (error) throw error;
                setInfo('Check your email to confirm your account, then log in.');
                setMode('login');
            } else {
                const { data, error } = await _sb.auth.signInWithPassword({ email, password });
                if (error) throw error;
                _authToken = data.session.access_token;
                onAuth(data.session);
            }
        } catch (err) {
            setError(err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-wada-ivory flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
                <h1 className="text-2xl font-bold text-wada-navy mb-1">AI Stylist</h1>
                <p className="text-sm text-gray-400 mb-6">
                    {mode === 'login' ? 'Welcome back' : 'Create your account'}
                </p>

                {error && (
                    <div className="bg-red-50 text-red-700 text-sm px-4 py-2 rounded-lg mb-4">{error}</div>
                )}
                {info && (
                    <div className="bg-green-50 text-green-700 text-sm px-4 py-2 rounded-lg mb-4">{info}</div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs font-semibold uppercase text-gray-500">Email</label>
                        <input type="email" required value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="mt-1 w-full border p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-wada-mustard" />
                    </div>
                    <div>
                        <label className="text-xs font-semibold uppercase text-gray-500">Password</label>
                        <input type="password" required minLength={6} value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="mt-1 w-full border p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-wada-mustard" />
                    </div>
                    <button type="submit" disabled={loading}
                        className="w-full bg-wada-navy text-white py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                        {loading && <Spinner size={16} className="animate-spin" />}
                        {mode === 'login' ? 'Log in' : 'Create account'}
                    </button>
                </form>

                <p className="text-center text-sm text-gray-400 mt-5">
                    {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                    <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setInfo(''); }}
                        className="text-wada-carmine font-medium hover:underline">
                        {mode === 'login' ? 'Sign up' : 'Log in'}
                    </button>
                </p>
            </div>
        </div>
    );
}

// ── ProfilePhoto ──────────────────────────────────────────────────────────────
function ProfilePhoto() {
    const [photo,   setPhoto]   = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        apiFetch('/profile-photo')
            .then(d => { if (d && d.profile_photo) setPhoto(d.profile_photo); })
            .catch(() => {});
    }, []);

    const handleUpload = async (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setLoading(true);
        const fd = new FormData();
        fd.append('file', f);
        try {
            const d = await apiFetch('/profile-photo', { method: 'POST', body: fd });
            setPhoto(d.profile_photo + '?t=' + Date.now());
        } catch (err) {
            alert('Upload failed: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-5">
            <div className="shrink-0">
                {photo
                    ? <img src={imgSrc(photo)} alt="Your photo"
                        className="w-20 h-20 rounded-full object-cover border-2 border-wada-mustard shadow" />
                    : <div className="w-20 h-20 rounded-full bg-wada-ivory flex items-center justify-center border-2 border-dashed border-wada-mustard">
                        <UserIcon size={32} className="text-wada-mustard opacity-60" />
                      </div>
                }
            </div>
            <div>
                <p className="font-semibold text-wada-navy text-sm">
                    {photo ? 'Your try-on photo' : 'Add your photo for virtual try-on'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5 mb-2">
                    {photo
                        ? 'Nano Banana will dress you in each outfit suggestion.'
                        : 'Upload a full-body photo and AI will show you wearing each outfit.'}
                </p>
                <label className="cursor-pointer bg-wada-navy text-white text-xs px-4 py-1.5 rounded-lg flex items-center gap-1.5 w-fit hover:opacity-90">
                    {loading ? <><Spinner size={14} className="animate-spin" /> Uploading…</>
                             : <><Upload size={14} /> {photo ? 'Change photo' : 'Upload photo'}</>}
                    <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                </label>
            </div>
        </div>
    );
}

// ── UploadWizard ──────────────────────────────────────────────────────────────
function UploadWizard({ onUploadComplete }) {
    const [file,      setFile]      = useState(null);
    const [preview,   setPreview]   = useState(null);
    const [loading,   setLoading]   = useState(false);
    const [tags,      setTags]      = useState(null);
    const [imagePath, setImagePath] = useState(null);

    const onFile = (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setFile(f); setPreview(URL.createObjectURL(f)); setTags(null);
    };

    const handleUpload = async () => {
        if (!file) return;
        setLoading(true);
        const fd = new FormData();
        fd.append('file', file);
        try {
            const data = await apiFetch('/upload', { method: 'POST', body: fd });
            setTags(data.tags); setImagePath(data.image_path);
        } catch (err) {
            alert('Upload failed: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await apiFetch('/items', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image_path: imagePath, category: tags.category,
                    sub_type: tags.sub_type || null, color: tags.color,
                    formality: tags.formality, description: tags.description,
                }),
            });
            setFile(null); setPreview(null); setTags(null); setImagePath(null);
            onUploadComplete();
        } catch (err) {
            alert('Save failed: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-semibold mb-4 text-wada-navy">Add to Wardrobe</h2>
            {!tags ? (
                <div className="flex flex-col items-center gap-4">
                    {preview && <img src={preview} alt="preview" className="w-40 h-40 object-cover rounded-lg shadow" />}
                    <label className="cursor-pointer bg-wada-navy text-white px-5 py-2 rounded-lg flex items-center gap-2 hover:opacity-90">
                        <Upload size={18} /> Select Image
                        <input type="file" accept="image/*" className="hidden" onChange={onFile} />
                    </label>
                    {file && !loading && (
                        <button onClick={handleUpload}
                            className="bg-wada-mustard text-white px-6 py-2 rounded-lg hover:opacity-90">
                            Auto-Tag with AI
                        </button>
                    )}
                    {loading && (
                        <div className="flex items-center gap-2 text-wada-navy text-sm">
                            <Spinner size={20} className="animate-spin" /> Analyzing image…
                        </div>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <img src={preview} alt="preview" className="w-full h-56 object-cover rounded-lg shadow" />
                    <div className="flex flex-col gap-3">
                        <div>
                            <label className="text-xs font-semibold uppercase text-gray-500">Category</label>
                            <select value={tags.category}
                                onChange={e => setTags({ ...tags, category: e.target.value, sub_type: null })}
                                className="mt-1 w-full border p-2 rounded text-sm focus:ring-2 focus:ring-wada-mustard outline-none">
                                {['top','bottom','outerwear','shoes','accessory','dress'].map(c =>
                                    <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                            </select>
                        </div>
                        {tags.category === 'accessory' && (
                            <div>
                                <label className="text-xs font-semibold uppercase text-gray-500">Accessory Type</label>
                                <select value={tags.sub_type || ''}
                                    onChange={e => setTags({ ...tags, sub_type: e.target.value })}
                                    className="mt-1 w-full border p-2 rounded text-sm focus:ring-2 focus:ring-wada-mustard outline-none">
                                    <option value="">— select type —</option>
                                    {['belt','watch','bag','hat','sunglasses','jewellery','scarf'].map(t =>
                                        <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="text-xs font-semibold uppercase text-gray-500">Color</label>
                            <input type="text" value={tags.color}
                                onChange={e => setTags({ ...tags, color: e.target.value })}
                                className="mt-1 w-full border p-2 rounded text-sm focus:ring-2 focus:ring-wada-mustard outline-none" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold uppercase text-gray-500">Formality</label>
                            <select value={tags.formality}
                                onChange={e => setTags({ ...tags, formality: e.target.value })}
                                className="mt-1 w-full border p-2 rounded text-sm focus:ring-2 focus:ring-wada-mustard outline-none">
                                <option value="casual">Casual</option>
                                <option value="smart-casual">Smart-Casual</option>
                                <option value="formal">Formal</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold uppercase text-gray-500">Description</label>
                            <input type="text" value={tags.description}
                                onChange={e => setTags({ ...tags, description: e.target.value })}
                                className="mt-1 w-full border p-2 rounded text-sm focus:ring-2 focus:ring-wada-mustard outline-none" />
                        </div>
                        <button onClick={handleSave} disabled={loading}
                            className="mt-1 bg-wada-celadon text-white py-2 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                            {loading ? <Spinner size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                            {loading ? 'Saving…' : 'Confirm & Save'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── WardrobeGrid ──────────────────────────────────────────────────────────────
function WardrobeGrid({ items, onToggleAvailability }) {
    const [filter, setFilter] = useState('all');
    const filtered    = filter === 'all' ? items : items.filter(i => i.category === filter);
    const clothing    = filtered.filter(i => i.category !== 'accessory');
    const accessories = filtered.filter(i => i.category === 'accessory');

    function ItemCard({ item }) {
        const av = getAvail(item);
        const AvIcon = av.Icon;
        return (
            <div className={`border rounded-xl overflow-hidden bg-white shadow-sm relative transition-opacity ${
                item.availability && item.availability !== 'available' ? 'opacity-55' : ''
            }`}>
                <img src={imgSrc(item.image_path)} alt={item.description} className="w-full h-44 object-cover" />
                <button title={`${av.label} — click to cycle`}
                    onClick={() => onToggleAvailability(item.id, item.availability || 'available')}
                    className={`absolute top-2 right-2 p-1.5 rounded-full text-white shadow ${av.bg}`}>
                    <AvIcon size={14} />
                </button>
                <div className="p-3">
                    <p className="font-medium text-sm truncate text-wada-charcoal">{item.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                        {item.color} · {item.formality}
                        {item.sub_type ? ` · ${item.sub_type}` : ''}
                    </p>
                    {item.last_worn && (
                        <p className="text-xs text-wada-mustard mt-1 flex items-center gap-1">
                            <Clock size={11} /> Last worn {new Date(item.last_worn).toLocaleDateString()}
                        </p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm mt-6 border border-gray-100">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-wada-navy">Your Wardrobe</h2>
                <select value={filter} onChange={e => setFilter(e.target.value)}
                    className="border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-wada-mustard">
                    <option value="all">All</option>
                    {['top','bottom','outerwear','shoes','dress','accessory'].map(c =>
                        <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}s</option>)}
                </select>
            </div>
            {clothing.length === 0 && accessories.length === 0 && (
                <p className="text-center text-gray-400 py-10">No items yet — add something above!</p>
            )}
            {clothing.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {clothing.map(item => <ItemCard key={item.id} item={item} />)}
                </div>
            )}
            {accessories.length > 0 && (
                <div className="mt-6">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Accessories</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {accessories.map(item => <ItemCard key={item.id} item={item} />)}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── EventPlanner ──────────────────────────────────────────────────────────────
function EventPlanner({ setOutfits, setCurrentEvent }) {
    const [event,   setEvent]   = useState({ description: '', date: '', location: '' });
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(false);
    const [genMsg,  setGenMsg]  = useState('');

    const fetchWeather = async () => {
        if (!event.location) return;
        setLoading(true);
        try {
            const data = await apiFetch('/weather', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(event),
            });
            setWeather(data);
        } catch (err) {
            alert('Could not fetch weather: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const generateOutfits = async () => {
        setLoading(true);
        setGenMsg('Styling your outfits + generating try-on images… (~30 s)');
        try {
            setCurrentEvent({ description: event.description, date: event.date });
            const data = await apiFetch('/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event: event.description, weather }),
            });
            setOutfits(data.outfits || []);
        } catch (err) {
            alert('Generation failed: ' + err.message);
        } finally {
            setLoading(false); setGenMsg('');
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border-t-4 border-wada-mustard">
            <h2 className="text-xl font-semibold mb-4 text-wada-navy">Plan an Event</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <input type="text" placeholder="Event (e.g. Rooftop dinner)"
                    className="border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-wada-mustard"
                    value={event.description}
                    onChange={e => setEvent({ ...event, description: e.target.value })} />
                <input type="date"
                    className="border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-wada-mustard"
                    value={event.date}
                    onChange={e => setEvent({ ...event, date: e.target.value })} />
                <div className="flex gap-2">
                    <input type="text" placeholder="City (e.g. Bangalore)"
                        className="border p-2 rounded flex-1 text-sm outline-none focus:ring-2 focus:ring-wada-mustard"
                        value={event.location}
                        onChange={e => setEvent({ ...event, location: e.target.value })}
                        onKeyDown={e => e.key === 'Enter' && fetchWeather()} />
                    <button onClick={fetchWeather} disabled={loading}
                        className="bg-wada-navy text-white px-3 rounded hover:opacity-90 disabled:opacity-50">
                        <Search size={18} />
                    </button>
                </div>
            </div>
            {weather && (
                <div className="bg-wada-ivory rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Thermometer className="text-wada-carmine" size={22} />
                        <div>
                            <p className="font-medium text-wada-navy text-sm">
                                Weather {event.date ? `on ${event.date}` : 'today'}
                            </p>
                            <p className="text-xs text-gray-600">
                                {weather.temp_min}°C – {weather.temp_max}°C · Rain: {weather.precip_chance}%
                            </p>
                        </div>
                    </div>
                    <button onClick={generateOutfits} disabled={loading || !event.description}
                        className="bg-wada-mustard text-white px-5 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                        {loading && <Spinner size={16} className="animate-spin" />}
                        Style Me
                    </button>
                </div>
            )}
            {genMsg && <p className="text-center text-xs text-gray-400 mt-3 animate-pulse">{genMsg}</p>}
        </div>
    );
}

// ── OutfitCards ───────────────────────────────────────────────────────────────
function OutfitCards({ outfits, items, currentEvent, onWore }) {
    if (!outfits || outfits.length === 0) return null;

    const postFeedback = (outfit, type, text = '') =>
        apiFetch('/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                outfit_items: JSON.stringify(outfit.item_ids),
                weather_fit: outfit.reasoning?.weather_fit || '',
                event_fit: outfit.reasoning?.event_fit || '',
                overall_note: outfit.reasoning?.overall_note || '',
                feedback_type: type, feedback_text: text,
            }),
        }).catch(console.error);

    const handleWore = async (outfit) => {
        try {
            await apiFetch('/outfit-history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    item_ids: JSON.stringify(outfit.item_ids),
                    event_description: currentEvent?.description || '',
                    date: currentEvent?.date || new Date().toISOString().split('T')[0],
                }),
            });
            await postFeedback(outfit, 'wore');
            if (onWore) onWore();
            alert('Logged to outfit history!');
        } catch (err) {
            alert('Could not save: ' + err.message);
        }
    };

    return (
        <div className="mt-8 space-y-6">
            <h2 className="text-xl font-semibold text-wada-navy">Suggested Outfits</h2>
            {outfits.map((outfit, idx) => {
                const outfitItems = (outfit.item_ids || [])
                    .map(id => items.find(i => i.id === id)).filter(Boolean);
                return (
                    <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        {outfit.outfit_image && (
                            <div className="bg-gray-50 border-b">
                                <p className="text-xs text-gray-400 px-5 pt-3 pb-1 uppercase tracking-wide flex items-center gap-1">
                                    <ImageIcon size={12} /> AI Try-On Preview
                                </p>
                                <img src={outfit.outfit_image} alt="AI generated try-on"
                                    className="w-full max-h-80 object-contain p-4" />
                            </div>
                        )}
                        <div className="p-5">
                            <div className="flex gap-3 overflow-x-auto pb-2 mb-4">
                                {outfitItems.map(item => (
                                    <div key={item.id} className="min-w-[96px]">
                                        <img src={imgSrc(item.image_path)} className="w-24 h-28 object-cover rounded-lg border" />
                                        <p className="text-xs text-center mt-1 truncate w-24">{item.description}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-wada-ivory rounded-lg p-4 text-sm mb-4 space-y-1.5">
                                <p><span className="font-semibold text-wada-navy">Weather fit: </span>{outfit.reasoning?.weather_fit}</p>
                                <p><span className="font-semibold text-wada-navy">Event fit: </span>{outfit.reasoning?.event_fit}</p>
                                <p><span className="font-semibold text-wada-carmine">Stylist note: </span>{outfit.reasoning?.overall_note}</p>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                <button onClick={() => handleWore(outfit)}
                                    className="bg-wada-navy text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 flex items-center gap-1.5">
                                    <Heart size={15} /> I wore this
                                </button>
                                <button onClick={() => postFeedback(outfit, 'wear')}
                                    className="bg-wada-celadon text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
                                    I'd wear this
                                </button>
                                <button onClick={() => {
                                        const r = prompt("What was off? (optional)");
                                        postFeedback(outfit, 'not_for_me', r || '');
                                    }}
                                    className="bg-gray-100 text-wada-charcoal px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200">
                                    Not for me
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ── OutfitHistory ─────────────────────────────────────────────────────────────
function OutfitHistory({ items }) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiFetch('/outfit-history').then(setHistory).catch(console.error).finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="flex justify-center py-16 text-gray-300"><Spinner size={36} className="animate-spin" /></div>;
    if (history.length === 0) return (
        <div className="text-center py-16 text-gray-400">
            <Clock size={40} className="mx-auto mb-3 opacity-30" />
            <p>No outfit history yet.</p>
            <p className="text-sm mt-1">Generate outfits and tap "I wore this".</p>
        </div>
    );

    return (
        <div className="space-y-5">
            <h2 className="text-xl font-semibold text-wada-navy">Outfit History</h2>
            {history.map(entry => {
                const ids = (() => { try { return JSON.parse(entry.item_ids); } catch { return []; } })();
                const entryItems = ids.map(id => items.find(i => i.id === id)).filter(Boolean);
                return (
                    <div key={entry.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <p className="font-semibold text-wada-navy">{entry.event_description || 'Outfit'}</p>
                        <p className="text-xs text-gray-400 mt-0.5 mb-3 flex items-center gap-1">
                            <Clock size={11} /> Worn {entry.date} · Logged {new Date(entry.created_at).toLocaleDateString()}
                        </p>
                        <div className="flex gap-3 overflow-x-auto">
                            {entryItems.length > 0
                                ? entryItems.map(item => (
                                    <div key={item.id} className="min-w-[72px]">
                                        <img src={imgSrc(item.image_path)} className="w-[72px] h-[88px] object-cover rounded-lg border" />
                                        <p className="text-xs text-center mt-1 truncate w-[72px]">{item.description}</p>
                                    </div>
                                ))
                                : <p className="text-sm text-gray-400 italic">Items no longer in wardrobe.</p>
                            }
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ── SettingsPage ──────────────────────────────────────────────────────────────
function SettingsPage() {
    const [key,   setKey]   = useState(localStorage.getItem('gemini_api_key') || '');
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        if (key.trim()) {
            localStorage.setItem('gemini_api_key', key.trim());
        } else {
            localStorage.removeItem('gemini_api_key');
        }
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const hasSaved = !!localStorage.getItem('gemini_api_key');

    return (
        <div className="max-w-md mx-auto space-y-5">
            <h2 className="text-xl font-semibold text-wada-navy">Settings</h2>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-1">
                    <KeyIcon size={18} className="text-wada-mustard" />
                    <h3 className="font-semibold text-wada-navy">Your Gemini API Key</h3>
                </div>
                <p className="text-xs text-gray-400 mb-4">
                    Stored only in your browser. The app uses your key for AI tagging and outfit generation —
                    not the server owner's key. Get a free key at{' '}
                    <span className="text-wada-navy font-medium">aistudio.google.com/apikey</span>
                </p>

                <div className="flex gap-2">
                    <input
                        type="password"
                        placeholder="AIza..."
                        value={key}
                        onChange={e => { setKey(e.target.value); setSaved(false); }}
                        className="flex-1 border p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-wada-mustard font-mono"
                    />
                    <button onClick={handleSave}
                        className="bg-wada-navy text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 flex items-center gap-1.5">
                        {saved ? <><CheckCircle size={15} /> Saved!</> : 'Save'}
                    </button>
                </div>

                {hasSaved && (
                    <div className="mt-3 flex items-center justify-between">
                        <p className="text-xs text-wada-celadon flex items-center gap-1">
                            <CheckCircle size={12} /> Key saved in this browser
                        </p>
                        <button onClick={() => { localStorage.removeItem('gemini_api_key'); setKey(''); }}
                            className="text-xs text-red-400 hover:underline">
                            Remove
                        </button>
                    </div>
                )}
            </div>

            <div className="bg-wada-ivory rounded-xl p-4 text-xs text-gray-500 space-y-1">
                <p className="font-semibold text-wada-navy">Why do I need this?</p>
                <p>Each user needs a free Gemini key so AI costs stay with you, not the app owner.</p>
                <p>1. Go to <span className="font-medium">aistudio.google.com/apikey</span></p>
                <p>2. Click <span className="font-medium">Create API key</span></p>
                <p>3. Copy the key (starts with AIza...) and paste it above</p>
            </div>
        </div>
    );
}


// ── ProfilePage ───────────────────────────────────────────────────────────────
function ProfilePage({ session, onLogout }) {
    const [stats,   setStats]   = useState(null);
    const [loading, setLoading] = useState(false);
    const email = session?.user?.email || 'Local dev user';

    useEffect(() => {
        apiFetch('/profile-stats').then(setStats).catch(console.error);
    }, []);

    const handleDelete = async () => {
        if (!confirm('Delete ALL your data and account? This cannot be undone.')) return;
        setLoading(true);
        try {
            await apiFetch('/account', { method: 'DELETE' });
            if (_sb) await _sb.auth.signOut();
            onLogout();
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto space-y-5">
            <h2 className="text-xl font-semibold text-wada-navy">Profile</h2>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-wada-navy flex items-center justify-center text-white font-bold text-lg">
                        {email[0].toUpperCase()}
                    </div>
                    <div>
                        <p className="font-medium text-wada-charcoal">{email}</p>
                        <p className="text-xs text-gray-400">Signed in</p>
                    </div>
                </div>

                {stats && (
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="bg-wada-ivory rounded-lg p-4 text-center">
                            <p className="text-2xl font-bold text-wada-navy">{stats.item_count}</p>
                            <p className="text-xs text-gray-500 mt-0.5">Items in wardrobe</p>
                        </div>
                        <div className="bg-wada-ivory rounded-lg p-4 text-center">
                            <p className="text-2xl font-bold text-wada-navy">{stats.outfit_count}</p>
                            <p className="text-xs text-gray-500 mt-0.5">Outfits logged</p>
                        </div>
                    </div>
                )}
            </div>

            {session && (
                <button onClick={onLogout}
                    className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 text-wada-charcoal px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">
                    <LogOut size={16} /> Log out
                </button>
            )}

            <button onClick={handleDelete} disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 border border-red-200 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-red-100 disabled:opacity-50">
                {loading ? <Spinner size={15} className="animate-spin" /> : <Trash size={15} />}
                Delete my account and all data
            </button>
        </div>
    );
}

// ── App ───────────────────────────────────────────────────────────────────────
function App() {
    const [screen,       setScreen]       = useState('loading'); // 'loading'|'auth'|'app'
    const [session,      setSession]      = useState(null);
    const [items,        setItems]        = useState([]);
    const [outfits,      setOutfits]      = useState([]);
    const [currentEvent, setCurrentEvent] = useState({ description: '', date: '' });
    const [tab,          setTab]          = useState('wardrobe');

    // ── Init: fetch config, set up Supabase if configured ──────────────────────
    useEffect(() => {
        (async () => {
            try {
                const cfg = await fetch('/api/client-config').then(r => r.json());
                if (cfg.auth_enabled && cfg.supabase_url && window.supabase) {
                    _sb = window.supabase.createClient(cfg.supabase_url, cfg.supabase_anon_key);
                    const { data } = await _sb.auth.getSession();
                    if (data.session) {
                        _authToken = data.session.access_token;
                        setSession(data.session);
                        setScreen('app');
                    } else {
                        setScreen('auth');
                    }
                    _sb.auth.onAuthStateChange((_event, sess) => {
                        _authToken = sess?.access_token || null;
                        setSession(sess);
                        setScreen(sess ? 'app' : 'auth');
                    });
                } else {
                    // Dev mode — no auth required
                    setScreen('app');
                }
            } catch (e) {
                console.error(e);
                setScreen('app');
            }
        })();
    }, []);

    const fetchItems = async () => {
        try { setItems(await apiFetch('/items')); } catch (err) { console.error(err); }
    };

    useEffect(() => {
        if (screen === 'app') fetchItems();
    }, [screen]);

    const handleToggleAvailability = async (id, current) => {
        const next = AVAIL[current]?.next || 'available';
        try {
            await apiFetch(`/items/${id}/availability`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ availability: next }),
            });
            fetchItems();
        } catch (err) {
            alert('Update failed: ' + err.message);
        }
    };

    const handleLogout = async () => {
        if (_sb) await _sb.auth.signOut();
        _authToken = null;
        setSession(null);
        setScreen('auth');
    };

    if (screen === 'loading') return (
        <div className="min-h-screen bg-wada-ivory flex items-center justify-center">
            <Spinner size={40} className="animate-spin text-wada-mustard" />
        </div>
    );

    if (screen === 'auth') return <AuthScreen onAuth={(sess) => { setSession(sess); setScreen('app'); }} />;

    const TABS = [
        { id: 'wardrobe',  label: 'Wardrobe'   },
        { id: 'plan',      label: 'Plan Outfit' },
        { id: 'history',   label: 'History'     },
        { id: 'settings',  label: 'Settings'    },
        { id: 'profile',   label: 'Profile'     },
    ];

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <div className="max-w-5xl mx-auto px-4 py-6">
                <header className="flex justify-between items-center mb-8 pb-4 border-b border-wada-mustard border-opacity-40">
                    <h1 className="text-3xl font-bold text-wada-navy tracking-tight">AI Stylist</h1>
                    <div className="flex items-center gap-4">
                        {session?.user?.email && (
                            <span className="text-xs text-gray-400 hidden md:block">{session.user.email}</span>
                        )}
                        <nav className="flex gap-5">
                            {TABS.map(({ id, label }) => (
                                <button key={id} onClick={() => setTab(id)}
                                    className={`text-sm font-medium pb-1 border-b-2 transition-colors ${
                                        tab === id
                                            ? 'border-wada-carmine text-wada-carmine'
                                            : 'border-transparent text-gray-500 hover:text-wada-navy'
                                    }`}>
                                    {label}
                                </button>
                            ))}
                        </nav>
                    </div>
                </header>

                {tab === 'wardrobe' && (
                    <div className="space-y-6">
                        <ProfilePhoto />
                        <UploadWizard onUploadComplete={fetchItems} />
                        <WardrobeGrid items={items} onToggleAvailability={handleToggleAvailability} />
                    </div>
                )}

                {tab === 'plan' && (
                    <div>
                        <EventPlanner setOutfits={setOutfits} setCurrentEvent={setCurrentEvent} />
                        <OutfitCards outfits={outfits} items={items}
                            currentEvent={currentEvent} onWore={fetchItems} />
                    </div>
                )}

                {tab === 'history' && <OutfitHistory items={items} />}

                {tab === 'settings' && <SettingsPage />}

                {tab === 'profile' && <ProfilePage session={session} onLogout={handleLogout} />}
            </div>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
