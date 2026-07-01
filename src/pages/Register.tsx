import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { UserPlus, Loader2, AlertCircle } from 'lucide-react';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name must be under 50 characters'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegisterInput = z.infer<typeof registerSchema>;

import { useDocumentMetadata } from '@/hooks/useDocumentMetadata';

export const Register: React.FC = () => {
  useDocumentMetadata('Register Student Account', 'Register an account on ClassNotes to share study materials, earn rewards, and browse files.');
  const navigate = useNavigate();
  const { signUp, isAuthenticated, error, isLoading, clearError } = useAuthStore();
  const [authError, setAuthError] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Clear global store error on mount/unmount
  useEffect(() => {
    clearError();
    setAuthError(null);
    return () => clearError();
  }, [clearError]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: RegisterInput) => {
    setAuthError(null);
    try {
      await signUp(data.email, data.password, data.name);
      navigate('/', { replace: true });
    } catch (err: any) {
      setAuthError(err.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8 animate-fade-in">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <span className="font-mono text-xs uppercase tracking-wider text-accent font-semibold">Join ClassNotes</span>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-primary">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-primary/65 font-sans">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-accent hover:underline decoration-accent/30 hover:decoration-accent transition-all">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface py-8 px-4 border border-border rounded-lg shadow-sm sm:px-10">
          
          {/* Form Error Display */}
          {(authError || error) && (
            <div className="mb-4 p-3 bg-danger/5 border border-danger/25 text-danger rounded-md text-xs flex items-start gap-2 animate-pulse-slow">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{authError || error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label htmlFor="name" className="block text-xs font-mono uppercase tracking-wider text-primary/80">
                Full Name
              </label>
              <div className="mt-1">
                <input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  {...register('name')}
                  className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm bg-background/50 focus:bg-surface transition-all ${
                    errors.name ? 'border-danger focus:ring-danger/20' : 'border-border focus:border-accent focus:ring-accent/20'
                  }`}
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-danger flex items-center gap-1">
                    <AlertCircle size={12} />
                    {errors.name.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-mono uppercase tracking-wider text-primary/80">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  {...register('email')}
                  className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm bg-background/50 focus:bg-surface transition-all ${
                    errors.email ? 'border-danger focus:ring-danger/20' : 'border-border focus:border-accent focus:ring-accent/20'
                  }`}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-danger flex items-center gap-1">
                    <AlertCircle size={12} />
                    {errors.email.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-mono uppercase tracking-wider text-primary/80">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...register('password')}
                  className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm bg-background/50 focus:bg-surface transition-all ${
                    errors.password ? 'border-danger focus:ring-danger/20' : 'border-border focus:border-accent focus:ring-accent/20'
                  }`}
                />
                {errors.password && (
                  <p className="mt-1 text-xs text-danger flex items-center gap-1">
                    <AlertCircle size={12} />
                    {errors.password.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-mono uppercase tracking-wider text-primary/80">
                Confirm Password
              </label>
              <div className="mt-1">
                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  {...register('confirmPassword')}
                  className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm bg-background/50 focus:bg-surface transition-all ${
                    errors.confirmPassword ? 'border-danger focus:ring-danger/20' : 'border-border focus:border-accent focus:ring-accent/20'
                  }`}
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-danger flex items-center gap-1">
                    <AlertCircle size={12} />
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-surface bg-accent hover:bg-accent/90 focus:outline-none transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer"
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin mr-2" />
                ) : (
                  <UserPlus size={16} className="mr-2" />
                )}
                Register
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
