import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  LogIn, 
  KeyRound, 
  Mail, 
  AlertCircle, 
  CheckCircle2, 
  UserCheck, 
  Sparkles,
  ShieldCheck,
  Clock
} from 'lucide-react';
import { INITIAL_DEMO_USERS } from '../../types';

export const LoginView: React.FC = () => {
  const { signIn, sendPasswordReset, createTeamMember } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [seedingAccount, setSeedingAccount] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (isForgotPassword) {
        if (!email.trim()) {
          throw new Error('Please enter your email address to reset password.');
        }
        await sendPasswordReset(email.trim());
        setSuccessMsg(`Password reset email sent to ${email}. Check your inbox!`);
      } else {
        await signIn(email, password);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password. If this is a fresh database, use the Quick Setup below.');
      } else if (err.code === 'auth/wrong-password') {
        setError('Incorrect password. Please try again or use Forgot Password.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please reset your password or try again later.');
      } else {
        setError(err.message || 'Failed to authenticate. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper for 1-click starter account provisioning & login in fresh instances
  const handleQuickSelectAccount = async (account: typeof INITIAL_DEMO_USERS[0]) => {
    setEmail(account.email);
    setPassword('TeamTurbo123!');
    setError('');
    setSuccessMsg('');
  };

  const handleQuickInitializeAndLogin = async (account: typeof INITIAL_DEMO_USERS[0]) => {
    setSeedingAccount(true);
    setError('');
    setSuccessMsg('');
    const defaultPassword = 'TeamTurbo123!';
    try {
      await signIn(account.email, defaultPassword);
    } catch (err: any) {
      console.error("Quick account setup error:", err);
      setError(err.message || 'Failed to sign in. Please verify your credentials.');
    } finally {
      setSeedingAccount(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-slate-100 flex flex-col justify-center items-center p-4 selection:bg-indigo-500 selection:text-white">
      <div className="w-full max-w-md">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 font-bold text-xl text-white shadow-xl shadow-indigo-500/20 mb-4 border border-indigo-400/20">
            TT
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Team Daily Tracker
          </h1>
          <p className="mt-2 text-xs text-slate-400">
            Enterprise work logs, shift attendance & real-time reviews
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-[#161B27] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-md">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500" />
          
          <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
            {isForgotPassword ? (
              <>
                <KeyRound className="w-5 h-5 text-indigo-400" />
                Reset Password
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5 text-indigo-400" />
                Sign In to Workspace
              </>
            )}
          </h2>
          <p className="text-xs text-slate-400 mb-6">
            {isForgotPassword 
              ? 'Enter your work email address to receive password reset instructions.'
              : 'Sign in with your company email and password.'}
          </p>

          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-red-950/40 border border-red-800/50 text-red-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  id="email-input"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@teamturbo.com"
                  className="w-full bg-[#1F2636] border border-slate-700/80 rounded-2xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all pl-10"
                />
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              </div>
            </div>

            {!isForgotPassword && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setError('');
                      setSuccessMsg('');
                    }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="password"
                    id="password-input"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-[#1F2636] border border-slate-700/80 rounded-2xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all pl-10"
                  />
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || seedingAccount}
              className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-2xl text-sm transition-colors shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : isForgotPassword ? (
                'Send Reset Link'
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In
                </>
              )}
            </button>

            {isForgotPassword && (
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setError('');
                  setSuccessMsg('');
                }}
                className="w-full text-center text-xs text-slate-400 hover:text-slate-200 mt-2 transition-colors py-1"
              >
                Back to Sign In
              </button>
            )}
          </form>

          {/* Quick Demo Team Member Selector */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Quick Test Accounts
              </span>
              <span className="text-[10px] text-slate-500">1-Click Launch</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {INITIAL_DEMO_USERS.map((user) => (
                <button
                  key={user.email}
                  type="button"
                  disabled={seedingAccount || loading}
                  onClick={() => handleQuickInitializeAndLogin(user)}
                  className="flex items-start p-2.5 rounded-2xl bg-[#1F2636] border border-slate-700/60 hover:border-indigo-500/50 hover:bg-slate-800 transition-all text-left group"
                >
                  <div className="w-7 h-7 rounded-xl bg-slate-800 group-hover:bg-indigo-600/30 text-slate-300 group-hover:text-indigo-300 flex items-center justify-center text-xs font-semibold shrink-0 mr-2.5 transition-colors border border-slate-700/50">
                    {user.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-white truncate group-hover:text-indigo-400">
                        {user.name}
                      </p>
                      {user.role === 'admin' && (
                        <span className="text-[9px] px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-md font-semibold">
                          Lead
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">
                      {user.designation}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <p className="text-[10px] text-slate-500 text-center mt-3">
              Default demo password: <code className="text-slate-300">TeamTurbo123!</code>
            </p>
          </div>

        </div>

        {/* Footer Note */}
        <p className="text-center text-xs text-slate-500 mt-6 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Secured with Firebase Authentication & Cloud Firestore
        </p>

      </div>
    </div>
  );
};
