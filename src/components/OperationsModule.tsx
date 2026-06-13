import React from 'react';
import { OperationsLeads } from './operations/OperationsLeads';
import { EquipmentManagement } from './operations/EquipmentManagement';
import { OperationsStaffManagement } from './operations/OperationsStaffManagement';
import { EventScheduling } from './operations/EventScheduling';
import { TeamAssignments } from './operations/TeamAssignments';
import { OperationsNotifications } from './operations/OperationsNotifications';
import { OperationsAnalytics } from './operations/OperationsAnalytics';
import { Briefcase } from 'lucide-react';

interface OperationsModuleProps {
  activeSubTab?: 'operations_leads' | 'equipment_management' | 'operations_staff' | 'event_scheduling' | 'team_assignments' | 'operations_notifications' | 'operations_analytics';
  setActiveSubTab?: (tab: any) => void;
}

export const OperationsModule: React.FC<OperationsModuleProps> = ({ 
  activeSubTab = 'operations_leads'
}) => {
  // Helper to determine the header metadata
  const getHeaderMeta = () => {
    switch (activeSubTab) {
      case 'operations_leads':
        return {
          badge: 'Operations Leads',
          title: 'Confirmed Project Directives',
          desc: 'Monitor booked events, coordinate lead photographer/videographer staff, register safety logs, and advance workflows.'
        };
      case 'equipment_management':
        return {
          badge: 'Gears Registry',
          title: 'Equipment & Asset Logistics',
          desc: 'Register high-end cameras, primes, drones, audios, and accessories. Track equipment states and maintenance lifecycles.'
        };
      case 'operations_staff':
        return {
          badge: 'Roster Board',
          title: 'Staff Onboarding & Field Comms',
          desc: 'Onboard field operators, configure day commission rates, map specialties, and audit duty logs.'
        };
      case 'event_scheduling':
        return {
          badge: 'Timetables',
          title: 'Shoot Timelines & Site Scheduling',
          desc: 'Manage site reporting hours, lock countdown intervals, calendar event dates, and customize site parameters.'
        };
      case 'team_assignments':
        return {
          badge: 'Squad Audit',
          title: 'Roster & Team Double-Book Security',
          desc: 'Inspect double-booking constraints across active calendar dates and manage operator capacities.'
        };
      case 'operations_notifications':
        return {
          badge: 'Bulletins',
          title: 'Operational Telemetry Bulletins',
          desc: 'View alerts, booking modifications, real-time allocations, and database state change triggers.'
        };
      case 'operations_analytics':
        return {
          badge: 'Metrics',
          title: 'Studio Fleet & Resource Analytics',
          desc: 'Analyze deployment rates, camera vs drone units, lifecycles, and capacity segmentation.'
        };
      default:
        return {
          badge: 'Operations',
          title: 'Crew & Gear Dispatch Desk',
          desc: 'Review booked orders, allocate crew personnel, deploy equipment kits, and execute shoot deliveries.'
        };
    }
  };

  const meta = getHeaderMeta();

  return (
    <div id="operations_module" className="space-y-6">
      {/* Universal Module Header Banner */}
      <div>
        <h2 className="text-xl font-black text-white flex items-center gap-2">
          <span className="p-1 px-2.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs font-mono rounded tracking-widest uppercase">
            {meta.badge}
          </span>
          <span>{meta.title}</span>
        </h2>
        <p className="text-xs text-zinc-400 mt-1 max-w-4xl">
          {meta.desc}
        </p>
      </div>

      {/* Render sub-modules based on selection state */}
      <div className="w-full">
        {activeSubTab === 'operations_leads' && <OperationsLeads />}
        {activeSubTab === 'equipment_management' && <EquipmentManagement />}
        {activeSubTab === 'operations_staff' && <OperationsStaffManagement />}
        {activeSubTab === 'event_scheduling' && <EventScheduling />}
        {activeSubTab === 'team_assignments' && <TeamAssignments />}
        {activeSubTab === 'operations_notifications' && <OperationsNotifications />}
        {activeSubTab === 'operations_analytics' && <OperationsAnalytics />}
      </div>
    </div>
  );
};
