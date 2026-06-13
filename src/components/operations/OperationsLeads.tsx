import React, { useState } from 'react';
import { useRole } from '../RoleContext';
import { 
  Users, Briefcase, Camera, Video, Compass, Clock, Clipboard, FileCheck, CheckCircle, Eye, Search, Calendar, MapPin
} from 'lucide-react';
import { Order, CurrentStage, Staff, Equipment } from '../../types';
import { ProjectDetailModal } from '../ProjectDetailModal';

export const OperationsLeads: React.FC = () => {
  const { 
    currentRole, 
    orders, 
    operations, 
    staff, 
    equipment, 
    assignOperations, 
    markEventCompleted, 
    confirmRawFootageReceived 
  } = useRole();

  const canEdit = currentRole === 'Operations Team' || currentRole === 'Business Owner';

  // Search/Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('All');

  // Modals / Selection states
  const [activeModalOrderId, setActiveModalOrderId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [projectDossierId, setProjectDossierId] = useState<string | null>(null);
  
  // Inline edit state for assignment
  const [assigningOrderId, setAssigningOrderId] = useState<string | null>(null);
  const [assignForm, setAssignForm] = useState({
    photographer_assigned: '',
    videographer_assigned: '',
    drone_operator_assigned: '',
    assistant_assigned: '',
    equipment_kit: '',
    reporting_time: '08:00',
    remarks: ''
  });

  // State for completing shoot
  const [closingOrderId, setClosingOrderId] = useState<string | null>(null);
  const [serverPath, setServerPath] = useState('');

  // Filter orders to show confirmed ones for Operations
  const allowedStages = ['Order Confirmed', 'Operations Assigned', 'Event Scheduled', 'Event Completed', 'Raw Footage Received'];
  const operationsOrders = orders.filter(o => {
    // If we're Operations role, we filter strictly to current ops lifecycles
    if (currentRole === 'Operations Team') {
      return allowedStages.includes(o.current_stage);
    }
    return o.current_stage !== 'Closed';
  });

  // Search filtered orders
  const filteredOrders = operationsOrders.filter(o => {
    const text = `${o.order_id} ${o.customer_name} ${o.event_type} ${o.event_location}`.toLowerCase();
    const matchesSearch = text.includes(searchTerm.toLowerCase());
    const matchesStage = stageFilter === 'All' || o.current_stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  const getOpDetails = (orderId: string) => {
    return operations.find(o => o.order_id === orderId);
  };

  const startAssigning = (order: Order) => {
    const op = getOpDetails(order.order_id);
    setAssignForm({
      photographer_assigned: op?.photographer_assigned || '',
      videographer_assigned: op?.videographer_assigned || '',
      drone_operator_assigned: op?.drone_operator_assigned || '',
      assistant_assigned: op?.assistant_assigned || '',
      equipment_kit: op?.equipment_kit || '',
      reporting_time: op?.reporting_time || '08:00',
      remarks: op?.remarks || ''
    });
    setAssigningOrderId(order.order_id);
  };

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningOrderId) return;
    
    // Auto shift status to Operations Assigned if not already something later
    const order = orders.find(o => o.order_id === assigningOrderId);
    const currStage = order ? order.current_stage : 'Order Confirmed';
    const nextStage: CurrentStage = currStage === 'Order Confirmed' ? 'Operations Assigned' : currStage;

    assignOperations(assigningOrderId, {
      ...assignForm,
      current_stage: nextStage
    });

    setAssigningOrderId(null);
    alert(`Personnel and gears allocated successfully to Order [${assigningOrderId}].`);
  };

  const triggerCompletionModal = (orderId: string) => {
    setServerPath(`s3://photocrew-vault-production/2026/${orderId}-shoot/raw/`);
    setClosingOrderId(orderId);
  };

  const handleConfirmCompletion = () => {
    if (!closingOrderId) return;
    markEventCompleted(closingOrderId, serverPath);
    setClosingOrderId(null);
    alert(`Shoot marked completed for [${closingOrderId}]! Raw storage recorded, sent to Editor pipeline.`);
  };

  return (
    <div className="space-y-6">
      {/* Search Header Controls */}
      <div className="bg-zinc-950/40 p-4 rounded-2xl border border-zinc-850 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by Order ID, client, location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
          {['All', 'Order Confirmed', 'Operations Assigned', 'Event Scheduled', 'Event Completed', 'Raw Footage Received'].map((stage) => (
            <button
              key={stage}
              onClick={() => setStageFilter(stage)}
              className={`px-3 py-1.5 text-[11px] font-mono rounded-lg border transition-all truncate cursor-pointer ${
                stageFilter === stage
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 font-bold'
                  : 'bg-transparent border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
              }`}
            >
              {stage === 'All' ? 'Show All' : stage}
            </button>
          ))}
        </div>
      </div>

      {/* Main Board Table */}
      <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl overflow-x-auto shadow-xl">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="border-b border-zinc-850 text-[10px] font-mono tracking-widest uppercase text-zinc-400 bg-zinc-950/70">
              <th className="p-4 font-bold">Order ID</th>
              <th className="p-4 font-bold">Customer Name</th>
              <th className="p-4 font-bold">Event specs</th>
              <th className="p-4 font-bold">Sales Executive</th>
              <th className="p-4 font-bold">Team Deployment Status</th>
              <th className="p-4 font-bold">Current Stage</th>
              <th className="p-4 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-850/60 text-xs">
            {filteredOrders.length > 0 ? (
              filteredOrders.map((ord) => {
                const op = getOpDetails(ord.order_id);
                const hasCrew = op && op.photographer_assigned && op.videographer_assigned;
                const hasEquip = op && op.equipment_kit;
                const isScheduled = ord.current_stage === 'Event Scheduled' || ord.current_stage === 'Event Completed' || ord.current_stage === 'Raw Footage Received';

                return (
                  <tr key={ord.order_id} className="hover:bg-zinc-900/20 transition-all">
                    <td className="p-4">
                      <span className="font-mono text-indigo-400 font-bold bg-slate-900/80 px-2 py-0.5 border border-slate-800 rounded">
                        {ord.order_id}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-zinc-100">{ord.customer_name}</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5 font-mono">{ord.package_name || 'Premium Package'}</div>
                    </td>
                    <td className="p-4 space-y-1">
                      <div className="flex items-center gap-1.5 text-zinc-300">
                        <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{ord.event_date} ({ord.event_type})</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                        <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{ord.event_location}</span>
                      </div>
                    </td>
                    <td className="p-4 text-zinc-400 font-medium">
                      {ord.sales_person || 'N/A'}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${hasCrew ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
                          <span className="text-[11px] text-zinc-300 font-mono">
                            Crew: {hasCrew ? 'Allocated' : 'Pending'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${hasEquip ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
                          <span className="text-[11px] text-zinc-300 font-mono animate-none">
                            Gear: {hasEquip ? 'Provisioned' : 'Unassigned'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${isScheduled ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                          <span className="text-[11px] text-zinc-300 font-mono">
                            Schedule: {isScheduled ? 'Locked' : 'Awaiting'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-extrabold uppercase border ${
                        ord.current_stage === 'Order Confirmed' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                        ord.current_stage === 'Operations Assigned' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' :
                        ord.current_stage === 'Event Scheduled' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        ord.current_stage === 'Event Completed' ? 'bg-rose-500/10 text-rose-450 border-rose-500/20' :
                        ord.current_stage === 'Raw Footage Received' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                        'bg-zinc-800 text-zinc-400 border-zinc-700'
                      }`}>
                        {ord.current_stage}
                      </span>
                    </td>
                    <td className="p-4 text-right space-y-1">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <button
                          onClick={() => {
                            setProjectDossierId(ord.order_id);
                          }}
                          className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded cursor-pointer transition-all border border-zinc-700"
                          title="View Project dossier"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {canEdit && (
                          <button
                            onClick={() => startAssigning(ord)}
                            className="px-2.5 py-1 bg-amber-505 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 font-mono font-bold text-[10px] border border-amber-500/30 rounded cursor-pointer transition-all uppercase"
                          >
                            Assign Crew/Gear
                          </button>
                        )}

                        {canEdit && op && ord.current_stage !== 'Event Completed' && ord.current_stage !== 'Raw Footage Received' && (
                          <button
                            onClick={() => triggerCompletionModal(ord.order_id)}
                            className="px-2.5 py-1 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 font-mono font-bold text-[10px] rounded cursor-pointer transition-all uppercase"
                          >
                            Mark Completed
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="p-12 text-center text-zinc-500">
                  <Clipboard className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                  <p className="text-xs">No matching confirmed orders found in active list.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Slide-over or Inline modal for Crew and Equipment Assignment */}
      {assigningOrderId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl relative animate-in zoom-in duration-200">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-xs font-mono font-black uppercase text-amber-500 flex items-center gap-2">
                <span>⚡</span>
                <span>Assign operations allocation ~ {assigningOrderId}</span>
              </h3>
              <button 
                onClick={() => setAssigningOrderId(null)}
                className="text-zinc-500 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAssignSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Photographer dropdown */}
                <div>
                  <label className="block text-[11px] font-mono font-extrabold uppercase text-zinc-400 mb-1">
                    Photographer Assigned *
                  </label>
                  <select
                    required
                    value={assignForm.photographer_assigned}
                    onChange={(e) => setAssignForm({ ...assignForm, photographer_assigned: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-2 text-xs text-zinc-100"
                  >
                    <option value="">-- Choose Photographer --</option>
                    {staff
                      .filter(s => s.role.toLowerCase().includes('photo') && s.status === 'Active')
                      .map(p => (
                        <option key={p.staff_id} value={p.name}>{p.name} ({p.role})</option>
                      ))}
                    {/* Fallbacks */}
                    <option value="Jack Richards">Jack Richards (default)</option>
                    <option value="Alice Wonderland">Alice Wonderland</option>
                  </select>
                </div>

                {/* Videographer dropdown */}
                <div>
                  <label className="block text-[11px] font-mono font-extrabold uppercase text-zinc-400 mb-1">
                    Videographer Assigned *
                  </label>
                  <select
                    required
                    value={assignForm.videographer_assigned}
                    onChange={(e) => setAssignForm({ ...assignForm, videographer_assigned: e.target.value })}
                    className="w-full bg-zinc-955 border border-zinc-850 rounded-xl px-3 py-2 text-xs text-zinc-100"
                  >
                    <option value="">-- Choose Videographer --</option>
                    {staff
                      .filter(s => s.role.toLowerCase().includes('video') && s.status === 'Active')
                      .map(v => (
                        <option key={v.staff_id} value={v.name}>{v.name} ({v.role})</option>
                      ))}
                    {/* Fallbacks */}
                    <option value="Tina Fey">Tina Fey (default)</option>
                    <option value="Robert Rodriguez">Robert Rodriguez</option>
                  </select>
                </div>

                {/* Drone operator */}
                <div>
                  <label className="block text-[11px] font-zinc-400 font-mono font-extrabold uppercase mb-1">
                    Drone Operator / Aerialist
                  </label>
                  <select
                    value={assignForm.drone_operator_assigned}
                    onChange={(e) => setAssignForm({ ...assignForm, drone_operator_assigned: e.target.value })}
                    className="w-full bg-zinc-955 border border-zinc-850 rounded-xl px-3 py-2 text-xs text-zinc-100"
                  >
                    <option value="">-- None / No Drone --</option>
                    {staff
                      .filter(s => s.role.toLowerCase().includes('drone') && s.status === 'Active')
                      .map(d => (
                        <option key={d.staff_id} value={d.name}>{d.name}</option>
                      ))}
                    <option value="Leo Di Caprio">Leo Di Caprio (guest)</option>
                  </select>
                </div>

                {/* Assistant */}
                <div>
                  <label className="block text-[11px] font-zinc-400 font-mono font-extrabold uppercase mb-1">
                    Production Assistant
                  </label>
                  <select
                    value={assignForm.assistant_assigned}
                    onChange={(e) => setAssignForm({ ...assignForm, assistant_assigned: e.target.value })}
                    className="w-full bg-zinc-955 border border-zinc-850 rounded-xl px-3 py-2 text-xs text-zinc-100"
                  >
                    <option value="">-- None --</option>
                    {staff
                      .filter(s => s.role.toLowerCase().includes('assist') && s.status === 'Active')
                      .map(a => (
                        <option key={a.staff_id} value={a.name}>{a.name}</option>
                      ))}
                    <option value="Steve Rogers">Steve Rogers</option>
                  </select>
                </div>

                {/* Equipment Custom Selection */}
                <div className="col-span-2">
                  <label className="block text-[11px] font-mono font-extrabold uppercase text-zinc-400 mb-1">
                    Assign Equipment Kits & Assemblies
                  </label>
                  <select
                    value={assignForm.equipment_kit}
                    onChange={(e) => setAssignForm({ ...assignForm, equipment_kit: e.target.value })}
                    className="w-full bg-zinc-955 border border-zinc-850 rounded-xl px-3 py-2 text-xs text-zinc-100"
                  >
                    <option value="">-- Select Gear Package --</option>
                    {equipment && equipment.filter(eq => eq.status === 'Available').map(eq => (
                      <option key={eq.equipment_id} value={`${eq.brand} ${eq.model} (${eq.serial_number})`}>
                        {eq.name} [{eq.type}] - {eq.brand}
                      </option>
                    ))}
                    <option value="Kit Gold: Sony A7iv, RED Komodo, DJI Inspire 3 Drone">Kit Gold: Sony A7iv, RED Komodo, DJI Inspire 3 Drone (Master Preset)</option>
                    <option value="Kit Platinum Max: Hasselblad H6D, RED V-Raptor, ARRI Cines">Kit Platinum Max: Hasselblad H6D, RED V-Raptor (Studio Premium)</option>
                  </select>
                </div>

                {/* Reporting Time */}
                <div>
                  <label className="block text-[11px] font-zinc-400 font-mono font-extrabold uppercase mb-1">
                    Reporting Time
                  </label>
                  <input
                    type="time"
                    value={assignForm.reporting_time}
                    onChange={(e) => setAssignForm({ ...assignForm, reporting_time: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-2 text-xs text-zinc-100 font-mono"
                  />
                </div>

                {/* Operations Remarks */}
                <div className="col-span-2">
                  <label className="block text-[11px] font-mono font-extrabold uppercase text-zinc-400 mb-1">
                    Safety Brief or Site clearance notes
                  </label>
                  <textarea
                    rows={2}
                    value={assignForm.remarks}
                    onChange={(e) => setAssignForm({ ...assignForm, remarks: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-2.5 text-xs text-zinc-100"
                    placeholder="Enter site project conditions or specifics..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-zinc-800 pt-3">
                <button
                  type="button"
                  onClick={() => setAssigningOrderId(null)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs rounded-xl cursor-pointer"
                >
                  Confirm Allocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mark Completed Modal */}
      {closingOrderId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-850 rounded-2xl w-full max-w-md shadow-2xl relative p-5 space-y-4">
            <h3 className="text-xs font-mono font-black uppercase text-amber-500 flex items-center gap-1.5">
              <span>🎬</span> Close event shoot ~ {closingOrderId}
            </h3>
            <p className="text-xs text-zinc-400">
              By confirming, this switches status to **Event Completed** and initializes raw footage ingest for editors.
            </p>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-zinc-450 uppercase font-mono">
                Ingest Storage directory bucket path:
              </label>
              <input
                type="text"
                value={serverPath}
                onChange={(e) => setServerPath(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-100 font-mono"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setClosingOrderId(null)}
                className="px-4 py-2 bg-zinc-800 text-zinc-300 text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCompletion}
                className="px-4 py-2 bg-gradient-to-r from-sky-600 to-blue-600 text-white font-semibold text-xs rounded-xl cursor-pointer"
              >
                Ingest & Mark Shoot Completed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Dossier Modal */}
      <ProjectDetailModal 
        isOpen={projectDossierId !== null} 
        onClose={() => setProjectDossierId(null)} 
        orderId={projectDossierId} 
      />
    </div>
  );
};
