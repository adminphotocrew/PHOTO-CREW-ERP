import React, { useState } from 'react';
import { useRole } from './RoleContext';
import { 
  Lock, Mail, Eye, EyeOff, ShieldCheck, ArrowRight, ShieldAlert, KeyRound, Hammer, Aperture, Camera, Target
} from 'lucide-react';
import { UserRole } from '../types';

export const LoginScreen: React.FC = () => {
  const { login, users, resetAllData } = useRole();

  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!emailOrUsername.trim()) {
      setError('Please provide your Username or Email address.');
      return;
    }
    if (!password) {
      setError('Please provide your account password.');
      return;
    }

    setIsLoading(true);

    // Minor simulated delay for excellent UI feedback
    setTimeout(() => {
      const result = login(emailOrUsername, password);
      setIsLoading(false);
      if (!result.success) {
        setError(result.error || 'Authentication failed. Incorrect email or password.');
      }
    }, 700);
  };

  const handleDemoFill = (email: string, pass: string) => {
    setEmailOrUsername(email);
    setPassword(pass);
    setError(null);
  };

  // Resolve role instructions/badges
  const getRoleTheme = (role: UserRole) => {
    switch (role) {
      case 'Business Owner':
        return { bg: 'bg-amber-500/10 text-amber-300 border-amber-500/20', desc: 'Full Access (CEO Mode)' };
      case 'Sales Team':
        return { bg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20', desc: 'Leads & Quotations' };
      case 'Operations Team':
        return { bg: 'bg-sky-500/10 text-sky-300 border-sky-500/20', desc: 'Crews & Events' };
      case 'Production Team':
        return { bg: 'bg-purple-500/10 text-purple-300 border-purple-500/20', desc: 'Raw Footage & Editing' };
    }
  };

  return (
    <div id="login_screen" className="min-h-screen bg-black text-zinc-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden font-sans antialiased">
      
      {/* Decorative cinematic photography lens lighting spots */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-r from-amber-500/10 to-orange-550/0 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-l from-indigo-500/10 to-purple-550/0 blur-[130px] pointer-events-none" />

      {/* Grid Alignment */}
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch z-10 relative">
        
        {/* Left Card: Beautiful Splash / Info Inspired by Premium Videography */}
        <div className="md:col-span-5 bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 border border-zinc-800/80 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden">
          {/* Subtle color grade stripe */}
          <div className="absolute top-0 inset-x-0 color-grade-stripe" />
          
          <div className="space-y-6 pt-4">
            <div className="relative inline-flex p-3 bg-amber-500/10 border border-amber-500/25 rounded-2xl">
              <Aperture className="w-6 h-6 text-amber-400 rotate-45" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            
            <div>
              <span className="text-[10px] uppercase font-mono font-black tracking-[0.25em] text-amber-450 block">
                CREATIVE STUDIO SUITE
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-white mt-1 tracking-tight">
                PHOTO CREW ERP
              </h1>
              <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
                A secure, premium workspace handling customer enquiries, crew schedule cards, drone operator dispatch, post-production pipelines, and master ledger clearances.
              </p>
            </div>

            <div className="border-t border-zinc-850 pt-5 space-y-4">
              <span className="text-[10px] uppercase font-mono font-black tracking-widest text-zinc-400 block">
                CAMERA RANGE STAGES //
              </span>
              <ul className="space-y-3.5 text-xs text-zinc-400">
                <li className="flex items-start gap-2.5">
                  <span className="text-amber-400 font-bold mt-0.5">•</span>
                  <span><strong>Focal State Gateways:</strong> Distinct role desks for sales, operations, editing and finance.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-amber-400 font-bold mt-0.5">•</span>
                  <span><strong>Capture Audit Ledger:</strong> Real-time logging of customer contracts and raw footage ingests.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-amber-400 font-bold mt-0.5">•</span>
                  <span><strong>Stability Confirmed:</strong> Integrated sandbox with pre-loaded leads, payments, and timeline logs.</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 border-t border-zinc-850/80 pt-4 flex items-center justify-between">
            <span className="text-[10px] text-zinc-500 font-mono tracking-wider">SECURE NODE // v3.4</span>
            <button 
              onClick={() => {
                if (confirmReset) {
                  resetAllData();
                  setConfirmReset(false);
                } else {
                  setConfirmReset(true);
                }
              }}
              onMouseLeave={() => setConfirmReset(false)}
              className={`text-[10px] font-mono font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                confirmReset
                  ? 'text-amber-400 bg-amber-500/20 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                  : 'text-zinc-400 hover:text-amber-400 bg-zinc-950 border-zinc-900 hover:border-zinc-800'
              }`}
            >
              <Hammer className="w-3.5 h-3.5 text-amber-500" />
              <span>{confirmReset ? 'Confirm Reset Sandbox?' : 'Hard Reset Sandbox'}</span>
            </button>
          </div>
        </div>

        {/* Right Card: Login Card & Demo Directory */}
        <div className="md:col-span-7 flex flex-col gap-5">
          
          {/* Main Log in Box */}
          <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-900 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
            {/* Viewfinder Corner Highlights */}
            <div className="absolute top-4 left-4 viewfinder-corner-tl" />
            <div className="absolute top-4 right-4 viewfinder-corner-tr" />
            <div className="absolute bottom-4 left-4 viewfinder-corner-bl" />
            <div className="absolute bottom-4 right-4 viewfinder-corner-br" />

            <div className="mb-6">
              <h2 className="text-base font-black uppercase tracking-wider text-white font-sans flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-500" />
                <span>SECURE USER SIGN-IN</span>
              </h2>
              <p className="text-xs text-zinc-405 mt-1">Authenticate credentials to access division desk.</p>
            </div>

            {/* Error Area */}
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3.5 rounded-xl text-xs flex items-start gap-2.5 mb-5 font-sans animate-pulse">
                <ShieldAlert className="w-4 h-4 text-rose-450 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold">Authentication Refused</h4>
                  <p className="text-[11px] opacity-90 mt-0.5">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 font-sans">
              
              {/* Field 1: Email Or Username */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 font-mono flex items-center justify-between">
                  <span>OPERATIVE USERNAME OR EMAIL</span>
                  <span className="text-[9px] text-zinc-550 font-normal">REQUIRED</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    placeholder="Enter email or username index key..."
                    value={emailOrUsername}
                    onChange={(e) => setEmailOrUsername(e.target.value)}
                    disabled={isLoading}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl pl-11 pr-4 py-3.5 text-xs text-zinc-100 placeholder-zinc-700 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 font-medium transition-all"
                  />
                </div>
              </div>

              {/* Field 2: Password */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 font-mono flex items-center justify-between">
                  <span>SECRET PASSWORD</span>
                  <span className="text-[9px] text-zinc-550 font-normal">REQUIRED</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl pl-11 pr-11 py-3.5 text-xs text-zinc-100 placeholder-zinc-700 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 font-medium tracking-wide transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-505 hover:opacity-90 disabled:opacity-50 text-black py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2 mt-4"
              >
                {isLoading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    <span>Validating credentials...</span>
                  </>
                ) : (
                  <>
                    <span>DECRYPT & AUTHENTICATE</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

            </form>
          </div>

          {/* Quick Demo Directory */}
          <div className="bg-zinc-900/30 border border-zinc-900 rounded-3xl p-5 space-y-4 shadow-xl">
            <span className="text-[10px] font-black uppercase font-mono tracking-widest text-zinc-400 flex items-center gap-1.5 pl-1">
              <KeyRound className="w-3.5 h-3.5 text-amber-500" />
              <span>Demo Direct Access Index (Click to Auto-fill)</span>
            </span>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {users.map((usr) => {
                const theme = getRoleTheme(usr.role);
                const isInactive = !usr.active;
                return (
                  <button
                    key={usr.id}
                    onClick={() => handleDemoFill(usr.email, usr.password || 'owner123')}
                    title={`Click to fill ${usr.name}`}
                    className={`p-3 bg-zinc-950 rounded-xl border text-left transition-all duration-150 group cursor-pointer ${
                      isInactive 
                        ? 'opacity-30 border-zinc-900' 
                        : 'border-zinc-850 hover:border-amber-500/40 hover:bg-zinc-950/80 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-200 group-hover:text-amber-400 transition-colors">
                        {usr.name}
                      </span>
                      {isInactive && (
                        <span className="text-[8px] bg-rose-500/20 text-rose-400 px-1 border border-rose-500/10 rounded font-mono uppercase">
                          Deactivated
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-500 truncate mt-0.5 font-mono">{usr.email}</p>
                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-zinc-900/50 text-[9px]">
                      <span className={`px-1.5 py-0.5 rounded font-mono uppercase tracking-wider text-[8px] font-bold ${theme.bg}`}>
                        {usr.role.replace(' Team', '')}
                      </span>
                      <span className="font-mono text-zinc-600 select-all group-hover:text-zinc-400">
                        {usr.password || 'temp123'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
