import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import { apiErrorMessage } from '../api/client.js';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (values) => {
    try {
      const user = await login(values.email, values.password);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      navigate(user.role === 'admin' ? '/admin/dashboard' : user.role === 'organizer' ? '/organizer/dashboard' : '/dashboard');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <div className="max-w-md mx-auto card p-8 mt-10">
      <h1 className="text-2xl font-bold mb-1">Welcome back</h1>
      <p className="text-sm text-slate-400 mb-6">Log in to continue to SmartEvent Nepal</p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="text-sm text-slate-400">Email</label>
          <input className="input mt-1" {...register('email')} placeholder="you@example.com" />
          {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <label className="text-sm text-slate-400">Password</label>
          <input type="password" className="input mt-1" {...register('password')} placeholder="••••••••" />
          {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
        </div>
        <button className="btn-primary w-full" disabled={isSubmitting}>{isSubmitting ? 'Logging in...' : 'Log in'}</button>
      </form>
      <div className="mt-4 text-xs text-slate-500 border-t border-slate-800 pt-4 space-y-1">
        <p className="font-medium text-slate-400">Demo accounts:</p>
        <p>Admin: admin@smarteventnepal.com / Admin@123</p>
        <p>Organizer: organizer@smarteventnepal.com / Organizer@123</p>
        <p>Attendee: user@smarteventnepal.com / User@123</p>
      </div>
      <p className="text-sm text-slate-400 mt-4">No account? <Link to="/register" className="text-brand-400 hover:underline">Sign up</Link></p>
    </div>
  );
}
