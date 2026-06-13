import React from 'react';
import { useRole } from '../RoleContext';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  BarChart3, Shield, Users, Camera, CheckCircle
} from 'lucide-react';

export const OperationsAnalytics: React.FC = () => {
  const { orders, operations, equipment, staff } = useRole();

  // 1. Calculations for KPIs
  const totalLeads = orders.filter(o => o.current_stage !== 'Closed').length;
  const assignedLeads = operations.filter(op => op.photographer_assigned && op.videographer_assigned).length;
  const pendingLeads = totalLeads - assignedLeads;

  const totalGears = equipment.reduce((acc, current) => acc + (current.quantity || 1), 0);
  const activeStaff = staff.filter(s => s.status === 'Active').length;

  const allocationRate = totalLeads > 0 ? Math.round((assignedLeads / totalLeads) * 100) : 100;

  // 2. Equipment Status Distribution for PieChart
  const equipmentStatusMap: Record<string, number> = {};
  equipment.forEach(eq => {
    equipmentStatusMap[eq.status] = (equipmentStatusMap[eq.status] || 0) + eq.quantity;
  });

  const equipmentStatusData = Object.entries(equipmentStatusMap).map(([name, value]) => ({
    name,
    value
  }));

  // 3. Equipment Type Inventory Chart
  const equipmentTypeMap: Record<string, number> = {};
  equipment.forEach(eq => {
    equipmentTypeMap[eq.type] = (equipmentTypeMap[eq.type] || 0) + eq.quantity;
  });

  const equipmentTypeData = Object.entries(equipmentTypeMap).map(([name, value]) => ({
    name,
    quantity: value
  }));

  // Colors
  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#6B7280'];

  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Pipeline Orders', val: totalLeads, desc: 'Not Closed', icon: Shield, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
          { label: 'Roster Allocation Rate', val: `${allocationRate}%`, desc: `${assignedLeads} of ${totalLeads} allocated`, icon: Users, color: 'text-sky-400', bg: 'bg-sky-500/10' },
          { label: 'On-Call Crew Personnel', val: activeStaff, desc: 'Active operatives', icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Total Inventory Fleet', val: totalGears, desc: 'Assembled equipment', icon: Camera, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        ].map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="p-4 bg-zinc-900/40 border border-zinc-850 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden backdrop-blur-xs">
              <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">{kpi.label}</span>
              <div className="mt-2.5 flex items-baseline justify-between select-none">
                <span className={`text-2xl font-black font-mono tracking-tight ${kpi.color}`}>{kpi.val}</span>
                <span className={`p-1.5 rounded-lg ${kpi.bg}`}>
                  <Icon className={`w-4 h-4 ${kpi.color}`} />
                </span>
              </div>
              <span className="text-[9px] text-zinc-450 mt-1 font-mono">{kpi.desc}</span>
            </div>
          );
        })}
      </div>

      {/* Visual Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Equipment Categories */}
        <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-5 shadow-xl">
          <div className="border-b border-zinc-850 pb-3 mb-4 flex items-center justify-between">
            <h4 className="text-xs font-mono font-black text-zinc-300 uppercase tracking-widest flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-amber-500" />
              <span>EQUIPMENT DISTRIBUTED BY CATEGORY</span>
            </h4>
          </div>

          <div className="h-64 font-mono text-[10px] text-zinc-400">
            {equipmentTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={equipmentTypeData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <XAxis dataKey="name" stroke="#52525b" fontSize={9} tickLine={false} />
                  <YAxis stroke="#52525b" fontSize={9} tickLine={false} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '12px' }}
                    labelStyle={{ color: '#f4f4f5', fontWeight: 'bold' }}
                    itemStyle={{ color: '#f59e0b' }}
                  />
                  <Bar dataKey="quantity" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-550 italic">
                Inventory data loading or insufficient.
              </div>
            )}
          </div>
        </div>

        {/* Pie Chart - Fleet Status Use */}
        <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-5 shadow-xl">
          <div className="border-b border-zinc-850 pb-3 mb-4 flex items-center justify-between">
            <h4 className="text-xs font-mono font-black text-zinc-300 uppercase tracking-widest flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-emerald-500" />
              <span>FLEET LIFE-CYCLE STATE SEGMENTATION</span>
            </h4>
          </div>

          <div className="h-64 font-mono text-[10px] text-zinc-400 flex flex-col md:flex-row items-center justify-center">
            {equipmentStatusData.length > 0 ? (
              <>
                <div className="w-full md:w-1/2 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={equipmentStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {equipmentStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '12px' }}
                        itemStyle={{ color: '#f4f4f5' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full md:w-1/2 space-y-1.5 mt-4 md:mt-0 px-4">
                  {equipmentStatusData.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <span className="text-zinc-400 capitalize">{item.name}</span>
                      </div>
                      <span className="text-zinc-200 font-bold font-mono">{item.value} units</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-550 italic">
                Roster lifecycle metrics empty.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
