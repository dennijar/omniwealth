import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Shield, Mail, Lock, Loader2, Info, User, Phone, Eye, EyeOff, Check, X } from 'lucide-react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

export const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState<string | undefined>('+62');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);

  const hasLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>\-_+=\[\]\\]/.test(password);
  const isMatch = confirmPassword.length > 0 && password === confirmPassword;

  const isValidSignUp = fullName && phoneNumber && email && hasLength && hasUpper && hasNumber && hasSpecial && isMatch;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setAuthError('Please enter both email and password.');
      return;
    }

    if (isSignUp) {
      if (!isValidSignUp) {
        setAuthError('Please ensure all required fields and password rules are met.');
        return;
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setAuthError("Please enter a valid email address.");
      return;
    }
    
    setLoading(true);
    setAuthError(null);

    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              phone_number: phoneNumber,
            }
          }
        });
        if (signUpError) throw signUpError;
        setAuthError('Check your email for the confirmation link.');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setAuthError(err.message || 'Google Auth failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden">
      <style>{`
        .PhoneInput {
          --PhoneInput-color--focus: transparent;
          --PhoneInputInternationalIconPhone-opacity: 0.8;
          --PhoneInputInternationalIconGlobe-opacity: 0.65;
          --PhoneInputCountrySelect-marginRight: 0.5rem;
          --PhoneInputCountrySelectArrow-width: 0.3rem;
          --PhoneInputCountrySelectArrow-marginLeft: 0.3rem;
          --PhoneInputCountrySelectArrow-borderWidth: 1px;
          --PhoneInputCountrySelectArrow-opacity: 0.45;
          --PhoneInputCountrySelectArrow-color: inherit;
          --PhoneInputCountrySelectArrow-color--focus: inherit;
          --PhoneInputCountrySelectArrow-transform: rotate(45deg);
          --PhoneInputCountryFlag-aspectRatio: 1.5;
          --PhoneInputCountryFlag-height: 1.2rem;
          --PhoneInputCountryFlag-borderWidth: 1px;
          --PhoneInputCountryFlag-borderColor: rgba(255,255,255,0.1);
          --PhoneInputCountryFlag-borderColor--focus: rgba(255,255,255,0.1);
          --PhoneInputCountryFlag-backgroundColor--loading: rgba(255,255,255,0.05);
        }
        .PhoneInputInput {
          background: transparent !important;
          border: none !important;
          color: white !important;
          font-size: 0.875rem !important;
          outline: none !important;
        }
        .PhoneInputInput::placeholder {
          color: #475569 !important; /* slate-600 */
        }
      `}</style>
      
      {/* Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-96 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 sm:p-10 shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)] z-10">
        
        {/* Header */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/25 mb-6">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">OmniWealth</h1>
          <p className="text-slate-400 text-center">Secure your financial legacy</p>
        </div>

        {/* OAuth Buttons */}
        <button
          onClick={signInWithGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white text-slate-900 py-3 rounded-xl font-bold hover:bg-slate-100 transition-all disabled:opacity-50 mb-6"
        >
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Or</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Email Form */}
        <form onSubmit={handleEmailAuth} className="flex flex-col gap-4">
          {isSignUp && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-1">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-slate-500" />
                  </div>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => { setFullName(e.target.value); setAuthError(null); }}
                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-1">Phone Number</label>
                <div className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 px-4 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all text-sm">
                  <PhoneInput
                    international
                    defaultCountry="ID"
                    value={phoneNumber}
                    onChange={setPhoneNumber}
                    className="w-full flex items-center gap-2"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-1">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-4 w-4 text-slate-500" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setAuthError(null); }}
                className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5 ml-1">
              <label className="block text-xs font-medium text-slate-400">Password</label>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-slate-500" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setAuthError(null); }}
                className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 pl-11 pr-11 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                placeholder="••••••••"
                autoComplete={isSignUp ? "new-password" : "current-password"}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-4 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-slate-500 hover:text-slate-300 transition-colors" />
                ) : (
                  <Eye className="h-4 w-4 text-slate-500 hover:text-slate-300 transition-colors" />
                )}
              </button>
            </div>
          </div>

          {isSignUp && (
            <div>
              <div className="flex justify-between items-center mb-1.5 ml-1">
                <label className="block text-xs font-medium text-slate-400">Confirm Password</label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setAuthError(null); }}
                  className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 pl-11 pr-11 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-slate-500 hover:text-slate-300 transition-colors" />
                  ) : (
                    <Eye className="h-4 w-4 text-slate-500 hover:text-slate-300 transition-colors" />
                  )}
                </button>
              </div>
            </div>
          )}

          {isSignUp && (
            <div className="mt-2 space-y-1.5 px-1 pb-2">
              <div className="flex items-center gap-2">
                {hasLength ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <X className="w-3.5 h-3.5 text-slate-500" />}
                <span className={`text-xs ${hasLength ? 'text-emerald-500' : 'text-slate-500'}`}>At least 8 characters</span>
              </div>
              <div className="flex items-center gap-2">
                {hasUpper ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <X className="w-3.5 h-3.5 text-slate-500" />}
                <span className={`text-xs ${hasUpper ? 'text-emerald-500' : 'text-slate-500'}`}>At least one uppercase letter</span>
              </div>
              <div className="flex items-center gap-2">
                {hasNumber ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <X className="w-3.5 h-3.5 text-slate-500" />}
                <span className={`text-xs ${hasNumber ? 'text-emerald-500' : 'text-slate-500'}`}>At least one number</span>
              </div>
              <div className="flex items-center gap-2">
                {hasSpecial ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <X className="w-3.5 h-3.5 text-slate-500" />}
                <span className={`text-xs ${hasSpecial ? 'text-emerald-500' : 'text-slate-500'}`}>At least one special character</span>
              </div>
              {confirmPassword.length > 0 && (
                <div className="flex items-center gap-2">
                  {isMatch ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <X className="w-3.5 h-3.5 text-rose-500" />}
                  <span className={`text-xs ${isMatch ? 'text-emerald-500' : 'text-rose-500'}`}>Passwords match</span>
                </div>
              )}
            </div>
          )}

          {authError && (
            <p className="text-sm text-red-500 mb-4 text-center">{authError}</p>
          )}

          <button
            type="submit"
            disabled={loading || (isSignUp && !isValidSignUp)}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-slate-400">
          {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
          <button 
            type="button" 
            onClick={() => { setIsSignUp(!isSignUp); setAuthError(null); }} 
            className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
};
