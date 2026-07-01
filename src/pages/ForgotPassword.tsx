import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService } from '@/services/auth';
import { ArrowLeft, Key, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
});

type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

import { useDocumentMetadata } from '@/hooks/useDocumentMetadata';

export const ForgotPassword: React.FC = () => {
  useDocumentMetadata('Recover Password', 'Recover your ClassNotes account by requesting a secure password reset verification link.');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccess(false);
    try {
      await authService.sendPasswordReset(data.email);
      setSuccess(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send password reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8 animate-fade-in">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <span className="font-mono text-xs uppercase tracking-wider text-accent font-semibold">Account Recovery</span>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-primary">
            Reset password
          </h2>
          <p className="mt-2 text-sm text-primary/65 font-sans">
            Enter your email and we'll send you recovery details.
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface py-8 px-4 border border-border rounded-lg shadow-sm sm:px-10">
          
          {/* Recovery Success Alert */}
          {success && (
            <div className="mb-5 p-4 bg-success/5 border border-success/25 text-success rounded-md text-xs flex items-start gap-2">
              <CheckCircle size={16} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-0.5">Reset email sent!</p>
                <p className="text-[11px] text-success/80">Please check your inbox (and spam folder) for instructions to reset your password.</p>
              </div>
            </div>
          )}

          {/* Recovery Error Alert */}
          {errorMessage && (
            <div className="mb-4 p-3 bg-danger/5 border border-danger/25 text-danger rounded-md text-xs flex items-start gap-2 animate-pulse-slow">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
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
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-surface bg-accent hover:bg-accent/90 focus:outline-none transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer"
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin mr-2" />
                ) : (
                  <Key size={16} className="mr-2" />
                )}
                Send Reset Link
              </button>
            </div>

            <div className="flex items-center justify-center">
              <Link to="/login" className="flex items-center gap-1.5 font-medium text-xs text-accent hover:underline decoration-accent/30 hover:decoration-accent transition-colors">
                <ArrowLeft size={12} />
                Back to sign in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
