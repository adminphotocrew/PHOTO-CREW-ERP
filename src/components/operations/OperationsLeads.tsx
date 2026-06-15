import React, { useState, useMemo } from 'react';
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
    confirmRawFootageReceived,
    rawFootage,
    staffAssignments,
    saveStaffAssignments
  } = useRole();

  const canEdit = currentRole === 'Operations Team' || currentRole === 'Business Owner';

  // Anchor date June 15, 2026
  const todayStr = "2026-06-15";

  // Search/Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<string>('All');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Sorting state
  const [sortBy, setSortBy] = useState<'event_date' | 'customer_name' | 'status' | 'assignment_date'>('event_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Dual Dropdown and Multi-Staff Assign State
  const [activeAssignments, setActiveAssignments] = useState<{ staff_role: string; staff_id: string; staff_name: string }[]>([]);
  const [selectedRole, setSelectedRole] = useState('Lead Photographer');
  const [selectedStaff, setSelectedStaff] = useState('');

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
    remarks: '',
    event_status: 'Assigned' as 'Assigned' | 'Completed',
    current_stage: 'Order Confirmed' as CurrentStage,
    raw_footage_link: ''
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

  // Unique staff lists for individual filters
  const photographersList = useMemo(() => {
    return staff ? Array.from(new Set(staff.filter(s => s.role.toLowerCase().includes('photo')).map(s => s.name))) : [];
  }, [staff]);

  const videographersList = useMemo(() => {
    return staff ? Array.from(new Set(staff.filter(s => s.role.toLowerCase().includes('video')).map(s => s.name))) : [];
  }, [staff]);

  const droneOperatorsList = useMemo(() => {
    return staff ? Array.from(new Set(staff.filter(s => s.role.toLowerCase().includes('drone') || s.role.toLowerCase().includes('aerial')).map(s => s.name))) : [];
  }, [staff]);

  const assistantsList = useMemo(() => {
    return staff ? Array.from(new Set(staff.filter(s => s.role.toLowerCase().includes('assist') || s.role.toLowerCase().includes('production')).map(s => s.name))) : [];
  }, [staff]);

  // Search filtered orders
  const isWithinDateRange = (dateStr: string, filterType: string, customStart?: string, customEnd?: string) => {
    if (!dateStr) return false;
    
    // Normalise dateStr
    let normStr = dateStr;
    if (dateStr.includes('T')) {
      normStr = dateStr.split('T')[0];
    }
    const itemDate = new Date(normStr);
    itemDate.setHours(0, 0, 0, 0);

    const today = new Date(todayStr); // anchor at 2026-06-15
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (filterType === 'Today') {
      return itemDate.getTime() === today.getTime();
    }
    if (filterType === 'Tomorrow') {
      return itemDate.getTime() === tomorrow.getTime();
    }
    if (filterType === 'This Week') {
      // Calculate start and end of week (June 15 to June 21, 2026)
      const startOfWeek = new Date(today); // June 15
      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() + 6); // June 21
      return itemDate >= startOfWeek && itemDate <= endOfWeek;
    }
    if (filterType === 'This Month') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return itemDate >= startOfMonth && itemDate <= endOfMonth;
    }
    if (filterType === 'Custom') {
      if (!customStart && !customEnd) return true;
      const start = customStart ? new Date(customStart) : null;
      if (start) start.setHours(0, 0, 0, 0);
      const end = customEnd ? new Date(customEnd) : null;
      if (end) end.setHours(23, 59, 59, 999);
      
      if (start && end) return itemDate >= start && itemDate <= end;
      if (start) return itemDate >= start;
      if (end) return itemDate <= end;
    }
    return true;
  };

  const getOpDetails = (orderId: string) => {
    return operations.find(o => o.order_id === orderId);
  };

  const filteredOrders = useMemo(() => {
    return operationsOrders.filter(o => {
      // Search term validation (Search by Customer Name, Order ID, Mobile Number)
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesSearch = 
          o.order_id.toLowerCase().includes(term) ||
          o.customer_name.toLowerCase().includes(term) ||
          (o.mobile && o.mobile.toLowerCase().includes(term));
        if (!matchesSearch) return false;
      }

      // 1. Status Dropdown filter
      if (statusFilter !== 'All') {
        const isStaffAssigned = staffAssignments ? staffAssignments.some(x => x.order_id === o.order_id) : false;
        
        if (statusFilter === 'Order Confirmed' && o.current_stage !== 'Order Confirmed') return false;
        if (statusFilter === 'Operations Assigned' && o.current_stage !== 'Operations Assigned') return false;
        if (statusFilter === 'Staff Assigned' && !isStaffAssigned) return false;
        if (statusFilter === 'Event Scheduled' && o.current_stage !== 'Event Scheduled') return false;
        if (statusFilter === 'Event Completed' && o.current_stage !== 'Event Completed') return false;
        if (statusFilter === 'Raw Footage Received' && o.current_stage !== 'Raw Footage Received') return false;
      }

      // 2. Date Filter based on Event Date
      if (dateFilter !== 'All') {
        if (!isWithinDateRange(o.event_date, dateFilter, customStartDate, customEndDate)) {
          return false;
        }
      }

      return true;
    });
  }, [
    operationsOrders,
    searchTerm,
    statusFilter,
    dateFilter,
    customStartDate,
    customEndDate,
    staffAssignments
  ]);

  // Sorted list implementation
  const sortedOrders = useMemo(() => {
    const list = [...filteredOrders];
    list.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      if (sortBy === 'customer_name') {
        valA = a.customer_name.toLowerCase();
        valB = b.customer_name.toLowerCase();
      } else if (sortBy === 'event_date') {
        valA = a.event_date;
        valB = b.event_date;
      } else if (sortBy === 'status') {
        valA = a.current_stage.toLowerCase();
        valB = b.current_stage.toLowerCase();
      } else if (sortBy === 'assignment_date') {
        const assignsA = staffAssignments ? staffAssignments.filter(x => x.order_id === a.order_id) : [];
        const assignsB = staffAssignments ? staffAssignments.filter(x => x.order_id === b.order_id) : [];
        valA = assignsA.length > 0 ? assignsA[0].assignment_date : 'ZZZZ-ZZ-ZZ'; // place unassigned last
        valB = assignsB.length > 0 ? assignsB[0].assignment_date : 'ZZZZ-ZZ-ZZ';
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredOrders, sortBy, sortOrder, staffAssignments]);

  const startAssigning = (order: Order) => {
    const op = getOpDetails(order.order_id);
    const rf = rawFootage ? rawFootage.find(f => f.order_id === order.order_id) : null;
    
    // Load existing staff assignments for this order
    const existing = staffAssignments ? staffAssignments.filter(sa => sa.order_id === order.order_id) : [];
    setActiveAssignments(existing.map(e => ({
      staff_role: e.staff_role,
      staff_id: e.staff_id,
      staff_name: e.staff_name
    })));

    setAssignForm({
      photographer_assigned: op?.photographer_assigned || '',
      videographer_assigned: op?.videographer_assigned || '',
      drone_operator_assigned: op?.drone_operator_assigned || '',
      assistant_assigned: op?.assistant_assigned || '',
      equipment_kit: op?.equipment_kit || '',
      reporting_time: op?.reporting_time || '08:00',
      remarks: op?.remarks || '',
      event_status: op?.event_status || 'Assigned',
      current_stage: order.current_stage || 'Order Confirmed',
      raw_footage_link: rf?.server_path || `s3://photocrew-vault-production/2026/${order.order_id}-shoot/raw/`
    });
    setAssigningOrderId(order.order_id);
    
    // Default selected values
    setSelectedRole('Lead Photographer');
    setSelectedStaff('');
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningOrderId) return;

    // First save the multi-staff role assignments to Supabase & Context state!
    await saveStaffAssignments(assigningOrderId, activeAssignments);

    // Map some main ones to assignForm variables for legacy column compatibility
    const photographer = activeAssignments.find(a => a.staff_role.toLowerCase().includes('photographer'))?.staff_name || '';
    const videographer = activeAssignments.find(a => a.staff_role.toLowerCase().includes('videographer'))?.staff_name || '';
    const droneOp = activeAssignments.find(a => a.staff_role.toLowerCase().includes('drone') || a.staff_role.toLowerCase().includes('aerial'))?.staff_name || '';
    const assistant = activeAssignments.find(a => a.staff_role.toLowerCase().includes('assistant'))?.staff_name || '';
    
    // Assign operations includes event_status and raw footage link if updated
    assignOperations(assigningOrderId, {
      photographer_assigned: photographer || assignForm.photographer_assigned || 'Ramesh Kumar',
      videographer_assigned: videographer || assignForm.videographer_assigned || 'Rahul Verma',
      drone_operator_assigned: droneOp || assignForm.drone_operator_assigned,
      assistant_assigned: assistant || assignForm.assistant_assigned,
      equipment_kit: assignForm.equipment_kit,
      reporting_time: assignForm.reporting_time,
      remarks: assignForm.remarks,
      event_status: assignForm.event_status,
      current_stage: assignForm.current_stage
    });

    // If the stage selected is 'Raw Footage Received', trigger raw footage confirmation directly
    if (assignForm.current_stage === 'Raw Footage Received') {
      confirmRawFootageReceived(assigningOrderId);
    } else if (assignForm.current_stage === 'Event Completed' || assignForm.event_status === 'Completed') {
      markEventCompleted(assigningOrderId, assignForm.raw_footage_link || `s3://photocrew-vault-production/2026/${assigningOrderId}-shoot/raw/`);
    }

    setAssigningOrderId(null);
    alert(`Personnel and gears allocated successfully to Order [${assigningOrderId}].`);
  };

  const getStaffForRole = (role: string) => {
    const filtered = staff ? staff.filter(s => {
      const sRole = s.role.toLowerCase();
      if (role === 'Lead Photographer') return sRole.includes('lead') && sRole.includes('photo');
      if (role === 'Associate Photographer') return sRole.includes('associate') && sRole.includes('photo');
      if (role === 'Lead Videographer') return sRole.includes('lead') && sRole.includes('video');
      if (role === 'Drone & Aerial Operator') return sRole.includes('drone') || sRole.includes('aerial') || sRole.includes('operator');
      if (role === 'Production Assistant') return sRole.includes('assist') || sRole.includes('production');
      if (role === 'Post-Production Editor') return sRole.includes('editor') || sRole.includes('post');
      return false;
    }) : [];

    if (filtered.length > 0) return filtered;

    // Premium seed listings so options are ALWAYS completely filled and useful
    const mockRosters: Record<string, { staff_id: string; name: string }[]> = {
      'Lead Photographer': [
        { staff_id: 'LP1', name: 'Ramesh Kumar' },
        { staff_id: 'LP2', name: 'Amit Sharma' },
        { staff_id: 'LP3', name: 'Priya Patel' }
      ],
      'Associate Photographer': [
        { staff_id: 'AP1', name: 'Suresh Singh' },
        { staff_id: 'AP2', name: 'Neha Gupta' }
      ],
      'Lead Videographer': [
        { staff_id: 'LV1', name: 'Rahul Verma' },
        { staff_id: 'LV2', name: 'Vikram Malhotra' }
      ],
      'Drone & Aerial Operator': [
        { staff_id: 'DO1', name: 'Karan Johar' },
        { staff_id: 'DO2', name: 'Arjun Kapoor' }
      ],
      'Production Assistant': [
        { staff_id: 'PA1', name: 'Rohan Mehra' },
        { staff_id: 'PA2', name: 'Simran Kaur' }
      ],
      'Post-Production Editor': [
        { staff_id: 'ED1', name: 'Alan Cole' },
        { staff_id: 'ED2', name: 'Sarah Connor' },
        { staff_id: 'ED3', name: 'Dennis Nedry' }
      ]
    };
    return mockRosters[role] || [];
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

  const stats = useMemo(() => {
    const totalLeads = operationsOrders.length;
    
    const scheduled = operationsOrders.filter(o => o.current_stage === 'Event Scheduled').length;
    
    const completed = operationsOrders.filter(o => o.current_stage === 'Event Completed').length;
    
    const pending = operationsOrders.filter(o => 
      o.current_stage === 'Order Confirmed' || 
      o.current_stage === 'Operations Assigned'
    ).length;

    const rawFootagePending = operationsOrders.filter(o => {
      const rf = rawFootage ? rawFootage.find(f => f.order_id === o.order_id) : null;
      return o.current_stage === 'Event Completed' && (!rf || !rf.raw_received || rf.ingest_status === 'Pending');
    }).length;

    const readyForProduction = operationsOrders.filter(o => 
      ['Raw Footage Received', 'Editor Assigned', 'Editing Started'].includes(o.current_stage)
    ).length;

    return {
      totalLeads,
      scheduled,
      completed,
      pending,
      rawFootagePending,
      readyForProduction
    };
  }, [operationsOrders, rawFootage]);

  const toggleSort = (field: 'event_date' | 'customer_name' | 'status' | 'assignment_date') => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const renderSortIndicator = (field: 'event_date' | 'customer_name' | 'status' | 'assignment_date') => {
    if (sortBy !== field) return <span className="text-zinc-500 ml-1 select-none">↕</span>;
    return sortOrder === 'asc' 
      ? <span className="text-amber-500 ml-1 select-none">▲</span> 
      : <span className="text-amber-500 ml-1 select-none">▼</span>;
  };

  return (
    <div className="space-y-6">
      {/* 1. Results Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {[
          { label: "Total Operations Leads", value: stats.totalLeads, color: "text-amber-400 border-amber-500/20 bg-amber-500/5", icon: "📋" },
          { label: "Scheduled Events", value: stats.scheduled, color: "text-cyan-400 border-cyan-500/20 bg-cyan-500/5", icon: "📅" },
          { label: "Completed Events", value: stats.completed, color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5", icon: "✅" },
          { label: "Pending Events", value: stats.pending, color: "text-orange-400 border-orange-500/20 bg-orange-500/5", icon: "⏳" },
          { label: "Raw Footage Pending", value: stats.rawFootagePending, color: "text-rose-450 border-rose-500/20 bg-rose-500/5", icon: "🎞️" },
          { label: "Ready for Production", value: stats.readyForProduction, color: "text-purple-400 border-purple-500/20 bg-purple-500/5", icon: "🎬" },
        ].map((s, idx) => (
          <div key={idx} className={`p-3.5 rounded-xl border ${s.color} flex flex-col justify-between space-y-2 shadow-sm`}>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-mono tracking-wider font-bold uppercase text-zinc-400 leading-snug">{s.label}</span>
              <span className="text-sm">{s.icon}</span>
            </div>
            <span className="text-xl font-black font-mono">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Search & Simplified Filters Bar */}
      <div className="bg-zinc-950/40 p-4 rounded-2xl border border-zinc-850 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Box */}
          <div className="relative md:col-span-6 w-full">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search by Customer Name, Order ID, Mobile Number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-550 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          {/* Date Filter Dropdown */}
          <div className="md:col-span-3 w-full">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-amber-500/50 font-mono cursor-pointer"
            >
              <option value="All">All Dates (Event Date)</option>
              <option value="Today">Today</option>
              <option value="Tomorrow">Tomorrow</option>
              <option value="This Week">This Week</option>
              <option value="This Month">This Month</option>
              <option value="Custom">Custom Date Range</option>
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="md:col-span-3 w-full">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-amber-500/50 font-mono cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Order Confirmed">Order Confirmed</option>
              <option value="Operations Assigned">Operations Assigned</option>
              <option value="Staff Assigned">Staff Assigned</option>
              <option value="Event Scheduled">Event Scheduled</option>
              <option value="Event Completed">Event Completed</option>
              <option value="Raw Footage Received">Raw Footage Received</option>
            </select>
          </div>
        </div>

        {/* Custom Date Range pickers if custom is selected */}
        {dateFilter === 'Custom' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-zinc-900/30 text-xs animate-in slide-in-from-top-1 duration-150">
            <span className="text-[10px] uppercase font-mono font-bold text-zinc-500">Custom Range:</span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 px-2.5 py-1.5 rounded-lg font-mono focus:outline-none focus:border-amber-500/40"
              />
              <span className="text-zinc-650">—</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 px-2.5 py-1.5 rounded-lg font-mono focus:outline-none focus:border-amber-500/40"
              />
            </div>
            {(customStartDate || customEndDate) && (
              <button
                type="button"
                onClick={() => {
                  setCustomStartDate('');
                  setCustomEndDate('');
                }}
                className="text-rose-450 hover:text-rose-400 font-mono text-[10px] uppercase font-bold cursor-pointer"
              >
                Clear Dates
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Board Table */}
      <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl overflow-x-auto shadow-xl">
        <table className="w-full text-left border-collapse min-w-[1240px]">
          <thead>
            <tr className="border-b border-zinc-850 text-[10px] font-mono tracking-widest uppercase text-zinc-400 bg-zinc-950/70 select-none">
              <th className="p-4 font-bold">Order ID</th>
              <th 
                onClick={() => toggleSort('customer_name')}
                className="p-4 font-bold cursor-pointer hover:bg-zinc-800/40 hover:text-white transition-colors"
                title="Click to Sort by Customer Name"
              >
                Customer Name {renderSortIndicator('customer_name')}
              </th>
              <th className="p-4 font-bold">Mobile Number</th>
              <th className="p-4 font-bold">Event Type</th>
              <th 
                onClick={() => toggleSort('event_date')}
                className="p-4 font-bold cursor-pointer hover:bg-zinc-800/40 hover:text-white transition-colors"
                title="Click to Sort by Event Date"
              >
                Event Date {renderSortIndicator('event_date')}
              </th>
              <th className="p-4 font-bold">Event Location</th>
              <th 
                onClick={() => toggleSort('status')}
                className="p-4 font-bold cursor-pointer hover:bg-zinc-800/40 hover:text-white transition-colors"
                title="Click to Sort by Current Stage"
              >
                Current Status {renderSortIndicator('status')}
              </th>
              <th className="p-4 font-bold">Assigned Team</th>
              <th className="p-4 font-bold text-right text-zinc-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-850/60 text-xs">
            {sortedOrders.length > 0 ? (
              sortedOrders.map((ord) => {
                const op = getOpDetails(ord.order_id);
                const orderAssignments = staffAssignments ? staffAssignments.filter(sa => sa.order_id === ord.order_id) : [];

                // Generate displayable list of crew assigned
                const crewNames = [
                  op?.photographer_assigned,
                  op?.videographer_assigned,
                  op?.drone_operator_assigned,
                  op?.assistant_assigned,
                  ...orderAssignments.map(a => `${a.staff_name} (${a.staff_role})`)
                ].filter(Boolean);

                return (
                  <tr key={ord.order_id} className="hover:bg-zinc-900/20 transition-all">
                    <td className="p-4">
                      <span className="font-mono text-indigo-400 font-bold bg-slate-900/80 px-2 py-0.5 border border-slate-800 rounded">
                        {ord.order_id}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-zinc-100">
                      {ord.customer_name}
                    </td>
                    <td className="p-4 font-mono text-zinc-300">
                      {ord.mobile || <span className="text-zinc-600 italic">—</span>}
                    </td>
                    <td className="p-4 text-zinc-300 font-medium font-mono text-[11px]">
                      {ord.event_type}
                    </td>
                    <td className="p-4 text-zinc-300 font-mono text-[11px]">
                      {ord.event_date}
                    </td>
                    <td className="p-4 text-zinc-450 text-[11px] truncate max-w-[180px]" title={ord.event_location}>
                      {ord.event_location}
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
                    <td className="p-4 text-[11px] text-zinc-350 max-w-[220px]">
                      {crewNames.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {Array.from(new Set(crewNames)).map((member, idx) => (
                            <span key={idx} className="bg-zinc-850 text-zinc-250 px-1.5 py-0.5 rounded border border-zinc-800 text-[10px] font-mono shrink-0">
                              {member}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-zinc-600 italic">Not Assigned</span>
                      )}
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
                            className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 font-mono font-bold text-[10px] border border-amber-500/30 rounded cursor-pointer transition-all uppercase"
                          >
                            Assign Crew/Gear
                          </button>
                        )}
 
                        {canEdit && op && ord.current_stage !== 'Event Completed' && ord.current_stage !== 'Raw Footage Received' && (
                          <button
                            onClick={() => triggerCompletionModal(ord.order_id)}
                            className="px-2.5 py-1 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-455 font-mono font-bold text-[10px] rounded cursor-pointer transition-all uppercase"
                          >
                            Mark Completed
                          </button>
                        )}
 
                        {canEdit && ord.current_stage === 'Event Completed' && (
                          <button
                            onClick={() => {
                              confirmRawFootageReceived(ord.order_id);
                              alert(`Raw footage status set to Received! Project transitioned to Production.`);
                            }}
                            className="px-2.5 py-1 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-400 font-mono font-bold text-[10px] rounded cursor-pointer transition-all uppercase animate-pulse"
                          >
                            Mark Raw Received
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={12} className="p-12 text-center text-zinc-500">
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
                {/* ADVANCED ROLE ALLOCATOR */}
                <div className="col-span-2 bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-850 space-y-3">
                  <h4 className="text-[11px] font-mono font-bold uppercase text-amber-500 tracking-wider">
                    Crew Allocation (Multi-Role Assignment)
                  </h4>
                  
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-mono text-zinc-400 mb-1">Select Role</label>
                      <select
                        value={selectedRole}
                        onChange={(e) => {
                          const role = e.target.value;
                          setSelectedRole(role);
                          // select first available staff member as default
                          const available = getStaffForRole(role);
                          if (available.length > 0) {
                            setSelectedStaff(available[0].name);
                          } else {
                            setSelectedStaff('');
                          }
                        }}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-100"
                      >
                        <option value="Lead Photographer">Lead Photographer</option>
                        <option value="Associate Photographer">Associate Photographer</option>
                        <option value="Lead Videographer">Lead Videographer</option>
                        <option value="Drone & Aerial Operator">Drone & Aerial Operator</option>
                        <option value="Production Assistant">Production Assistant</option>
                        <option value="Post-Production Editor">Post-Production Editor</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-mono text-zinc-400 mb-1">Select Member</label>
                      <select
                        value={selectedStaff}
                        onChange={(e) => setSelectedStaff(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-100"
                      >
                        <option value="">-- Choose Staff member --</option>
                        {getStaffForRole(selectedRole).map(st => (
                          <option key={st.staff_id} value={st.name}>{st.name}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedStaff) {
                          alert('Please select a staff member first.');
                          return;
                        }
                        const memberInfo = getStaffForRole(selectedRole).find(st => st.name === selectedStaff);
                        const staffId = memberInfo?.staff_id || 'MOCK-' + Math.random().toString(36).substr(2, 4).toUpperCase();
                        
                        // Check if role is already assigned for this member
                        const dupe = activeAssignments.some(a => a.staff_role === selectedRole && a.staff_name === selectedStaff);
                        if (dupe) {
                          alert('This member is already assigned to this role.');
                          return;
                        }
                        
                        setActiveAssignments([...activeAssignments, {
                          staff_role: selectedRole,
                          staff_id: staffId,
                          staff_name: selectedStaff
                        }]);
                      }}
                      className="mt-5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-black rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1 h-[36px]"
                    >
                      <span>+</span>
                      <span>Assign</span>
                    </button>
                  </div>

                  {/* Summary lists */}
                  <div className="space-y-1.5 pt-1.5 border-t border-zinc-850/60">
                    <label className="block text-[10px] font-mono text-zinc-400 font-bold uppercase">
                      Current Allocation Summary:
                    </label>
                    {activeAssignments.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {activeAssignments.map((a, idx) => (
                          <div 
                            key={idx} 
                            className="bg-zinc-900/90 border border-zinc-800 rounded-lg px-2 py-1 text-[11px] text-zinc-350 flex items-center gap-1.5"
                          >
                            <span className="font-mono text-[10px] text-zinc-500">{a.staff_role}:</span>
                            <span className="font-semibold text-amber-400">{a.staff_name}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveAssignments(activeAssignments.filter((_, i) => i !== idx));
                              }}
                              className="text-zinc-500 hover:text-rose-400 font-bold ml-1 text-[10px] cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[10px] text-zinc-500 italic">No personnel assigned to this project yet. Please assign at least one staff member above.</div>
                    )}
                  </div>
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

                {/* Current Stage Selection */}
                <div>
                  <label className="block text-[11px] font-mono font-extrabold uppercase text-amber-500 mb-1">
                    Current Workflow Stage / Dashboard
                  </label>
                  <select
                    value={assignForm.current_stage}
                    onChange={(e) => setAssignForm({ ...assignForm, current_stage: e.target.value as CurrentStage })}
                    className="w-full bg-zinc-950 border border-amber-500/30 rounded-xl px-3 py-2 text-xs text-zinc-100"
                  >
                    <option value="Order Confirmed">Order Confirmed</option>
                    <option value="Operations Assigned">Operations Assigned</option>
                    <option value="Event Scheduled">Event Scheduled</option>
                    <option value="Event Completed">Event Completed</option>
                    <option value="Raw Footage Received">Raw Footage Received</option>
                  </select>
                </div>

                {/* Event Status Selection */}
                <div>
                  <label className="block text-[11px] font-zinc-400 font-mono font-extrabold uppercase mb-1 text-sky-400">
                    Event Operational Status
                  </label>
                  <select
                    value={assignForm.event_status}
                    onChange={(e) => setAssignForm({ ...assignForm, event_status: e.target.value as 'Assigned' | 'Completed' })}
                    className="w-full bg-zinc-950 border border-sky-500/30 rounded-xl px-3 py-2 text-xs text-zinc-100"
                  >
                    <option value="Assigned">Assigned / In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                {/* Raw Footage Link */}
                <div className="col-span-2">
                  <label className="block text-[11px] font-mono font-extrabold uppercase text-purple-400 mb-1">
                    Raw Footage Link (S3/Cloud storage path)
                  </label>
                  <input
                    type="text"
                    value={assignForm.raw_footage_link}
                    onChange={(e) => setAssignForm({ ...assignForm, raw_footage_link: e.target.value })}
                    className="w-full bg-zinc-950 border border-purple-500/30 rounded-xl px-3 py-2 text-xs text-zinc-100 font-mono"
                    placeholder="s3://photocrew-vault-production/2026/ORD-.../raw/"
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
