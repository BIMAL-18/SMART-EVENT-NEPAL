import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import { apiErrorMessage } from '../api/client.js';

const schema = z.object({
  name: z.string().min(2, 'Name is too short'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'At least 6 characters'),
  role: z.enum(['attendee', 'organizer']),
  city: z.string().optional(),
});

export default function Register() {
  const { register: doRegister } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema), defaultValues: { role: 'attendee' },
  });

  const onSubmit = async (values) => {
    try {
      const user = await doRegister(values);
      toast.success('Account created!');
      navigate(user.role === 'organizer' ? '/organizer/dashboard' : '/dashboard');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <div className="max-w-md mx-auto card p-8 mt-10">
      <h1 className="text-2xl font-bold mb-1">Create your account</h1>
      <p className="text-sm text-slate-400 mb-6">Join SmartEvent Nepal in seconds</p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="text-sm text-slate-400">Full name</label>
          <input className="input mt-1" {...register('name')} placeholder="Your name" />
          {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label className="text-sm text-slate-400">Email</label>
          <input className="input mt-1" {...register('email')} placeholder="you@example.com" />
          {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <label className="text-sm text-slate-400">Password</label>
          <input type="password" className="input mt-1" {...register('password')} placeholder="At least 6 characters" />
          {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
        </div>
        <div>
          <label className="text-sm text-slate-400">City</label>
          <input className="input mt-1" {...register('city')} placeholder="Kathmandu" />
        </div>
        <div>
          <label className="text-sm text-slate-400">I want to</label>
          <select className="input mt-1" {...register('role')}>
            <option value="attendee">Attend events</option>
            <option value="organizer">Organize events</option>
          </select>
        </div>
        <button className="btn-primary w-full" disabled={isSubmitting}>{isSubmitting ? 'Creating account...' : 'Sign up'}</button>
      </form>
      <p className="text-sm text-slate-400 mt-4">Already have an account? <Link to="/login" className="text-brand-400 hover:underline">Log in</Link></p>
    </div>
  );
}
