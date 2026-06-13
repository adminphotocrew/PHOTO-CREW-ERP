import React, { useState } from 'react';
import { useRole } from '../RoleContext';
import { 
  Users, Shield, Calendar, AlertTriangle, CheckCircle, RefreshCw, Briefcase, Sparkles
} from 'lucide-react';

export const TeamAssignments: React.FC = () => {
  const { currentRole, orders, operations, staff } = useRole();

  // Find assigned details if any
  const getOpDetails = (orderId: string) => {
    return operations.find((o) => o.order_id === orderId);
  };

  // Extract all active operations projects
  const activeOps = operations.filter(op => op.event_status !== 'Completed');

  // Let's check for visual booking overlaps or double bookings!
  // Same operator, same date
  const operatorSchedule: Record<string, string[]> = {};
  const doubleBookings: string[] = [];

  activeOps.forEach(op => {
    const order = orders.find(o => o.order_id === op.order_id);
    if (!order) return;
    const date = order.event_date;
    
    const assignedPeople = [
      op.photographer_assigned, 
      op.videographer_assigned, 
      op.drone_operator_assigned, 
      op.assistant_assigned
    ].filter(p => p && p !== 'None');

    assignedPeople.forEach(person => {
      const key = `${person}-${date}`;
      if (operatorSchedule[key]) {
        operatorSchedule[key].push(op.order_id);
        if (!doubleBookings.includes(person)) {
          doubleBookings.push(person);
        }
      } else {
        operatorSchedule[key] = [op.order_id];
      }
    });
  });

  return (
    <div className="space-y-6">
      {/* Dynamic double booking warning banner if any conflicts actually exist */}
      {doubleBookings.length > 0 ? (
        <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-start gap-3 animate-pulse">
          <AlertTriangle className="w-5 h-5 text-rose-450 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-rose-400 font-mono uppercase tracking-wider">DOUBLE-BOOKING DETECTED</h4>
            <p className="text-[11px] text-rose-500/80 mt-1">
              Cross-examination of rosters indicates scheduling conflicts. The following crew members are allocated to multiple shoots on the exact same calendar day: **{doubleBookings.join(', ')}**. Audit allocations in the roster board below.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-zinc-300">
            <strong className="text-zinc-100 font-mono">SCHEDULING RESOLVED:</strong> All field photographer, videographer, drone, and helper schedules are fully integrated, conflict-free, and locked for on-site operations.
          </div>
        </div>
      )}

      {/* Main interactive Board of team assignments */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Active Grid of assignments - Left */}
        <div className="xl:col-span-8 bg-zinc-900/40 border border-zinc-850 rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="text-xs font-mono font-black text-zinc-300 uppercase tracking-widest flex items-center gap-1.5 border-b border-zinc-850 pb-2.5">
            <Shield className="w-4 h-4 text-amber-500" />
            <span>ACTIVE OPERATIONS PROJECT ASSIGNMENTS BOARD</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeOps.length > 0 ? (
              activeOps.map((op) => {
                const order = orders.find(o => o.order_id === op.order_id);
                if (!order) return null;

                return (
                  <div key={op.id} className="p-4 bg-zinc-950/50 border border-zinc-850 rounded-xl space-y-3 hover:border-zinc-800 transition-all">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-850">
                      <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded font-mono font-bold text-indigo-400">
                        {op.order_id}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono">{order.event_date}</span>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-zinc-100">{order.customer_name}</h4>
                      <p className="text-[10px] text-zinc-450 uppercase font-mono">{order.event_type} - {order.event_location}</p>
                    </div>

                    <div className="space-y-1.5 pt-1 text-xs">
                      <span className="text-[9px] uppercase tracking-wider text-zinc-455 font-mono">Operations Squad</span>
                      <div className="grid grid-cols-2 gap-2 text-zinc-300 font-mono text-[11px] bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-850/40">
                        <div className="space-y-0.5">
                          <div className="text-[9px] text-zinc-500 font-bold">📸 PHOTO</div>
                          <div className="truncate font-sans font-bold text-zinc-200">{op.photographer_assigned}</div>
                        </div>
                        <div className="space-y-0.5 border-l border-zinc-850/40 pl-2">
                          <div className="text-[9px] text-zinc-500 font-bold">🎥 VIDEO</div>
                          <div className="truncate font-sans font-bold text-zinc-200">{op.videographer_assigned}</div>
                        </div>
                        {op.drone_operator_assigned !== 'None' && op.drone_operator_assigned && (
                          <div className="col-span-2 border-t border-zinc-850/40 pt-1.5 space-y-0.5">
                            <div className="text-[9px] text-zinc-500 font-bold">🛸 AERIAL PILOT</div>
                            <div className="truncate font-sans font-bold text-zinc-200">{op.drone_operator_assigned}</div>
                          </div>
                        )}
                        {op.assistant_assigned !== 'None' && op.assistant_assigned && (
                          <div className="col-span-2 border-t border-zinc-850/40 pt-1.5 space-y-0.5">
                            <div className="text-[9px] text-zinc-500 font-bold">🤝 OPERATIONS ASSISTANT</div>
                            <div className="truncate font-sans font-bold text-zinc-200">{op.assistant_assigned}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="font-mono text-[10px] text-zinc-400">
                      <div>🛠️ Gear: <span className="text-zinc-200 font-semibold">{op.equipment_kit}</span></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-2 p-10 text-center font-mono text-zinc-550 text-xs">
                No active projects requiring active assignments at the moment.
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Roster Load Monitor - Right */}
        <div className="xl:col-span-4 bg-zinc-900/40 border border-zinc-850 rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="text-xs font-mono font-black text-zinc-350 uppercase tracking-widest flex items-center gap-1.5 border-b border-zinc-850 pb-2.5">
            <Users className="w-4 h-4 text-amber-500" />
            <span>OPERATIVE CAPACITY ANALYSIS</span>
          </h3>

          <div className="space-y-3.5 divide-y divide-zinc-850/60 max-h-[400px] overflow-y-auto pr-1">
            {staff.map((st) => {
              // Count bookings
              const assignedCount = operations.filter(o => 
                (o.photographer_assigned === st.name || 
                 o.videographer_assigned === st.name || 
                 o.drone_operator_assigned === st.name || 
                 o.assistant_assigned === st.name) && 
                o.event_status !== 'Completed'
              ).length;

              return (
                <div key={st.staff_id} className="pt-3 first:pt-0 flex items-center justify-between text-xs font-mono">
                  <div>
                    <div className="font-bold text-zinc-200 font-sans">{st.name}</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">{st.role}</div>
                  </div>

                  <div className="text-right">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      assignedCount >= 2 
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                        : assignedCount === 1 
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                        : 'bg-zinc-950 text-zinc-450 border border-zinc-850'
                    }`}>
                      {assignedCount === 0 ? 'Benched' : `${assignedCount} shoot`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
