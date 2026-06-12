import React, { useState, useEffect } from 'react';
import { RoleProvider, useRole } from './components/RoleContext';
import { RoleSwitcher } from './components/RoleSwitcher';
import { Dashboard } from './components/Dashboard';
import { SalesModule } from './components/SalesModule';
import { OperationsModule } from './components/OperationsModule';
import { ProductionModule } from './components/ProductionModule';
import { StaffManagementModule } from './components/StaffManagementModule';
import { PaymentsModule } from './components/PaymentsModule';
import { OrderSearch } from './components/OrderSearch';
import { LoginScreen } from './components/LoginScreen';
import { UserManagementModule } from './components/UserManagementModule';
import { DatabaseHealthModule } from './components/DatabaseHealthModule';
import { NotificationsModule } from './components/NotificationsModule';
import { AppLogo } from './components/AppLogo';
import { 
  Briefcase, Camera, Video, Landmark, Shield, Users, Search, Info, Target, Sparkles, Menu, RefreshCw, Activity, Bell,
  UserPlus, Truck, Layers, CheckSquare, Clock, Play, BarChart3
} from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { currentUser, currentRole, resetAllData, refreshData, notifications } = useRole();
  
  // Collapse sidebar/hidden by default, read from sessionStorage to persist during session
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    const saved = sessionStorage.getItem('erp_sidebar_state');
    return saved === 'true'; // Default is false (collapsed/hidden by default)
  });

  useEffect(() => {
    sessionStorage.setItem('erp_sidebar_state', sidebarOpen ? 'true' : 'false');
  }, [sidebarOpen]);

  // Sub-tab selection state for production suite
  const [activeSubTab, setActiveSubTab] = useState<'pipeline' | 'production_leads' | 'project_queue' | 'assignments' | 'tracker' | 'delivery' | 'resources' | 'analytics' | 'staff_performance' | 'overall_performance' | 'deliveries_desk' | 'staff_management' | 'notifications'>('production_leads');

  // Initialize correct default tab according to user role to avoid visual flashes
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sales' | 'operations' | 'production' | 'staff_management' | 'notifications' | 'payments' | 'search' | 'users' | 'diagnostics'>(() => {
    const savedUser = localStorage.getItem('erp_current_user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      if (user.role === 'Sales Team') return 'sales';
      if (user.role === 'Operations Team') return 'operations';
      if (user.role === 'Production Team') return 'production';
    }
    return 'dashboard';
  });

  // Responsive tab toggles that collapse sidebar automatically on Tablet / Mobile sizes
  const handleTabSelect = (tab: any) => {
    setActiveTab(tab);
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const handleSubTabSelect = (subTab: any) => {
    setActiveSubTab(subTab);
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  // Guard direct unauthorized access by syncing active tabs with user roles
  useEffect(() => {
    if (currentUser) {
      if (currentRole === 'Sales Team' && activeTab !== 'sales') {
        setActiveTab('sales');
      } else if (currentRole === 'Operations Team' && activeTab !== 'operations') {
        setActiveTab('operations');
      } else if (currentRole === 'Production Team' && activeTab !== 'production' && activeTab !== 'staff_management' && activeTab !== 'notifications') {
        setActiveTab('production');
      }
    }
  }, [currentUser, currentRole, activeTab]);

  // If session is unauthenticated, render the Login screen
  if (!currentUser) {
    return <LoginScreen />;
  }

  // Determine if active tab is write-protected for the current user
  const getWriteStatus = () => {
    if (currentRole === 'Business Owner') {
      return { label: 'STUDIO PRO ADMINISTRATIVE LEVEL // FULL READ-WRITE CLEARANCE', type: 'ok', readonly: false };
    }
    return { label: `ISOLATED DIVISION DESK ACTIVE // WRITING SIGNED FOR ${currentRole.toUpperCase()}`, type: 'ok', readonly: false };
  };

  const writeStatus = getWriteStatus();

  // Helper to render sidebar items to avoid visual design duplication
  const renderSidebarContent = () => (
    <aside className="w-full space-y-4">
      {/* Sidebar Brand Logo Header */}
      <div className="p-3 flex flex-col items-center justify-center relative border-b border-zinc-900/40 pb-5">
        <AppLogo size="md" showTextOnFallback={false} />
        {/* Interactive Close button for Mobile/Tablet */}
        <button
          id="btn_sidebar_close"
          onClick={() => setSidebarOpen(false)}
          className="absolute -top-1 -right-1 lg:hidden p-2 text-zinc-400 hover:text-white bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-850 rounded-xl cursor-pointer flex items-center justify-center transition-all shadow-md h-8 w-8 select-none"
          title="Close Navigation"
        >
          ✕
        </button>
      </div>

      {activeTab === 'production' || currentRole === 'Production Team' ? (
        <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 rounded-2xl border border-zinc-850 p-4 space-y-4 shadow-xl relative">
          {/* Corner calibration tick marks */}
          <div className="absolute top-2 left-2 w-1 h-1 bg-purple-500/50" />
          <div className="absolute top-2 right-2 w-1 h-1 bg-purple-500/50" />
          <div className="absolute bottom-2 left-2 w-1 h-1 bg-purple-500/50" />
          <div className="absolute bottom-2 right-2 w-1 h-1 bg-purple-500/50" />

          <div className="flex items-center justify-between pb-1 border-b border-zinc-850">
            <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-zinc-400 font-mono flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-purple-400" />
              <span>PRODUCTION DESK</span>
            </h3>
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
          </div>

          {/* Return button for Business Owner */}
          {currentRole === 'Business Owner' && (
            <button
              onClick={() => {
                handleTabSelect('dashboard');
              }}
              className="w-full flex items-center gap-2 px-3.5 py-2.5 text-[10px] font-mono uppercase tracking-wider font-extrabold rounded-xl transition-all duration-200 border cursor-pointer border-zinc-800 text-zinc-450 hover:bg-zinc-900/50 hover:text-white"
            >
              <span>←</span>
              <span>Back to Studio Desks</span>
            </button>
          )}

          <nav className="space-y-1.5">
            {[
              { id: 'production_leads', label: 'Production Leads', icon: Sparkles },
              { id: 'staff_management', label: 'Staff Management', icon: UserPlus },
              { id: 'staff_performance', label: 'Staff Performance', icon: Users },
              { id: 'overall_performance', label: 'Overall Performance', icon: BarChart3 },
              { id: 'deliveries_desk', label: 'Deliveries Desk', icon: Truck },
              { id: 'notifications', label: 'Notifications', icon: Bell },
              { id: 'pipeline', label: 'Workflow Board', icon: Layers },
              { id: 'project_queue', label: 'Active Queue', icon: CheckSquare },
              { id: 'assignments', label: 'Staff Assignments', icon: Users },
              { id: 'tracker', label: 'Kanban Tracker', icon: Clock },
              { id: 'resources', label: 'Resources Audit', icon: Play },
              { id: 'analytics', label: 'Studio Analytics', icon: BarChart3 }
            ].map((tab) => {
              const IconComponent = tab.icon;
              const isSelected = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    handleTabSelect('production');
                    handleSubTabSelect(tab.id as any);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-mono uppercase tracking-wider font-extrabold rounded-xl transition-all cursor-pointer border text-left ${
                    isSelected
                      ? 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-400 border-purple-500/30 font-bold'
                      : 'text-zinc-400 bg-transparent border-transparent hover:bg-zinc-900/50 hover:text-white hover:border-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <IconComponent className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-purple-405' : 'text-zinc-500'}`} />
                    <span className="tracking-wide">{tab.label}</span>
                  </div>
                  {isSelected && (
                    <span className="text-[10px] text-purple-400">●</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      ) : (
        <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 rounded-2xl border border-zinc-850 p-4 space-y-4 shadow-xl relative">
          {/* Corner calibration tick marks */}
          <div className="absolute top-2 left-2 w-1 h-1 bg-amber-500/50" />
          <div className="absolute top-2 right-2 w-1 h-1 bg-amber-500/50" />
          <div className="absolute bottom-2 left-2 w-1 h-1 bg-amber-500/50" />
          <div className="absolute bottom-2 right-2 w-1 h-1 bg-amber-500/50" />

          <div className="flex items-center justify-between pb-1 border-b border-zinc-850">
            <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-zinc-400 font-mono flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-amber-500" />
              <span>STUDIO WORKSPACES</span>
            </h3>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
          
          <nav className="space-y-1.5">
            {/* Dashboard tab */}
            {currentRole === 'Business Owner' && (
              <button
                id="tab_dashboard"
                onClick={() => handleTabSelect('dashboard')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 text-left border cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-400 border-amber-500/30 font-bold shadow-[0_0_12px_rgba(245,158,11,0.06)]'
                    : 'text-zinc-400 bg-transparent border-transparent hover:bg-zinc-900/50 hover:text-white hover:border-zinc-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-sm">👑</span>
                  <span className="tracking-wide">Executive Studio Desk</span>
                </div>
                <ChevronRightIcon active={activeTab === 'dashboard'} />
              </button>
            )}

            {/* Sales Module */}
            {(currentRole === 'Business Owner' || currentRole === 'Sales Team') && (
              <button
                id="tab_sales"
                onClick={() => handleTabSelect('sales')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 text-left border cursor-pointer ${
                  activeTab === 'sales'
                    ? 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10 text-emerald-400 border-emerald-500/30 font-bold shadow-[0_0_12px_rgba(16,185,129,0.06)]'
                    : 'text-zinc-400 bg-transparent border-transparent hover:bg-zinc-900/50 hover:text-white hover:border-zinc-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Briefcase className="w-4 h-4 flex-shrink-0 text-emerald-500" />
                  <span className="tracking-wide">Sales & CRM Desk</span>
                </div>
                <ChevronRightIcon active={activeTab === 'sales'} />
              </button>
            )}

            {/* Operations Module */}
            {(currentRole === 'Business Owner' || currentRole === 'Operations Team') && (
              <button
                id="tab_operations"
                onClick={() => handleTabSelect('operations')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 text-left border cursor-pointer ${
                  activeTab === 'operations'
                    ? 'bg-gradient-to-r from-sky-500/10 to-indigo-500/10 text-sky-400 border-sky-500/30 font-bold shadow-[0_0_12px_rgba(56,189,248,0.06)]'
                    : 'text-zinc-400 bg-transparent border-transparent hover:bg-zinc-900/50 hover:text-white hover:border-zinc-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Camera className="w-4 h-4 flex-shrink-0 text-sky-400 animate-pulse" />
                  <span className="tracking-wide">Crew & Gear Call</span>
                </div>
                <ChevronRightIcon active={activeTab === 'operations'} />
              </button>
            )}

            {/* Production Module */}
            {(currentRole === 'Business Owner' || currentRole === 'Production Team') && (
              <button
                id="tab_production"
                onClick={() => handleTabSelect('production')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 text-left border cursor-pointer ${
                  activeTab === 'production'
                    ? 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-400 border-purple-500/30 font-bold shadow-[0_0_12px_rgba(168,85,247,0.06)]'
                    : 'text-zinc-400 bg-transparent border-transparent hover:bg-zinc-900/50 hover:text-white hover:border-zinc-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Video className="w-4 h-4 flex-shrink-0 text-purple-400" />
                  <span className="tracking-wide">VFX Post-Production</span>
                </div>
                <ChevronRightIcon active={activeTab === 'production'} />
              </button>
            )}

            {/* Staff Management Module */}
            {(currentRole === 'Business Owner' || currentRole === 'Production Team') && (
              <button
                id="tab_staff_management"
                onClick={() => handleTabSelect('staff_management')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 text-left border cursor-pointer ${
                  activeTab === 'staff_management'
                    ? 'bg-gradient-to-r from-violet-500/10 to-indigo-505/10 text-violet-450 border-violet-555/35 font-bold shadow-[0_0_12px_rgba(139,92,246,0.06)]'
                    : 'text-zinc-400 bg-transparent border-transparent hover:bg-zinc-900/50 hover:text-white hover:border-zinc-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 flex-shrink-0 text-violet-400" />
                  <span className="tracking-wide">Crew & Staff Registry</span>
                </div>
                <ChevronRightIcon active={activeTab === 'staff_management'} />
              </button>
            )}

            {/* Notifications Module */}
            {(currentRole === 'Business Owner' || currentRole === 'Production Team') && (
              <button
                id="tab_notifications"
                onClick={() => handleTabSelect('notifications')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 text-left border cursor-pointer ${
                  activeTab === 'notifications'
                    ? 'bg-gradient-to-r from-red-500/10 to-orange-500/10 text-red-400 border-red-500/30 font-bold shadow-[0_0_12px_rgba(239,68,68,0.06)]'
                    : 'text-zinc-400 bg-transparent border-transparent hover:bg-zinc-900/50 hover:text-white hover:border-zinc-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <Bell className="w-4 h-4 flex-shrink-0 text-red-400" />
                    {notifications && notifications.some(n => !n.read_status) && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-[8px] text-white font-bold animate-pulse" />
                    )}
                  </div>
                  <span className="tracking-wide">Notifications</span>
                </div>
                <ChevronRightIcon active={activeTab === 'notifications'} />
              </button>
            )}

            {/* Payments Module */}
            {currentRole === 'Business Owner' && (
              <button
                id="tab_payments"
                onClick={() => handleTabSelect('payments')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 text-left border cursor-pointer ${
                  activeTab === 'payments'
                    ? 'bg-gradient-to-r from-amber-500/10 to-rose-500/10 text-rose-455 border-rose-500/30 font-bold shadow-[0_0_12px_rgba(244,63,94,0.06)]'
                    : 'text-zinc-400 bg-transparent border-transparent hover:bg-zinc-900/50 hover:text-white hover:border-zinc-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Landmark className="w-4 h-4 flex-shrink-0 text-rose-500" />
                  <span className="tracking-wide">Ledger Purchases</span>
                </div>
                <ChevronRightIcon active={activeTab === 'payments'} />
              </button>
            )}

            {/* Search Everywhere tab */}
            {currentRole === 'Business Owner' && (
              <button
                id="tab_search"
                onClick={() => handleTabSelect('search')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 text-left border cursor-pointer ${
                  activeTab === 'search'
                    ? 'bg-gradient-to-r from-blue-500/10 to-teal-500/10 text-blue-400 border-blue-500/30 font-bold shadow-[0_0_12px_rgba(59,130,246,0.06)]'
                    : 'text-zinc-400 bg-transparent border-transparent hover:bg-zinc-900/50 hover:text-white hover:border-zinc-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Search className="w-4 h-4 flex-shrink-0 text-blue-400" />
                  <span className="tracking-wide font-sans">Archival Global Search</span>
                </div>
                <ChevronRightIcon active={activeTab === 'search'} />
              </button>
            )}

            {/* Personnel Administration tab */}
            {currentRole === 'Business Owner' && (
              <button
                id="tab_users"
                onClick={() => handleTabSelect('users')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 text-left border cursor-pointer ${
                  activeTab === 'users'
                    ? 'bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 text-violet-400 border-violet-500/30 font-bold shadow-[0_0_12px_rgba(139,92,246,0.06)]'
                    : 'text-zinc-400 bg-transparent border-transparent hover:bg-zinc-900/50 hover:text-white hover:border-zinc-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 flex-shrink-0 text-violet-400" />
                  <span className="tracking-wide">Personnel Security</span>
                </div>
                <ChevronRightIcon active={activeTab === 'users'} />
              </button>
            )}

            {/* Database Health Diagnostics tab */}
            {currentRole === 'Business Owner' && (
              <button
                id="tab_diagnostics"
                onClick={() => handleTabSelect('diagnostics')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 text-left border cursor-pointer ${
                  activeTab === 'diagnostics'
                    ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-400 border-amber-500/30 font-bold shadow-[0_0_12px_rgba(245,158,11,0.06)]'
                    : 'text-zinc-400 bg-transparent border-transparent hover:bg-zinc-900/50 hover:text-white hover:border-zinc-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Activity className="w-4 h-4 flex-shrink-0 text-amber-500" />
                  <span className="tracking-wide text-zinc-300">Database Health Rig</span>
                </div>
                <ChevronRightIcon active={activeTab === 'diagnostics'} />
              </button>
            )}
          </nav>
          
          {/* Divider replaced with subtle spacer at bottom of nav */}
          <div className="my-1" />
        </div>
      )}
    </aside>
  );

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 flex flex-col font-sans antialiased pb-12">
      
      {/* Platform Header with collapsible controller */}
      <RoleSwitcher sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-5 md:p-6 lg:p-8 flex flex-col lg:flex-row gap-6 relative">
        
        {/* DESKTOP SIDEBAR PANEL */}
        {sidebarOpen && (
          <div className="hidden lg:block w-64 flex-shrink-0 transition-all duration-300">
            <div className="sticky top-24">
              {renderSidebarContent()}
            </div>
          </div>
        )}

        {/* MOBILE & TABLET SLIDE-OUT DRAWER */}
        <div 
          className={`fixed inset-y-0 left-0 h-full z-50 bg-[#060608]/95 border-r border-zinc-900 shadow-2xl flex flex-col p-5 overflow-y-auto duration-300 ease-in-out transition-all lg:hidden ${
            sidebarOpen 
              ? 'translate-x-0 w-full sm:w-[320px]' 
              : '-translate-x-full w-full sm:w-[320px]'
          }`}
        >
          {renderSidebarContent()}
        </div>

        {/* OVERLAY BACKDROP FOR DRAWER */}
        {sidebarOpen && (
          <div 
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-xs z-40 lg:hidden transition-all duration-300"
          />
        )}

        {/* Right Side: Active Workspace panel */}
        <main className="flex-1 min-w-0 flex flex-col gap-5">

          {/* Render Active View Container */}
          <div className="bg-transparent rounded-2xl relative">
            {activeTab === 'dashboard' && currentRole === 'Business Owner' && <Dashboard />}
            {activeTab === 'sales' && (currentRole === 'Business Owner' || currentRole === 'Sales Team') && <SalesModule />}
            {activeTab === 'operations' && (currentRole === 'Business Owner' || currentRole === 'Operations Team') && <OperationsModule />}
            {activeTab === 'production' && (currentRole === 'Business Owner' || currentRole === 'Production Team') && (
              <ProductionModule activeSubTab={activeSubTab} setActiveSubTab={setActiveSubTab} />
            )}
            {activeTab === 'staff_management' && (currentRole === 'Business Owner' || currentRole === 'Production Team') && <StaffManagementModule />}
            {activeTab === 'notifications' && (currentRole === 'Business Owner' || currentRole === 'Production Team') && <NotificationsModule />}
            {activeTab === 'payments' && currentRole === 'Business Owner' && <PaymentsModule />}
            {activeTab === 'search' && currentRole === 'Business Owner' && <OrderSearch />}
            {activeTab === 'users' && currentRole === 'Business Owner' && <UserManagementModule />}
            {activeTab === 'diagnostics' && currentRole === 'Business Owner' && <DatabaseHealthModule />}
          </div>
        </main>

      </div>
    </div>
  );
};

// Simple visual indicators helper for sidebar Buttons
const ChevronRightIcon: React.FC<{ active: boolean }> = ({ active }) => {
  return (
    <span className={`text-[10px] text-zinc-650 transition-transform duration-200 ${active ? 'translate-x-0.5 text-amber-400' : 'group-hover:translate-x-0.5'}`}>
      {active ? '●' : '›'}
    </span>
  );
};

export default function App() {
  return (
    <RoleProvider>
      <MainAppContent />
    </RoleProvider>
  );
}
