import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays, Menu, X, Bell, User as UserIcon, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const dashboardPath = user?.role === 'admin' ? '/admin/dashboard' : user?.role === 'organizer' ? '/organizer/dashboard' : '/dashboard';

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center">
            <CalendarDays size={18} />
          </div>
          <span>SmartEvent <span className="text-brand-400">Nepal</span></span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm text-slate-300">
          <Link to="/events" className="hover:text-white">Events</Link>
          {user && <Link to="/recommendations" className="hover:text-white">For You</Link>}
          <Link to="/about" className="hover:text-white">About</Link>
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <Link to="/notifications" className="p-2 rounded-lg hover:bg-slate-800"><Bell size={18} /></Link>
              <Link to={dashboardPath} className="btn-secondary text-sm flex items-center gap-2"><UserIcon size={16} />{user.name.split(' ')[0]}</Link>
              <button onClick={() => { logout(); navigate('/'); }} className="p-2 rounded-lg hover:bg-slate-800" title="Logout"><LogOut size={18} /></button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-secondary text-sm">Log in</Link>
              <Link to="/register" className="btn-primary text-sm">Sign up</Link>
            </>
          )}
        </div>

        <button className="md:hidden p-2" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
      </div>

      {open && (
        <div className="md:hidden px-4 pb-4 flex flex-col gap-2 text-sm">
          <Link to="/events" onClick={() => setOpen(false)}>Events</Link>
          {user && <Link to="/recommendations" onClick={() => setOpen(false)}>For You</Link>}
          <Link to="/about" onClick={() => setOpen(false)}>About</Link>
          {user ? (
            <>
              <Link to={dashboardPath} onClick={() => setOpen(false)}>Dashboard</Link>
              <button className="text-left text-red-400" onClick={() => { logout(); setOpen(false); navigate('/'); }}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setOpen(false)}>Log in</Link>
              <Link to="/register" onClick={() => setOpen(false)}>Sign up</Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
