import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { Loader2, AlertCircle, Eye, EyeOff, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import ProfessorPixel from '@/components/ProfessorPixel';
import { useDocumentMetadata } from '@/hooks/useDocumentMetadata';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean(),
});

type LoginInput = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  useDocumentMetadata('Student Sign In', 'Log into your ClassNotes profile to access lecture study sheets and check academic notices.');
  const navigate = useNavigate();
  const location = useLocation();
  
  const { signIn, signInWithGoogle, user, isAuthenticated, error, isLoading, clearError } = useAuthStore();
  const [authError, setAuthError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const from = (location.state as any)?.from?.pathname || '/';

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user && !isSuccess) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, user, navigate, from, isSuccess]);

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
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginInput) => {
    setAuthError(null);
    try {
      await signIn(data.email, data.password, data.rememberMe);
      setIsSuccess(true);
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 1000);
    } catch (err: any) {
      setAuthError(err.message || 'Failed to sign in. Please verify credentials.');
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithGoogle(true);
      setIsSuccess(true);
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 1000);
    } catch (err: any) {
      setAuthError(err.message || 'Google authentication failed.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] grid grid-cols-1 lg:grid-cols-10 animate-fade-in relative overflow-hidden font-sans">
      
      {/* Background Floating Blurred Circles */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none select-none" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-warning/5 rounded-full blur-3xl pointer-events-none select-none animate-pulse-slow" style={{ animationDelay: '2s' }} />

      {/* LEFT COLUMN: Hero mascot space (40% width on large screens) */}
      <div className="hidden lg:col-span-4 lg:flex flex-col justify-center items-center p-12 text-center bg-slate-50/40 relative border-r border-border/40 overflow-hidden select-none">
        {/* Soft layout detail */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(59,130,246,0.02)_0%,transparent_50%)]" />
        
        <div className="relative z-10 flex flex-col items-center gap-6 max-w-sm">
          {/* Animated 3D Mascot */}
          <ProfessorPixel />

          <div className="space-y-2 mt-4">
            <h1 className="text-2xl font-extrabold text-[#111827] tracking-tight">
              Welcome back, Learner 👋
            </h1>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">
              Continue building your knowledge one note at a time.
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Floating Glassmorphism form area (60% width on large screens) */}
      <div className="col-span-12 lg:col-span-6 flex flex-col justify-center items-center p-6 md:p-12 relative z-10">
        
        {/* Mobile mascot display if screen is small */}
        <div className="lg:hidden flex flex-col items-center text-center gap-2 mb-6 select-none">
          <ProfessorPixel />
          <h1 className="text-xl font-extrabold text-[#111827] tracking-tight">
            Welcome back, Learner 👋
          </h1>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-md bg-white/70 backdrop-blur-xl border border-white/80 rounded-2xl shadow-luxury p-8 md:p-10 space-y-6 relative hover:shadow-premium transition-all duration-300"
        >
          {/* Subtle top gradient glow strip */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-accent via-blue-500 to-indigo-500 rounded-t-2xl" />

          <div className="space-y-1.5 text-center lg:text-left">
            <span className="font-mono text-[9px] uppercase tracking-wider text-accent bg-accent/5 px-2 py-0.5 rounded font-bold">CN Gateway</span>
            <h2 className="text-xl font-extrabold text-[#111827] tracking-tight">Sign in to ClassNotes</h2>
            <p className="text-xs text-slate-500 font-medium">
              New to our platform?{' '}
              <Link to="/register" className="font-bold text-accent hover:underline">
                Create an account
              </Link>
            </p>
          </div>

          {/* Form Error Display */}
          {(authError || error) && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-danger/5 border border-danger/25 text-danger rounded-lg text-xs flex items-start gap-2 font-medium"
            >
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{authError || error}</span>
            </motion.div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            {/* Email Field with Floating Label */}
            <div className="relative">
              <input
                id="email"
                type="email"
                autoComplete="email"
                disabled={isLoading || isSuccess}
                {...register('email')}
                placeholder=" "
                className={`peer block w-full rounded-xl border px-3.5 pb-2.5 pt-6 text-xs shadow-xs bg-background/50 focus:bg-white transition-all outline-none focus:ring-4 focus:ring-accent/5 ${
                  errors.email ? 'border-danger focus:border-danger' : 'border-border/60 focus:border-accent'
                }`}
              />
              <label
                htmlFor="email"
                className="absolute left-3.5 top-2 text-[8.5px] font-mono uppercase tracking-wider text-slate-400 pointer-events-none transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-4.5 peer-placeholder-shown:text-slate-400 peer-focus:top-2 peer-focus:text-[8.5px] peer-focus:text-accent font-bold"
              >
                Email Address
              </label>
              {errors.email && (
                <p className="mt-1 text-[10px] text-danger flex items-center gap-1 font-medium">
                  <AlertCircle size={11} />
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password Field with Floating Label & Toggle Eye */}
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                disabled={isLoading || isSuccess}
                {...register('password')}
                placeholder=" "
                className={`peer block w-full rounded-xl border pl-3.5 pr-10 pb-2.5 pt-6 text-xs shadow-xs bg-background/50 focus:bg-white transition-all outline-none focus:ring-4 focus:ring-accent/5 ${
                  errors.password ? 'border-danger focus:border-danger' : 'border-border/60 focus:border-accent'
                }`}
              />
              <label
                htmlFor="password"
                className="absolute left-3.5 top-2 text-[8.5px] font-mono uppercase tracking-wider text-slate-400 pointer-events-none transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-4.5 peer-placeholder-shown:text-slate-400 peer-focus:top-2 peer-focus:text-[8.5px] peer-focus:text-accent font-bold"
              >
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-4 text-slate-400 hover:text-accent transition-colors cursor-pointer select-none active-scale"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
              {errors.password && (
                <p className="mt-1 text-[10px] text-danger flex items-center gap-1 font-medium">
                  <AlertCircle size={11} />
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  disabled={isLoading || isSuccess}
                  {...register('rememberMe')}
                  className="h-4 w-4 rounded border-border text-accent focus:ring-accent bg-background cursor-pointer"
                />
                <label htmlFor="remember-me" className="ml-2 block text-xs font-semibold text-slate-500 cursor-pointer select-none">
                  Remember me
                </label>
              </div>

              <Link to="/forgot-password" className="font-bold text-accent hover:underline">
                Forgot password?
              </Link>
            </div>

            {/* Submit Button (Morphs to Checkmark on success) */}
            <div>
              <button
                type="submit"
                disabled={isLoading || isSuccess}
                className={`w-full flex justify-center items-center py-2.5 px-4 rounded-xl shadow-md text-xs font-bold text-white transition-all active-scale font-mono uppercase tracking-wider cursor-pointer ${
                  isSuccess 
                    ? 'bg-success hover:bg-success border-success' 
                    : 'bg-accent hover:bg-accent/90 hover:shadow-lg'
                }`}
              >
                {isSuccess ? (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                    <Check size={14} className="text-white stroke-[3.5]" />
                  </motion.div>
                ) : isLoading ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </div>
          </form>

          {/* Outlined Google Sign In Button */}
          <div className="space-y-4">
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/40" />
              </div>
              <span className="relative bg-white px-3 text-[9px] font-mono uppercase tracking-wider text-slate-400 font-bold select-none">
                Or continue with
              </span>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading || isSuccess}
              className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-border/60 rounded-xl shadow-xs bg-white text-xs font-bold text-[#111827] hover:bg-slate-50 hover:border-accent/40 hover:text-accent transition-all active-scale cursor-pointer group"
            >
              <svg className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform duration-200" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
              Google Account
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
