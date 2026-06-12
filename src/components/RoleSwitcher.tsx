import React, { useState } from 'react';
import { useRole } from './RoleContext';
import { Aperture, UserCircle, RefreshCw, LogOut, Film, Shield, Menu } from 'lucide-react';
import { UserRole } from '../types';
import { AppLogo } from './AppLogo';

interface RoleSwitcherProps {
  sidebarOpen?: boolean;
  setSidebarOpen?: (open: boolean) => void;
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const { currentRole, currentUser, logout, refreshData } = useRole();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    refreshData();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  if (!currentUser) return null;

  const getRoleBadgeStyle = (role: UserRole) => {
    switch (role) {
      case 'Business Owner':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.1)]';
      case 'Sales Team':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40';
      case 'Operations Team':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/40';
      case 'Production Team':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/40';
    }
  };

  const getSubtextForRole = (role: UserRole) => {
    switch (role) {
      case 'Business Owner':
        return 'Studio Director & Producer';
      case 'Sales Team':
        return 'Creative Agent & Lead Curator';
      case 'Operations Team':
        return 'Crew Manager & Gear Logistics';
      case 'Production Team':
        return 'Editorial Post-Production Editor';
    }
  };

  return (
    <header className="bg-black/90 border-b border-zinc-900 backdrop-blur-md py-4 px-4 sm:px-6 sticky top-0 z-50 shadow-2xl font-sans">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        
        {/* Left Side: Stunning Studio Logo & Active Login Context */}
        <div className="flex items-center gap-3.5">
          {setSidebarOpen && (
            <button
              id="header_sidebar_toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 mr-1 flex items-center justify-center bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-zinc-800 rounded-xl transition-all cursor-pointer shadow-md select-none"
              title={sidebarOpen ? "Hide Navigation Sidebar" : "Show Navigation Sidebar"}
            >
              <Menu className="w-5 h-5 text-amber-500" />
            </button>
          )}
          <div className="flex items-center justify-center">
            <AppLogo size="sm" showTextOnFallback={false} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black tracking-[0.25em] text-zinc-100 font-mono">
                PHOTO CREW
              </span>
              <span className="px-1.5 py-0.5 bg-gradient-to-r from-amber-500/20 to-orange-550/20 text-[9px] font-bold text-amber-400 rounded-sm font-mono tracking-widest border border-amber-500/20">
                PRO-ERP
              </span>
              <span className={`text-[9.5px] px-2.5 py-0.5 rounded font-mono font-bold border ${getRoleBadgeStyle(currentRole)}`}>
                {currentRole.toUpperCase()}
              </span>
            </div>
            
            <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-1.5">
              <UserCircle className="w-3.5 h-3.5 text-amber-405" />
              <span className="text-[11px]">
                Active: <strong className="text-zinc-200 font-bold">{currentUser.name}</strong> 
                <span className="text-zinc-500 text-[10px] ml-1 font-mono">({currentUser.email})</span>
              </span>
              <span className="hidden md:inline px-2 py-0.5 text-[10px] text-zinc-400 bg-zinc-900 border border-zinc-800 rounded font-mono">
                {getSubtextForRole(currentRole)}
              </span>
            </p>
          </div>
        </div>

        {/* Right Side: Secure Actions */}
        <div className="flex items-center justify-end gap-3">
          {/* Refresh Data */}
          <button
            id="btn_refresh_data_header"
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-1.5 text-[11px] font-bold transition-all duration-200 cursor-pointer shadow-md rounded-xl bg-emerald-500/5 hover:bg-emerald-500/15 text-emerald-400 border border-emerald-500/10 hover:border-emerald-500/35"
            title="Refresh Displayed Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-450 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {/* Log out */}
          <button
            id="btn_logout"
            onClick={() => {
              logout();
            }}
            className="flex items-center gap-2 px-4 py-1.5 text-[11px] font-bold transition-all duration-200 cursor-pointer shadow-md rounded-xl bg-rose-500/5 hover:bg-rose-500/15 text-rose-400 border border-rose-500/10 hover:border-rose-500/30"
            title="Securely log out"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span>Logout</span>
          </button>
        </div>

      </div>
    </header>
  );
};

