import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, apiErrorMessage } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Loading from '../../components/Loading.jsx';

const CATEGORY_INTERESTS_FALLBACK = ['technology', 'music', 'business', 'education', 'sports', 'arts-culture', 'food-drink', 'community'];

export default function Profile() {
  const { user, setUser } = useAuth();
  const { data: catData } = useQuery({ queryKey: ['categories'], queryFn: () => api.get('/categories').then(r => r.data) });
  const categories = catData?.categories?.map(c => c.slug) || CATEGORY_INTERESTS_FALLBACK;

  const [form, setForm] = useState({
    name: user?.name || '', phone: user?.phone || '', city: user?.city || '',
    interests: user?.interests || [],
  });
  const [saving, setSaving] = useState(false);

  if (!user) return <Loading />;

  const toggleInterest = (slug) => {
    setForm(f => ({
      ...f,
      interests: f.interests.includes(slug) ? f.interests.filter(i => i !== slug) : [...f.interests, slug],
    }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/auth/me', form);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">My Profile</h1>
      <div className="card p-6 space-y-4">
        <div>
          <label className="text-sm text-slate-400">Name</label>
          <input className="input mt-1" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="text-sm text-slate-400">Phone</label>
          <input className="input mt-1" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div>
          <label className="text-sm text-slate-400">City</label>
          <input className="input mt-1" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
        </div>
        <div>
          <label className="text-sm text-slate-400 mb-2 block">Interests</label>
          <div className="flex flex-wrap gap-2">
            {categories.map(slug => (
              <button
                key={slug}
                type="button"
                onClick={() => toggleInterest(slug)}
                className={`badge border ${form.interests.includes(slug) ? 'bg-brand-600 border-brand-500 text-white' : 'border-slate-700 text-slate-400'}`}
              >
                {slug.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>
        <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button>
      </div>
    </div>
  );
}
