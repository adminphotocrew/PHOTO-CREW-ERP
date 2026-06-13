import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Lead, Order, Operation, RawFootage, Production, Payment, ActivityLog, UserRole, CurrentStage, EditingStatus, Staff, Notification, Equipment } from '../types';
import { INITIAL_USERS, INITIAL_LEADS, INITIAL_ORDERS, INITIAL_OPERATIONS, INITIAL_RAW_FOOTAGE, INITIAL_PRODUCTION, INITIAL_PAYMENTS, INITIAL_LOGS, INITIAL_EQUIPMENT } from '../data';

import { supabaseClient, updateDiagnosticMetric } from '../supabaseClient';

interface RoleContextType {
  currentUser: User | null;
  currentRole: UserRole;
  currentUserName: string;
  setCurrentRole: (role: UserRole) => void;
  setCurrentUserName: (name: string) => void;
  login: (emailOrUsername: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  users: User[];
  leads: Lead[];
  orders: Order[];
  operations: Operation[];
  rawFootage: RawFootage[];
  production: Production[];
  payments: Payment[];
  logs: ActivityLog[];
  staff: Staff[];
  addStaff: (member: Omit<Staff, 'staff_id'>) => Promise<void>;
  updateStaff: (staffId: string, updates: Partial<Staff>) => Promise<void>;
  deleteStaff: (staffId: string) => Promise<void>;
  equipment: Equipment[];
  addEquipment: (equip: Omit<Equipment, 'equipment_id'>) => Promise<void>;
  updateEquipment: (equipmentId: string, updates: Partial<Equipment>) => Promise<void>;
  deleteEquipment: (equipmentId: string) => Promise<void>;
  notifications: Notification[];
  addNotification: (payload: Omit<Notification, 'notification_id' | 'created_at' | 'read_status'> & { notification_id?: string; read_status?: boolean }) => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  
  // Master flow operations
  addLead: (lead: Omit<Lead, 'lead_id' | 'status' | 'created_by' | 'sales_person' | 'created_date'>) => string;
  updateLeadFollowUp: (
    leadId: string, 
    status: CurrentStage, 
    callNotes: string, 
    nextFollowUpDate: string, 
    quotationAmount?: number, 
    negotiationNotes?: string
  ) => void;
  confirmOrder: (
    leadId: string, 
    packageName: string, 
    quotationAmount: number, 
    advanceReceived: number
  ) => string;
  assignOperations: (
    orderId: string, 
    opData: {
      photographer_assigned: string;
      videographer_assigned: string;
      drone_operator_assigned: string;
      assistant_assigned: string;
      equipment_kit: string;
      reporting_time: string;
      remarks?: string;
      current_stage?: CurrentStage;
    }
  ) => void;
  markEventCompleted: (orderId: string, serverPath: string) => void;
  confirmRawFootageReceived: (orderId: string) => void;
  acceptRawFootage: (trackingId: string) => void;
  updateProduction: (
    productionId: string, 
    updates: Partial<Omit<Production, 'production_id' | 'tracking_id'>>
  ) => void;
  markDelivered: (trackingId: string, remarks?: string) => void;
  recordPayment: (
    orderId: string, 
    amountReceived: number, 
    paymentDate: string, 
    proofUrl?: string
  ) => void;
  resetAllData: () => void;
  refreshData: () => void;
  
  // User Management Admin features
  addUser: (name: string, email: string, mobile: string, role: UserRole, active: boolean, password?: string) => Promise<void>;
  signUpUser: (name: string, username: string, email: string, mobile: string, role: UserRole, password: string) => Promise<any>;
  editUser: (id: string, updates: { name: string, email: string, mobile: string, role: UserRole, active: boolean }) => void;
  toggleUserStatus: (id: string) => void;
  resetUserPassword: (id: string, newPassword: string) => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

// Stable UUID translator mapping helpers because Supabase 'public.users' id is UUID
const mapToDbUserId = (id: string): string => {
  if (id.startsWith('U-')) {
    const num = id.substring(2).padStart(12, '0');
    return `00000000-0000-0000-0000-${num}`;
  }
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  return `00000000-0000-0000-0000-999999999999`;
};

const mapFromDbUserId = (uuid: string): string => {
  if (uuid.startsWith('00000000-0000-0000-0000-')) {
    const suffix = uuid.replace('00000000-0000-0000-0000-', '');
    if (suffix === '999999999999') return 'U-temp';
    const num = parseInt(suffix, 10);
    return `U-${String(num).padStart(3, '0')}`;
  }
  return uuid;
};

const mapNotificationFromDb = (notif: any): Notification => {
  let user_id = notif.user_id;
  let project_id = notif.project_id;
  let task_id = notif.task_id;
  let notification_type = notif.notification_type || 'System Notification';
  let read_status = notif.read_status !== undefined ? notif.read_status : notif.is_read;

  if (notif.action_url && notif.action_url.startsWith('extra:')) {
    try {
      const extraData = JSON.parse(notif.action_url.substring(6));
      user_id = extraData.user_id || user_id;
      project_id = extraData.project_id || project_id;
      task_id = extraData.task_id || task_id;
      notification_type = extraData.notification_type || notification_type;
      if (extraData.read_status !== undefined) {
        read_status = extraData.read_status;
      }
    } catch (e) {
      console.error("Failed to parse extra notification info:", e);
    }
  }

  return {
    notification_id: notif.notification_id,
    user_id,
    project_id,
    task_id,
    notification_type,
    title: notif.title,
    message: notif.message,
    read_status: !!read_status,
    is_read: !!read_status,
    created_at: notif.created_at,
    recipient_role: notif.recipient_role
  };
};

const saveNotificationToSupabase = async (notif: Notification) => {
  if (!supabaseClient) return;
  
  const payload = {
    notification_id: notif.notification_id,
    recipient_role: notif.recipient_role || 'All',
    title: notif.title,
    message: notif.message,
    is_read: notif.read_status,
    user_id: notif.user_id,
    project_id: notif.project_id,
    task_id: notif.task_id,
    notification_type: notif.notification_type,
    read_status: notif.read_status,
    created_at: notif.created_at || new Date().toISOString()
  };

  const { error } = await supabaseClient.from('notifications').insert(payload);
  
  if (error) {
    console.warn("Failed inserting notification with all fields, trying fallback:", error);
    const encodedExtra = JSON.stringify({
      user_id: notif.user_id,
      project_id: notif.project_id,
      task_id: notif.task_id,
      notification_type: notif.notification_type,
      read_status: notif.read_status
    });
    
    const fallbackPayload = {
      notification_id: notif.notification_id,
      recipient_role: notif.recipient_role || 'All',
      title: notif.title,
      message: notif.message,
      is_read: notif.read_status,
      action_url: `extra:${encodedExtra}`
    };
    
    const { error: fallbackError } = await supabaseClient.from('notifications').insert(fallbackPayload);
    if (fallbackError) {
      console.error("Fallback insert failed too:", fallbackError);
    }
  }
};

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize state arrays as empty so data is always loaded directly from Supabase (the single source of truth) without relying on cached or stale demo data
  const [users, setUsers] = useState<User[]>([]);

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('erp_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [currentRole, setCurrentRoleState] = useState<UserRole>(() => {
    return (localStorage.getItem('erp_role') as UserRole) || 'Business Owner';
  });

  const [currentUserName, setCurrentUserNameState] = useState<string>(() => {
    return localStorage.getItem('erp_user_name') || 'Rupand Das';
  });

  const [leads, setLeads] = useState<Lead[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [rawFootage, setRawFootage] = useState<RawFootage[]>([]);
  const [production, setProduction] = useState<Production[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [staff, setStaff] = useState<Staff[]>(() => {
    const saved = localStorage.getItem('erp_production_staff');
    return saved ? JSON.parse(saved) : [
      {
        staff_id: 'STF-001',
        name: 'Emily Watson',
        mobile: '+1 (555) 234-5678',
        email: 'emily@photocrew.com',
        role: 'Production Manager',
        department: 'Management',
        status: 'Active',
        joining_date: '2025-01-10',
        profile_photo: '',
        notes: 'Orchestrates chief editing operations and delivery workflows.'
      },
      {
        staff_id: 'STF-002',
        name: 'Alan Cole',
        mobile: '+1 (555) 876-5432',
        email: 'alan@photocrew.com',
        role: 'Senior Editor',
        department: 'Editing',
        status: 'Active',
        joining_date: '2025-03-15',
        profile_photo: '',
        notes: 'Specialist in cinematic narration and commercial overlays.'
      },
      {
        staff_id: 'STF-003',
        name: 'Sarah Connor',
        mobile: '+1 (555) 456-7890',
        email: 'sarah.c@photocrew.com',
        role: 'Color Grading Artist',
        department: 'Post-Production',
        status: 'Active',
        joining_date: '2025-06-01',
        profile_photo: '',
        notes: 'Expert in DaVinci Resolve color pipelines and HDR calibration.'
      },
      {
        staff_id: 'STF-004',
        name: 'Dennis Nedry',
        mobile: '+1 (555) 304-9021',
        email: 'dennis@photocrew.com',
        role: 'VFX & Motion Graphics Designer',
        department: 'Design',
        status: 'Active',
        joining_date: '2025-09-12',
        profile_photo: '',
        notes: 'Handles high-fidelity typography animation.'
      },
      {
        staff_id: 'STF-005',
        name: 'Jimmy Woo',
        mobile: '+1 (555) 607-1122',
        email: 'jimmy@photocrew.com',
        role: 'Delivery Coordinator',
        department: 'Operations',
        status: 'Active',
        joining_date: '2026-02-20',
        profile_photo: '',
        notes: 'Manages physical and cloud master releases.'
      }
    ];
  });

  const [equipment, setEquipment] = useState<Equipment[]>(() => {
    const saved = localStorage.getItem('erp_equipment');
    return saved ? JSON.parse(saved) : INITIAL_EQUIPMENT;
  });

  useEffect(() => {
    localStorage.setItem('erp_production_staff', JSON.stringify(staff));
  }, [staff]);

  useEffect(() => {
    localStorage.setItem('erp_equipment', JSON.stringify(equipment));
  }, [equipment]);

  // Track session/auth state in localStorage to keep developer/user logged-in across refreshes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('erp_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('erp_current_user');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('erp_role', currentRole);
    localStorage.setItem('erp_user_name', currentUserName);
  }, [currentRole, currentUserName]);

  // Synchronous CRUD wrappers for updating Supabase in backgrounds
  const pushInsert = async (table: string, record: any) => {
    if (!supabaseClient) return;
    try {
      const { error } = await supabaseClient.from(table).insert(record);
      if (error) {
        console.error(`Supabase Insert error in ${table}:`, error);
        updateDiagnosticMetric('insert', 'fail', error.message);
      } else {
        updateDiagnosticMetric('insert', 'ok');
      }
    } catch (err: any) {
      updateDiagnosticMetric('insert', 'fail', err?.message || String(err));
    }
  };

  const pushUpdate = async (table: string, matchColumn: string, matchValue: any, updates: any) => {
    if (!supabaseClient) return;
    try {
      const { error } = await supabaseClient.from(table).update(updates).eq(matchColumn, matchValue);
      if (error) {
        console.error(`Supabase Update error in ${table}:`, error);
        updateDiagnosticMetric('update', 'fail', error.message);
      } else {
        updateDiagnosticMetric('update', 'ok');
      }
    } catch (err: any) {
      updateDiagnosticMetric('update', 'fail', err?.message || String(err));
    }
  };

  const pushDelete = async (table: string, matchColumn: string, matchValue: any) => {
    if (!supabaseClient) return;
    try {
      const { error } = await supabaseClient.from(table).delete().eq(matchColumn, matchValue);
      if (error) {
        console.error(`Supabase Delete error in ${table}:`, error);
        updateDiagnosticMetric('delete', 'fail', error.message);
      } else {
        updateDiagnosticMetric('delete', 'ok');
      }
    } catch (err: any) {
      updateDiagnosticMetric('delete', 'fail', err?.message || String(err));
    }
  };

  const pushUpsert = async (table: string, record: any) => {
    if (!supabaseClient) return;
    try {
      const { error } = await supabaseClient.from(table).upsert(record);
      if (error) {
        console.error(`Supabase Upsert error in ${table}:`, error);
        updateDiagnosticMetric('insert', 'fail', error.message);
      } else {
        updateDiagnosticMetric('insert', 'ok');
      }
    } catch (err: any) {
      updateDiagnosticMetric('insert', 'fail', err?.message || String(err));
    }
  };

  // Fetch full dataset from Supabase
  const seedDatabase = async () => {
    if (!supabaseClient) return;
    try {
      console.log('Database is empty, starting automated initial seeding to Supabase...');
      for (const u of INITIAL_USERS) {
        await supabaseClient.from('users').upsert({
          ...u,
          id: mapToDbUserId(u.id),
          username: u.username || u.email.split('@')[0]
        });
      }
      // Upsert other tables
      if (INITIAL_LEADS?.length > 0) await supabaseClient.from('leads').upsert(INITIAL_LEADS);
      if (INITIAL_ORDERS?.length > 0) await supabaseClient.from('orders').upsert(INITIAL_ORDERS);
      if (INITIAL_OPERATIONS?.length > 0) await supabaseClient.from('operations').upsert(INITIAL_OPERATIONS);
      if (INITIAL_RAW_FOOTAGE?.length > 0) await supabaseClient.from('raw_footage').upsert(INITIAL_RAW_FOOTAGE);
      if (INITIAL_PRODUCTION?.length > 0) await supabaseClient.from('production').upsert(INITIAL_PRODUCTION);
      if (INITIAL_PAYMENTS?.length > 0) await supabaseClient.from('payments').upsert(INITIAL_PAYMENTS);
      if (INITIAL_LOGS?.length > 0) await supabaseClient.from('activity_logs').upsert(INITIAL_LOGS);

      console.log('Database initial seeding completed successfully.');
    } catch (err: any) {
      console.error('Automated database seeding failed:', err);
    }
  };

  // Fetch full dataset from Supabase
  const fetchFromDb = async () => {
    if (!supabaseClient) return;
    try {
      const dbOperationsPromise = supabaseClient.from('operations').select('*');
      const dbRawFootagePromise = supabaseClient.from('raw_footage').select('*');
      const dbProductionPromise = supabaseClient.from('production').select('*');
      const dbPaymentsPromise = supabaseClient.from('payments').select('*');
      const dbLogsPromise = supabaseClient.from('activity_logs').select('*').order('timestamp', { ascending: false });
      const dbStaffPromise = supabaseClient.from('production_staff').select('*').order('created_at', { ascending: false }).then(
        (res) => res,
        () => ({ data: null, error: null })
      );
      const dbNotificationsPromise = supabaseClient.from('notifications').select('*').order('created_at', { ascending: false }).then(
        (res) => res,
        (err) => {
          console.warn('Could not read notifications from Supabase:', err);
          return { data: null, error: null };
        }
      );
      const dbEquipmentPromise = supabaseClient.from('equipment').select('*').then(
        (res) => res,
        () => {
          const cached = localStorage.getItem('erp_equipment');
          return { data: cached ? JSON.parse(cached) : INITIAL_EQUIPMENT, error: null };
        }
      );

      const [
        { data: dbUsers, error: uErr },
        { data: dbLeads, error: ldErr },
        { data: dbOrders, error: ordErr },
        { data: dbOperations, error: opErr },
        { data: dbRawFootage, error: rfErr },
        { data: dbProduction, error: prodErr },
        { data: dbPayments, error: payErr },
        { data: dbLogs, error: logErr },
        staffRes,
        notifRes,
        equipRes
      ] = await Promise.all([
        supabaseClient.from('users').select('*'),
        supabaseClient.from('leads').select('*').order('created_date', { ascending: false }),
        supabaseClient.from('orders').select('*').order('created_at', { ascending: false }),
        dbOperationsPromise,
        dbRawFootagePromise,
        dbProductionPromise,
        dbPaymentsPromise,
        dbLogsPromise,
        dbStaffPromise,
        dbNotificationsPromise,
        dbEquipmentPromise
      ]);

      if (uErr || ldErr || ordErr || opErr || rfErr || prodErr || payErr || logErr) {
        console.warn('Could not read all tables from Supabase, syncing with cached state');
        updateDiagnosticMetric('read', 'fail', (uErr || ldErr || ordErr || opErr || rfErr || prodErr || payErr || logErr)?.message);
        return;
      }

      if (dbUsers && dbUsers.length === 0) {
        await seedDatabase();
        // retry fetch once
        await fetchFromDb();
        return;
      }

      if (dbUsers) {
        // Ensure standard demo accounts always exist in Supabase for convenient tests
        const demoEmails = ['owner@demo.com', 'sales@demo.com', 'ops@demo.com', 'prod@demo.com'];
        const existingEmails = dbUsers.map(u => u.email.toLowerCase());
        const missingDemos = INITIAL_USERS.filter(u => demoEmails.includes(u.email) && !existingEmails.includes(u.email));
        
        if (missingDemos.length > 0) {
          console.log('Detected missing demo accounts, seeding them into Supabase...');
          for (const u of missingDemos) {
            await supabaseClient.from('users').upsert({
              ...u,
              id: mapToDbUserId(u.id),
              username: u.username || u.email.split('@')[0]
            });
          }
          // Fetch users again to keep state synced cleanly
          const { data: refreshedUsers } = await supabaseClient.from('users').select('*');
          if (refreshedUsers) {
            setUsers(refreshedUsers.map(u => ({ ...u, id: mapFromDbUserId(u.id) })));
          } else {
            setUsers(dbUsers.map(u => ({ ...u, id: mapFromDbUserId(u.id) })));
          }
        } else {
          setUsers(dbUsers.map(u => ({ ...u, id: mapFromDbUserId(u.id) })));
        }
      }
      if (dbLeads) setLeads(dbLeads);
      if (dbOrders) setOrders(dbOrders as any);
      if (dbOperations) setOperations(dbOperations);
      if (dbRawFootage) setRawFootage(dbRawFootage as any);
      if (dbProduction) setProduction(dbProduction as any);
      if (dbPayments) setPayments(dbPayments as any);
      if (dbLogs) setLogs(dbLogs as any);
      if (notifRes && notifRes.data) {
        setNotifications(notifRes.data.map(mapNotificationFromDb));
      }
      if (staffRes && staffRes.data && staffRes.data.length > 0) {
        setStaff(staffRes.data);
      }
      if (equipRes && equipRes.data) {
        setEquipment(equipRes.data);
      }

      updateDiagnosticMetric('read', 'ok');
      updateDiagnosticMetric('connection', 'connected');
    } catch (err: any) {
      console.error('Fetch error:', err);
      updateDiagnosticMetric('read', 'fail', err.message);
    }
  };

  // Synchronous database fetching and real-time subscription channels
  useEffect(() => {
    fetchFromDb();

    if (!supabaseClient) return;

    const channels = [
      { table: 'users', key: 'id', setter: setUsers },
      { table: 'leads', key: 'lead_id', setter: setLeads },
      { table: 'orders', key: 'order_id', setter: setOrders },
      { table: 'operations', key: 'operation_id', setter: setOperations },
      { table: 'raw_footage', key: 'tracking_id', setter: setRawFootage },
      { table: 'production', key: 'production_id', setter: setProduction },
      { table: 'payments', key: 'payment_id', setter: setPayments },
      { table: 'production_staff', key: 'staff_id', setter: setStaff },
      { table: 'activity_logs', key: 'log_id', setter: setLogs },
      { table: 'notifications', key: 'notification_id', setter: setNotifications },
      { table: 'equipment', key: 'equipment_id', setter: setEquipment }
    ].map(({ table, key, setter }) => {
      return supabaseClient
        .channel(`rt-${table}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table },
          (payload) => {
            updateDiagnosticMetric('realtime', 'ok');
            if (payload.eventType === 'INSERT') {
              setter((prev: any[]) => {
                const item = payload.new;
                let mappedItem = table === 'users' ? { ...item, id: mapFromDbUserId(item.id) } : item;
                if (table === 'notifications') {
                  mappedItem = mapNotificationFromDb(item);
                }
                const exists = prev.some(x => x[key] === mappedItem[key]);
                if (exists) return prev;
                return [mappedItem, ...prev];
              });
            } else if (payload.eventType === 'UPDATE') {
              setter((prev: any[]) => {
                const item = payload.new;
                let mappedItem = table === 'users' ? { ...item, id: mapFromDbUserId(item.id) } : item;
                if (table === 'notifications') {
                  mappedItem = mapNotificationFromDb(item);
                }
                return prev.map(x => (x[key] === mappedItem[key] ? mappedItem : x));
              });
            } else if (payload.eventType === 'DELETE') {
              setter((prev: any[]) => {
                const oldItem = payload.old;
                const matchVal = table === 'users' ? mapFromDbUserId(oldItem.id) : oldItem[key];
                return prev.filter(x => x[key] !== matchVal);
              });
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            updateDiagnosticMetric('realtime', 'ok');
          } else {
            updateDiagnosticMetric('realtime', 'fail');
          }
        });
    });

    return () => {
      channels.forEach(ch => supabaseClient.removeChannel(ch));
    };
  }, []);

  const runAutomatedChecks = async () => {
    if (production.length === 0) return;
    
    const localTime = new Date();
    const todayStr = localTime.toISOString().split('T')[0];
    const tomorrow = new Date(localTime);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    for (const prod of production) {
      if (prod.editing_status === 'Delivered') continue;

      const rf = rawFootage.find((f) => f.tracking_id === prod.tracking_id);
      const linkedOrder = rf ? orders.find((o) => o.order_id === rf.order_id) : undefined;
      const orderName = linkedOrder?.package_name || 'Project';
      const oId = linkedOrder?.order_id || '';

      // Check expected_delivery_date
      if (prod.expected_delivery_date) {
        if (prod.expected_delivery_date === todayStr) {
          const notifId = `NTF-DUE-TODAY-${prod.production_id}-${todayStr}`;
          const exists = notifications.some(n => n.notification_id === notifId);
          if (!exists) {
            await addNotification({
              notification_id: notifId,
              user_id: prod.editor_assigned,
              project_id: prod.production_id,
              task_id: 'Editing',
              notification_type: 'Due Date Alert',
              title: 'Task Due Today',
              message: `The project "${orderName}" (Order: ${oId}) is due today!`,
              recipient_role: 'Production Team'
            });
          }
        } else if (prod.expected_delivery_date === tomorrowStr) {
          const notifId = `NTF-DUE-TOMORROW-${prod.production_id}-${tomorrowStr}`;
          const exists = notifications.some(n => n.notification_id === notifId);
          if (!exists) {
            await addNotification({
              notification_id: notifId,
              user_id: prod.editor_assigned,
              project_id: prod.production_id,
              task_id: 'Editing',
              notification_type: 'Due Date Alert',
              title: 'Task Due Tomorrow',
              message: `Project "${orderName}" (Order: ${oId}) editing is due tomorrow.`,
              recipient_role: 'Production Team'
            });
          }
        } else if (prod.expected_delivery_date < todayStr) {
          const notifId = `NTF-OVERDUE-${prod.production_id}-${todayStr}`;
          const exists = notifications.some(n => n.notification_id === notifId);
          if (!exists) {
            await addNotification({
              notification_id: notifId,
              user_id: prod.editor_assigned,
              project_id: prod.production_id,
              task_id: 'Editing',
              notification_type: 'Due Date Alert',
              title: 'Task Overdue / Delivery Crossed',
              message: `Project "${orderName}" (Order: ${oId}) expected delivery date (${prod.expected_delivery_date}) was crossed!`,
              recipient_role: 'All'
            });
          }
        }
      }

      // Check pending customer review
      if (prod.customer_review_status === 'Pending Review') {
        const notifId = `NTF-PENDING-REV-${prod.production_id}-${todayStr}`;
        const exists = notifications.some(n => n.notification_id === notifId);
        if (!exists) {
          await addNotification({
            notification_id: notifId,
            user_id: prod.editor_assigned,
            project_id: prod.production_id,
            task_id: 'Review',
            notification_type: 'Due Date Alert',
            title: 'Pending Customer Review',
            message: `Project "${orderName}" (Order: ${oId}) has been pending customer review.`,
            recipient_role: 'Operations Team'
          });
        }
      }
    }
  };

  useEffect(() => {
    if (production.length > 0 && notifications.length > 0) {
      runAutomatedChecks();
    }
  }, [production, notifications]);

  // Handle auto-logout if user is deactivated
  useEffect(() => {
    if (currentUser) {
      const dbUser = users.find(u => u.id === currentUser.id);
      if (!dbUser || !dbUser.active) {
        logout();
        alert('Your account is no longer active. You have been logged out.');
      } else if (dbUser.role !== currentUser.role || dbUser.name !== currentUser.name) {
        // Sync detail changes in business owner's panel
        setCurrentUser(dbUser);
        setCurrentRoleState(dbUser.role);
        setCurrentUserNameState(dbUser.name);
      }
    }
  }, [users, currentUser]);

  // Sync username with role switcher for smooth demo
  const setCurrentRole = (role: UserRole) => {
    setCurrentRoleState(role);
    if (role === 'Business Owner') setCurrentUserNameState('Rupand Das');
    else if (role === 'Sales Team') setCurrentUserNameState('Sarah Jenkins');
    else if (role === 'Operations Team') setCurrentUserNameState('Robert O\'Connor');
    else if (role === 'Production Team') setCurrentUserNameState('Emily Watson');
  };

  const setCurrentUserName = (name: string) => {
    setCurrentUserNameState(name);
  };

  // Login action
  const login = async (emailOrUsername: string, password: string) => {
    const cleanInput = emailOrUsername.trim().toLowerCase();
    const foundUser = users.find(u => 
      u.email.toLowerCase() === cleanInput || 
      u.name.toLowerCase() === cleanInput || 
      (u.username && u.username.toLowerCase() === cleanInput) ||
      u.email.split('@')[0].toLowerCase() === cleanInput
    );
    
    if (!foundUser) {
      return { success: false, error: 'User account not found.' };
    }
    
    if (!foundUser.active) {
      return { success: false, error: 'Your account has been deactivated. Please contact your system administrator.' };
    }
    
    if (foundUser.password !== password) {
      return { success: false, error: 'Incorrect email/username or password.' };
    }

    // Authenticate with Supabase Auth so auth.uid() becomes set and RLS triggers successfully
    if (supabaseClient) {
      try {
        const { error: signInErr } = await supabaseClient.auth.signInWithPassword({
          email: foundUser.email,
          password: password
        });

        if (signInErr) {
          console.warn('Supabase Auth signIn failed, attempting on-the-fly signUp:', signInErr.message);
          // Try to sign up the user on the fly so they exist in Auth next time
          const { error: signUpErr } = await supabaseClient.auth.signUp({
            email: foundUser.email,
            password: password,
            options: {
              data: {
                name: foundUser.name,
                username: foundUser.username || foundUser.email.split('@')[0],
                mobile: foundUser.mobile,
                role: foundUser.role,
                password: password
              }
            }
          });
          if (signUpErr) {
            console.warn('On-the-fly signUp notice (handled):', signUpErr.message);
          } else {
            console.log('On-the-fly signUp succeeded. Attempting clean sign-in...');
            const { error: retrySignInErr } = await supabaseClient.auth.signInWithPassword({
              email: foundUser.email,
              password: password
            });
            if (retrySignInErr) {
              console.warn('Retry sign-in after signUp result:', retrySignInErr.message);
            }
          }
        } else {
          console.log('Logged into Supabase Auth successfully as:', foundUser.email);
        }
      } catch (authErr) {
        console.error('Unhandled auth error during login:', authErr);
      }
    }
    
    // Successful login
    setCurrentUser(foundUser);
    setCurrentRoleState(foundUser.role);
    setCurrentUserNameState(foundUser.name);
    
    // Log login
    const userName = foundUser.name;
    const userRole = foundUser.role;
    const newLog: ActivityLog = {
      log_id: `LOG-${Math.floor(100 + Math.random() * 900)}`,
      user_name: userName,
      role: userRole,
      action: 'User Logged In Successfully',
      module: 'Session',
      record_id: foundUser.id,
      timestamp: new Date().toISOString(),
    };
    setLogs((prev) => [newLog, ...prev]);
    pushInsert('activity_logs', newLog);
    
    return { success: true };
  };

  // Logout action
  const logout = () => {
    if (currentUser) {
      const newLog: ActivityLog = {
        log_id: `LOG-${Math.floor(100 + Math.random() * 900)}`,
        user_name: currentUser.name,
        role: currentUser.role,
        action: 'User Logged Out',
        module: 'Session',
        record_id: currentUser.id,
        timestamp: new Date().toISOString(),
      };
      setLogs((prev) => [newLog, ...prev]);
      pushInsert('activity_logs', newLog);
    }
    setCurrentUser(null);
    setCurrentRoleState('Business Owner');
    setCurrentUserNameState('Rupand Das');
    localStorage.removeItem('erp_current_user');
  };

  // Helper to add activity logs
  const logActivity = (
    action: string, 
    module: string, 
    recordId: string, 
    prevStage?: string, 
    newStage?: string
  ) => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0];

    let detailedAction = action;
    if (prevStage || newStage) {
      detailedAction += ` | Previous Stage: ${prevStage || 'N/A'} | New Stage: ${newStage || 'N/A'}`;
    }
    detailedAction += ` | Date: ${dateStr} | Time: ${timeStr}`;

    const newLog: ActivityLog = {
      log_id: `LOG-${Math.floor(100 + Math.random() * 900)}`,
      user_name: currentUserName,
      role: currentRole,
      action: detailedAction,
      module,
      record_id: recordId,
      timestamp: now.toISOString(),
      previous_stage: prevStage,
      new_stage: newStage,
      date: dateStr,
      time: timeStr,
    };
    setLogs((prev) => [newLog, ...prev]);

    // Strip out non-database columns before sending to Supabase
    const dbRecord = {
      log_id: newLog.log_id,
      user_name: newLog.user_name,
      role: newLog.role,
      action: newLog.action,
      module: newLog.module,
      record_id: newLog.record_id,
      timestamp: newLog.timestamp,
    };
    pushInsert('activity_logs', dbRecord);
  };

  const resetAllData = () => {
    setUsers(INITIAL_USERS);
    setLeads(INITIAL_LEADS);
    setOrders(INITIAL_ORDERS);
    setOperations(INITIAL_OPERATIONS);
    setRawFootage(INITIAL_RAW_FOOTAGE);
    setProduction(INITIAL_PRODUCTION);
    setPayments(INITIAL_PAYMENTS);
    setLogs(INITIAL_LOGS);
    setCurrentUser(null);
    setCurrentRoleState('Business Owner');
    setCurrentUserNameState('Rupand Das');
    localStorage.removeItem('erp_current_user');

    if (supabaseClient) {
      INITIAL_USERS.forEach(u => pushUpsert('users', { ...u, id: mapToDbUserId(u.id) }));
      INITIAL_LEADS.forEach(l => pushUpsert('leads', l));
      INITIAL_ORDERS.forEach(o => pushUpsert('orders', o));
      INITIAL_OPERATIONS.forEach(op => pushUpsert('operations', op));
      INITIAL_RAW_FOOTAGE.forEach(rf => pushUpsert('raw_footage', rf));
      INITIAL_PRODUCTION.forEach(p => pushUpsert('production', p));
      INITIAL_PAYMENTS.forEach(pay => pushUpsert('payments', pay));
      INITIAL_LOGS.forEach(log => pushUpsert('activity_logs', log));
    }

    logActivity('Reset Database to Pre-seeded State', 'System', 'ALL');
  };

  const refreshData = () => {
    fetchFromDb();
    logActivity('Refreshed Workspace Data', 'System', 'ALL');
  };

  // 1. Create Lead
  const addLead = (leadDetails: Omit<Lead, 'lead_id' | 'status' | 'created_by' | 'sales_person' | 'created_date'>) => {
    const leadId = `LD-${Math.floor(9012 + Math.random() * 988)}`;
    const newLead: Lead = {
      ...leadDetails,
      lead_id: leadId,
      created_date: new Date().toISOString().split('T')[0],
      sales_person: currentUserName,
      status: 'New Lead',
      created_by: currentUserName,
    };
    setLeads((prev) => [newLead, ...prev]);
    pushInsert('leads', newLead);
    logActivity(`Created Lead: ${newLead.customer_name}`, 'Sales', leadId, 'N/A', 'New Lead');
    return leadId;
  };

  // 2. Lead Follow-Up (Screen 3)
  const updateLeadFollowUp = (
    leadId: string, 
    status: CurrentStage, 
    callNotes: string, 
    nextFollowUpDate: string, 
    quotationAmount?: number, 
    negotiationNotes?: string
  ) => {
    const targetLead = leads.find((ld) => ld.lead_id === leadId);
    const previousStage = targetLead ? targetLead.status : 'New Lead';

    setLeads((prev) =>
      prev.map((ld) => {
        if (ld.lead_id === leadId) {
          const updated = {
            ...ld,
            status,
            budget: quotationAmount !== undefined ? quotationAmount : ld.budget,
            remarks: `${ld.remarks || ''}\n[Update ${new Date().toISOString().split('T')[0]}]: ${callNotes}. ${negotiationNotes ? 'Neg Notes: ' + negotiationNotes : ''}. Next follow-up: ${nextFollowUpDate}`,
            updated_by: currentUserName,
            updated_at: new Date().toISOString()
          };
          pushUpdate('leads', 'lead_id', leadId, {
            status: updated.status,
            budget: updated.budget,
            remarks: updated.remarks,
            updated_by: updated.updated_by,
            updated_at: updated.updated_at
          });
          return updated;
        }
        return ld;
      })
    );
    logActivity(`Updated Lead Follow-up, stage: ${status}`, 'Sales', leadId, previousStage, status);
  };

  // 3. Confirm Order (Action button)
  const confirmOrder = (
    leadId: string, 
    packageName: string, 
    quotationAmount: number, 
    advanceReceived: number
  ) => {
    const targetLead = leads.find((ld) => ld.lead_id === leadId);
    if (!targetLead) return '';

    // Update lead stage
    setLeads((prev) =>
      prev.map((ld) => (ld.lead_id === leadId ? { ...ld, status: 'Order Confirmed', updated_by: currentUserName, updated_at: new Date().toISOString() } : ld))
    );
    pushUpdate('leads', 'lead_id', leadId, { 
      status: 'Order Confirmed',
      updated_by: currentUserName,
      updated_at: new Date().toISOString()
    });

    const orderId = `ORD-${Math.floor(1012 + Math.random() * 800)}`;
    const newOrder: Order = {
      order_id: orderId,
      lead_id: leadId,
      customer_name: targetLead.customer_name,
      mobile: targetLead.mobile,
      event_type: targetLead.event_type,
      event_date: targetLead.event_date,
      event_time: targetLead.event_time,
      event_location: targetLead.event_location,
      package_name: packageName,
      quotation_amount: quotationAmount,
      advance_received: advanceReceived,
      balance_amount: quotationAmount - advanceReceived,
      order_status: 'Confirmed',
      current_stage: 'Order Confirmed',
      sales_person: currentUserName,
      created_at: new Date().toISOString(),
      updated_by: currentUserName,
      updated_at: new Date().toISOString()
    };

    const paymentId = `PAY-${Math.floor(3012 + Math.random() * 800)}`;
    const newPayment: Payment = {
      payment_id: paymentId,
      order_id: orderId,
      quotation_amount: quotationAmount,
      advance_received: advanceReceived,
      balance_due: quotationAmount - advanceReceived,
      final_payment_received: 0,
      payment_status: advanceReceived > 0 ? 'Partially Paid' : 'Pending',
    };

    setOrders((prev) => [newOrder, ...prev]);
    setPayments((prev) => [newPayment, ...prev]);

    pushInsert('orders', newOrder);
    pushInsert('payments', newPayment);

    logActivity(`Confirmed Order for ${targetLead.customer_name}. Package: ${packageName}`, 'Sales', orderId, targetLead.status, 'Order Confirmed');
    return orderId;
  };

  // 4. Assign Operations
  const assignOperations = (
    orderId: string, 
    opData: {
      photographer_assigned: string;
      videographer_assigned: string;
      drone_operator_assigned: string;
      assistant_assigned: string;
      equipment_kit: string;
      reporting_time: string;
      remarks?: string;
      current_stage?: CurrentStage;
    }
  ) => {
    const opId = `OP-${Math.floor(5012 + Math.random() * 800)}`;
    const { current_stage, ...restOpData } = opData;
    const newOp: Operation = {
      operation_id: opId,
      order_id: orderId,
      ...restOpData,
      event_status: 'Assigned',
      updated_by: currentUserName,
    };

    const targetOrder = orders.find((o) => o.order_id === orderId);
    const previousStage = targetOrder ? targetOrder.current_stage : 'Order Confirmed';
    const targetStage: CurrentStage = current_stage || 
      ((opData.photographer_assigned && opData.videographer_assigned) ? 'Event Scheduled' : 'Operations Assigned');

    // Update order & lead stage
    setOrders((prev) =>
      prev.map((ord) => (ord.order_id === orderId ? { ...ord, current_stage: targetStage, updated_by: currentUserName, updated_at: new Date().toISOString() } : ord))
    );
    pushUpdate('orders', 'order_id', orderId, { 
      current_stage: targetStage,
      updated_by: currentUserName,
      updated_at: new Date().toISOString()
    });

    if (targetOrder) {
      setLeads((prev) =>
        prev.map((ld) => (ld.lead_id === targetOrder.lead_id ? { ...ld, status: targetStage, updated_by: currentUserName, updated_at: new Date().toISOString() } : ld))
      );
      pushUpdate('leads', 'lead_id', targetOrder.lead_id, { 
        status: targetStage,
        updated_by: currentUserName,
        updated_at: new Date().toISOString()
      });
    }

    setOperations((prev) => {
      const filtered = prev.filter((o) => o.order_id !== orderId); // remove old if exists
      return [newOp, ...filtered];
    });
    pushUpsert('operations', newOp);

    logActivity(`Assigned Crew for Order: ${orderId}`, 'Operations', opId, previousStage, targetStage);
  };

  // 5. Mark Event Completed (Action button in Operations)
  const markEventCompleted = (orderId: string, serverPath: string) => {
    const trackingId = `TRK-${Math.floor(2012 + Math.random() * 800)}`;
    const pId = `PRD-${Math.floor(4012 + Math.random() * 800)}`;

    const newRawFootage: RawFootage = {
      tracking_id: trackingId,
      order_id: orderId,
      event_completed_date: new Date().toISOString().split('T')[0],
      raw_received: false,
      server_path: serverPath || `s3://photocrew-vault-production/2026/${orderId}-shoot/raw/`,
      uploaded_by: currentUserName,
      uploaded_date: new Date().toISOString(),
      status: 'Pending',
    };

    const newProd: Production = {
      production_id: pId,
      tracking_id: trackingId,
      editor_assigned: 'Unassigned',
      raw_footage_location: newRawFootage.server_path,
      editing_status: 'Pending',
      remarks: 'Raw footage uploaded. Awaiting editor assignment.',
    };

    const targetOrder = orders.find((o) => o.order_id === orderId);
    const previousStage = targetOrder ? targetOrder.current_stage : 'Event Scheduled';

    // Update Operations status to completed
    setOperations((prev) =>
      prev.map((op) => (op.order_id === orderId ? { ...op, event_status: 'Completed' } : op))
    );
    pushUpdate('operations', 'order_id', orderId, { event_status: 'Completed' });

    // Update order & lead stage to 'Event Completed'
    setOrders((prev) =>
      prev.map((ord) => (ord.order_id === orderId ? { ...ord, current_stage: 'Event Completed', updated_by: currentUserName, updated_at: new Date().toISOString() } : ord))
    );
    pushUpdate('orders', 'order_id', orderId, { 
      current_stage: 'Event Completed',
      updated_by: currentUserName,
      updated_at: new Date().toISOString()
    });

    if (targetOrder) {
      setLeads((prev) =>
        prev.map((ld) => (ld.lead_id === targetOrder.lead_id ? { ...ld, status: 'Event Completed', updated_by: currentUserName, updated_at: new Date().toISOString() } : ld))
      );
      pushUpdate('leads', 'lead_id', targetOrder.lead_id, { 
        status: 'Event Completed',
        updated_by: currentUserName,
        updated_at: new Date().toISOString()
      });
    }

    setRawFootage((prev) => [newRawFootage, ...prev]);
    setProduction((prev) => [newProd, ...prev]);

    pushInsert('raw_footage', newRawFootage);
    pushInsert('production', newProd);

    logActivity(`Marked Event Completed for Order ${orderId}. Raw Footage recorded: ${trackingId}`, 'Operations', orderId, previousStage, 'Event Completed');
  };

  // 6. Production updates (Editing progress, review, approval)
  const updateProduction = (
    productionId: string, 
    updates: Partial<Omit<Production, 'production_id' | 'tracking_id'>>
  ) => {
    let trackingIdToUpdate = '';
    const targetProd = production.find((p) => p.production_id === productionId);
    let previousStage: CurrentStage = 'Raw Footage Received';
    if (targetProd) {
      const rf = rawFootage.find((f) => f.tracking_id === targetProd.tracking_id);
      const linkedOrder = rf ? orders.find((o) => o.order_id === rf.order_id) : undefined;
      const orderName = linkedOrder?.package_name || 'Project';
      const oId = linkedOrder?.order_id || '';
      
      if (linkedOrder) {
        previousStage = linkedOrder.current_stage;
      }

      // 1. Task Assigned & Reassigned
      if (updates.editor_assigned && updates.editor_assigned !== 'Unassigned') {
        const oldEditor = targetProd.editor_assigned;
        if (!oldEditor || oldEditor === 'Unassigned' || oldEditor === '') {
          addNotification({
            user_id: updates.editor_assigned,
            project_id: productionId,
            task_id: 'Editing',
            notification_type: 'Task Assigned',
            title: 'Editing Task Assigned',
            message: `A new editing task for "${orderName}" (Order: ${oId}) has been assigned to ${updates.editor_assigned}.`,
            recipient_role: 'Production Team'
          });
        } else if (oldEditor !== updates.editor_assigned) {
          addNotification({
            user_id: updates.editor_assigned,
            project_id: productionId,
            task_id: 'Editing',
            notification_type: 'Task Reassigned',
            title: 'Editing Task Reassigned',
            message: `Editing task for "${orderName}" (Order: ${oId}) has been reassigned from ${oldEditor} to ${updates.editor_assigned}.`,
            recipient_role: 'Production Team'
          });
        }
      }

      // 2. Status Updates & Task Completed
      if (updates.editing_status && updates.editing_status !== targetProd.editing_status) {
        const status = updates.editing_status;
        if (status === 'Customer Review') {
          addNotification({
            user_id: targetProd.editor_assigned,
            project_id: productionId,
            task_id: 'Editing',
            notification_type: 'Task Completed',
            title: 'Editing Task Completed',
            message: `Editing completed by ${targetProd.editor_assigned || 'Editor'} for "${orderName}" (Order: ${oId}). Sent for customer review.`,
            recipient_role: 'Operations Team'
          });
        } else if (status === 'Revision Required') {
          addNotification({
            user_id: targetProd.editor_assigned,
            project_id: productionId,
            task_id: 'Review',
            notification_type: 'Revision Requested',
            title: 'Project Revision Requested',
            message: `Revision was requested for "${orderName}" (Order: ${oId}). Status updated to Revision Required.`,
            recipient_role: 'Production Team'
          });
        } else if (status === 'Approved') {
          addNotification({
            user_id: targetProd.editor_assigned,
            project_id: productionId,
            task_id: 'Review',
            notification_type: 'Project Approved',
            title: 'Project Customer Approved',
            message: `Project "${orderName}" (Order: ${oId}) was approved by the customer.`,
            recipient_role: 'All'
          });
          addNotification({
            user_id: targetProd.editor_assigned,
            project_id: productionId,
            task_id: 'Review',
            notification_type: 'Task Completed',
            title: 'Review Task Completed',
            message: `Review completed. "${orderName}" (Order: ${oId}) was approved by the client.`,
            recipient_role: 'Production Team'
          });
        } else if (status === 'Delivered') {
          addNotification({
            user_id: targetProd.editor_assigned,
            project_id: productionId,
            task_id: 'Delivery',
            notification_type: 'Project Delivered',
            title: 'Project Delivered to Client',
            message: `Project "${orderName}" (Order: ${oId}) has been successfully delivered and completed.`,
            recipient_role: 'All'
          });
          addNotification({
            user_id: targetProd.editor_assigned,
            project_id: productionId,
            task_id: 'Delivery',
            notification_type: 'Task Completed',
            title: 'Delivery Task Completed',
            message: `Delivery completed for "${orderName}" (Order: ${oId}).`,
            recipient_role: 'Production Team'
          });
        }
      }
    }

    setProduction((prev) =>
      prev.map((prod) => {
        if (prod.production_id === productionId) {
          trackingIdToUpdate = prod.tracking_id;
          const updated = { ...prod, ...updates };
          pushUpdate('production', 'production_id', productionId, updates);
          return updated;
        }
        return prod;
      })
    );

    // Determine Stage to update on Order and Lead
    let nextStage: CurrentStage | null = null;
    if (updates.editing_status === 'Editing') nextStage = 'Editing Started';
    else if (updates.editing_status === 'Customer Review') nextStage = 'Customer Review';
    else if (updates.editing_status === 'Revision Required') nextStage = 'Revision Required';
    else if (updates.editing_status === 'Approved') nextStage = 'Approved';
    else if (updates.editing_status === 'Delivered') {
      if (targetProd) {
        const rf = rawFootage.find((f) => f.tracking_id === targetProd.tracking_id);
        const payment = rf ? payments.find((p) => p.order_id === rf.order_id) : undefined;
        nextStage = (payment && payment.balance_due === 0) ? 'Closed' : 'Payment Pending';
      } else {
        nextStage = 'Payment Pending';
      }
    } else if (updates.editor_assigned && updates.editor_assigned !== 'Unassigned') {
      nextStage = 'Editor Assigned';
    }

    if (nextStage && trackingIdToUpdate) {
      const rf = rawFootage.find((f) => f.tracking_id === trackingIdToUpdate);
      if (rf) {
        setOrders((prev) =>
          prev.map((ord) => {
            if (ord.order_id === rf.order_id) {
              pushUpdate('orders', 'order_id', rf.order_id, { 
                current_stage: nextStage!,
                updated_by: currentUserName,
                updated_at: new Date().toISOString()
              });
              return { ...ord, current_stage: nextStage!, updated_by: currentUserName, updated_at: new Date().toISOString() };
            }
            return ord;
          })
        );
        const tgtOrder = orders.find((o) => o.order_id === rf.order_id);
        if (tgtOrder) {
          setLeads((prev) =>
            prev.map((ld) => {
              if (ld.lead_id === tgtOrder.lead_id) {
                pushUpdate('leads', 'lead_id', tgtOrder.lead_id, { 
                  status: nextStage!,
                  updated_by: currentUserName,
                  updated_at: new Date().toISOString()
                });
                return { ...ld, status: nextStage!, updated_by: currentUserName, updated_at: new Date().toISOString() };
              }
              return ld;
            })
          );
        }
      }
    }

    logActivity(
      `Updated Production ${productionId}: status=${updates.editing_status || 'unchanged'}`, 
      'Production', 
      productionId,
      previousStage,
      nextStage || previousStage
    );
  };

  // accept raw footage as post-production audit step
  const acceptRawFootage = (trackingId: string) => {
    const rf = rawFootage.find((f) => f.tracking_id === trackingId);
    if (!rf) return;

    const orderId = rf.order_id;
    const previousStage = orders.find((o) => o.order_id === orderId)?.current_stage || 'Event Completed';

    // Update raw footage state status
    setRawFootage((prev) =>
      prev.map((footage) => {
        if (footage.tracking_id === trackingId) {
          pushUpdate('raw_footage', 'tracking_id', trackingId, { status: 'Received' });
          return { ...footage, status: 'Received' as const };
        }
        return footage;
      })
    );

    // Update order & lead stage
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.order_id === orderId) {
          pushUpdate('orders', 'order_id', orderId, { 
            current_stage: 'Raw Footage Received',
            updated_by: currentUserName,
            updated_at: new Date().toISOString()
          });
          return { ...ord, current_stage: 'Raw Footage Received', updated_by: currentUserName, updated_at: new Date().toISOString() };
        }
        return ord;
      })
    );

    const targetOrder = orders.find((o) => o.order_id === orderId);
    if (targetOrder) {
      setLeads((prev) =>
        prev.map((ld) => {
          if (ld.lead_id === targetOrder.lead_id) {
            pushUpdate('leads', 'lead_id', targetOrder.lead_id, { 
              status: 'Raw Footage Received',
              updated_by: currentUserName,
              updated_at: new Date().toISOString()
            });
            return { ...ld, status: 'Raw Footage Received', updated_by: currentUserName, updated_at: new Date().toISOString() };
          }
          return ld;
        })
      );
    }

    logActivity(`Audited & accepted Raw Footage for Order: ${orderId}. Assigned to editing pipelines.`, 'Production', orderId, previousStage, 'Raw Footage Received');
  };

  const confirmRawFootageReceived = (orderId: string) => {
    const targetOrder = orders.find((o) => o.order_id === orderId);
    if (!targetOrder) return;
    const previousStage = targetOrder.current_stage;
    const targetStage: CurrentStage = 'Raw Footage Received';

    setOrders((prev) =>
      prev.map((ord) => (ord.order_id === orderId ? { ...ord, current_stage: targetStage, updated_by: currentUserName, updated_at: new Date().toISOString() } : ord))
    );
    pushUpdate('orders', 'order_id', orderId, { 
      current_stage: targetStage,
      updated_by: currentUserName,
      updated_at: new Date().toISOString()
    });

    setLeads((prev) =>
      prev.map((ld) => (ld.lead_id === targetOrder.lead_id ? { ...ld, status: targetStage, updated_by: currentUserName, updated_at: new Date().toISOString() } : ld))
    );
    pushUpdate('leads', 'lead_id', targetOrder.lead_id, { 
      status: targetStage,
      updated_by: currentUserName,
      updated_at: new Date().toISOString()
    });

    setRawFootage((prev) =>
      prev.map((rf) => {
        if (rf.order_id === orderId) {
          pushUpdate('raw_footage', 'tracking_id', rf.tracking_id, { status: 'Received', raw_received: true });
          return { ...rf, status: 'Received', raw_received: true };
        }
        return rf;
      })
    );

    logActivity(`Raw Footage Received and Confirmed in system for Order: ${orderId}`, 'Operations', orderId, previousStage, targetStage);
  };

  // 7. Mark Delivered (Action button)
  const markDelivered = (trackingId: string, remarks?: string) => {
    const targetFootage = rawFootage.find((rf) => rf.tracking_id === trackingId);
    if (!targetFootage) return;

    const orderId = targetFootage.order_id;
    const previousStage = orders.find((o) => o.order_id === orderId)?.current_stage || 'Approved';

    const payment = payments.find((p) => p.order_id === orderId);
    const balanceDue = payment ? payment.balance_due : 1;
    const targetStage: CurrentStage = balanceDue === 0 ? 'Closed' : 'Payment Pending';

    const targetProd = production.find((p) => p.tracking_id === trackingId);
    if (targetProd) {
      const linkedOrder = orders.find((o) => o.order_id === orderId);
      const orderName = linkedOrder?.package_name || 'Project';
      addNotification({
        user_id: targetProd.editor_assigned,
        project_id: targetProd.production_id,
        task_id: 'Delivery',
        notification_type: 'Project Delivered',
        title: 'Project Delivered to Client',
        message: `Project "${orderName}" (Order: ${orderId}) has been successfully delivered and completed.`,
        recipient_role: 'All'
      });
      addNotification({
        user_id: targetProd.editor_assigned,
        project_id: targetProd.production_id,
        task_id: 'Delivery',
        notification_type: 'Task Completed',
        title: 'Delivery Task Completed',
        message: `Delivery completed for "${orderName}" (Order: ${orderId}).`,
        recipient_role: 'Production Team'
      });
    }

    // Update production status
    setProduction((prev) =>
      prev.map((prod) => {
        if (prod.tracking_id === trackingId) {
          const updated = {
            ...prod,
            editing_status: 'Delivered' as const,
            customer_review_status: 'Approved' as const,
            delivery_date: new Date().toISOString().split('T')[0],
            remarks: `${prod.remarks || ''}\n${remarks || 'Delivered to client.'}`,
          };
          pushUpdate('production', 'production_id', prod.production_id, {
            editing_status: 'Delivered',
            customer_review_status: 'Approved',
            delivery_date: updated.delivery_date,
            remarks: updated.remarks
          });
          return updated;
        }
        return prod;
      })
    );

    // Update order & lead stage
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.order_id === orderId) {
          pushUpdate('orders', 'order_id', orderId, { 
            current_stage: targetStage, 
            order_status: 'Delivered',
            updated_by: currentUserName,
            updated_at: new Date().toISOString()
          });
          return { ...ord, current_stage: targetStage, order_status: 'Delivered', updated_by: currentUserName, updated_at: new Date().toISOString() };
        }
        return ord;
      })
    );
    const tgtOrder = orders.find((o) => o.order_id === orderId);
    if (tgtOrder) {
      setLeads((prev) =>
        prev.map((ld) => {
          if (ld.lead_id === tgtOrder.lead_id) {
            pushUpdate('leads', 'lead_id', tgtOrder.lead_id, { 
              status: targetStage,
              updated_by: currentUserName,
              updated_at: new Date().toISOString()
            });
            return { ...ld, status: targetStage, updated_by: currentUserName, updated_at: new Date().toISOString() };
          }
          return ld;
        })
      );
    }

    // Since delivery happened, we set payments status and stage
    setPayments((prev) =>
      prev.map((pay) => {
        if (pay.order_id === orderId) {
          return {
            ...pay,
          };
        }
        return pay;
      })
    );

    logActivity(`Marked Project Delivered to client for Order: ${orderId}`, 'Production', trackingId, previousStage, targetStage);
  };

  // 8. Payments update
  const recordPayment = (
    orderId: string, 
    amountReceived: number, 
    paymentDate: string, 
    proofUrl?: string
  ) => {
    let isFullyPaid = false;
    setPayments((prev) =>
      prev.map((pay) => {
        if (pay.order_id === orderId) {
          const totalPaid = pay.advance_received + pay.final_payment_received + amountReceived;
          const outstanding = Math.max(0, pay.quotation_amount - totalPaid);
          isFullyPaid = outstanding === 0;
          const updated = {
            ...pay,
            final_payment_received: pay.final_payment_received + amountReceived,
            balance_due: outstanding,
            payment_date: paymentDate,
            payment_proof_url: proofUrl || 'https://photocrew-receipts.s3.amazonaws.com/rec-custom.pdf',
            payment_status: isFullyPaid ? ('Fully Paid' as const) : ('Partially Paid' as const),
          };
          pushUpdate('payments', 'payment_id', pay.payment_id, {
            final_payment_received: updated.final_payment_received,
            balance_due: updated.balance_due,
            payment_date: updated.payment_date,
            payment_proof_url: updated.payment_proof_url,
            payment_status: updated.payment_status
          });
          return updated;
        }
        return pay;
      })
    );

    // If fully paid, move order status to next transition or check if delivered first.
    // If fully paid AND previous stage was delivered, we can transition stage to Closed!
    let nextStage: CurrentStage = 'Payment Pending';
    const currentOrder = orders.find((o) => o.order_id === orderId);
    const previousStage = currentOrder ? currentOrder.current_stage : 'Payment Pending';
    if (currentOrder) {
      if (isFullyPaid) {
        nextStage = 'Closed';
      } else {
        nextStage = 'Payment Pending';
      }

      setOrders((prev) =>
        prev.map((ord) => {
          if (ord.order_id === orderId) {
            const nextOutstanding = Math.max(0, ord.balance_amount - amountReceived);
            pushUpdate('orders', 'order_id', orderId, {
              current_stage: nextStage,
              order_status: nextStage === 'Closed' ? 'Closed' : ord.order_status,
              balance_amount: nextOutstanding,
              updated_by: currentUserName,
              updated_at: new Date().toISOString()
            });
            return {
              ...ord,
              current_stage: nextStage,
              order_status: nextStage === 'Closed' ? ('Closed' as const) : ord.order_status,
              balance_amount: nextOutstanding,
              updated_by: currentUserName,
              updated_at: new Date().toISOString()
            };
          }
          return ord;
        })
      );

      setLeads((prev) =>
        prev.map((ld) => {
          if (ld.lead_id === currentOrder.lead_id) {
            pushUpdate('leads', 'lead_id', currentOrder.lead_id, { 
              status: nextStage,
              updated_by: currentUserName,
              updated_at: new Date().toISOString()
            });
            return { ...ld, status: nextStage, updated_by: currentUserName, updated_at: new Date().toISOString() };
          }
          return ld;
        })
      );
    }

    logActivity(`Recorded payment of ₹${amountReceived} for Order ${orderId}. Fully paid: ${isFullyPaid}`, 'Finance', orderId, previousStage, nextStage);
  };

  // User Management Admin features
  const addUser = async (name: string, email: string, mobile: string, role: UserRole, active: boolean, password?: string) => {
    const pwd = password || 'temp123';
    const username = email.split('@')[0];
    let id = `U-${Math.floor(100 + Math.random() * 900)}`;

    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient.auth.signUp({
          email,
          password: pwd,
          options: {
            data: {
              name,
              username,
              mobile,
              role,
              password: pwd
            }
          }
        });

        if (error) {
          console.warn('Supabase auth.signUp handled in addUser:', error.message);
          // If auth fails (e.g. user already exists or trigger bypass needed), try to insert directly into users table as a fallback
          const newUser: User = {
            id,
            name,
            email,
            mobile,
            role,
            active,
            created_at: new Date().toISOString().split('T')[0],
            password: pwd,
            username
          };
          setUsers((prev) => {
            if (prev.some(u => u.email === email)) return prev;
            return [...prev, newUser];
          });
          await pushInsert('users', {
            ...newUser,
            id: mapToDbUserId(id)
          });
        } else if (data?.user) {
          id = mapFromDbUserId(data.user.id);
          const newUser: User = {
            id,
            name,
            email,
            mobile,
            role,
            active,
            created_at: new Date().toISOString().split('T')[0],
            password: pwd,
            username
          };
          setUsers((prev) => {
            if (prev.some(u => u.email === email)) return prev;
            return [...prev, newUser];
          });
          // Let's call pushUpsert to make sure the users table has it immediately in real-time
          await pushUpsert('users', {
            ...newUser,
            id: data.user.id
          });
        }
      } catch (err) {
        console.error('Error in addUser:', err);
      }
    } else {
      const newUser: User = {
        id,
        name,
        email,
        mobile,
        role,
        active,
        created_at: new Date().toISOString().split('T')[0],
        password: pwd,
        username
      };
      setUsers((prev) => [...prev, newUser]);
    }

    logActivity(`Created User Account: ${name} (${role})`, 'UserManagement', id);
  };

  const signUpUser = async (name: string, username: string, email: string, mobile: string, role: UserRole, password: string) => {
    let finalId = `U-${Math.floor(100 + Math.random() * 900)}`;
    const dbId = mapToDbUserId(finalId);
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
              username,
              mobile,
              role,
              password
            }
          }
        });

        // Email rate limit / sign up disabled / configuration issue handled gracefully via direct insert fallback
        if (error) {
          console.warn('Supabase auth.signUp rate limit or configuration error, using direct profile registration fallback:', error.message);
          const newUser: User = {
            id: finalId,
            name,
            email,
            mobile,
            role,
            active: true,
            created_at: new Date().toISOString().split('T')[0],
            password,
            username
          };
          setUsers((prev) => {
            if (prev.some(u => u.email === email)) return prev;
            return [...prev, newUser];
          });
          await pushInsert('users', {
            ...newUser,
            id: dbId
          });
          return { success: true, user: newUser, warning: error.message };
        }

        if (data?.user) {
          finalId = mapFromDbUserId(data.user.id);
          const newUser: User = {
            id: finalId,
            name,
            email,
            mobile,
            role,
            active: true,
            created_at: new Date().toISOString().split('T')[0],
            password,
            username
          };
          setUsers((prev) => {
            if (prev.some(u => u.email === email)) return prev;
            return [...prev, newUser];
          });
          // Call pushUpsert so the users table is populated with this specific user UUID immediately
          await pushUpsert('users', {
            ...newUser,
            id: data.user.id
          });
          return { success: true, user: newUser };
        }
      } catch (err: any) {
        console.error('Unhandled signup exception, registering as directory profile record directly:', err);
        const newUser: User = {
          id: finalId,
          name,
          email,
          mobile,
          role,
          active: true,
          created_at: new Date().toISOString().split('T')[0],
          password,
          username
        };
        setUsers((prev) => {
          if (prev.some(u => u.email === email)) return prev;
          return [...prev, newUser];
        });
        await pushInsert('users', {
          ...newUser,
          id: dbId
        });
        return { success: true, user: newUser, warning: err?.message };
      }
    } else {
      const newUser: User = {
        id: finalId,
        name,
        email,
        mobile,
        role,
        active: true,
        created_at: new Date().toISOString().split('T')[0],
        password,
        username
      };
      setUsers((prev) => [...prev, newUser]);
      return { success: true, user: newUser };
    }
  };

  const editUser = (id: string, updates: { name: string, email: string, mobile: string, role: UserRole, active: boolean }) => {
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, ...updates } : u));
    pushUpdate('users', 'id', mapToDbUserId(id), updates);
    logActivity(`Updated User Account Profile: ${updates.name}`, 'UserManagement', id);
  };

  const toggleUserStatus = (id: string) => {
    setUsers((prev) => prev.map((u) => {
      if (u.id === id) {
        const nextActive = !u.active;
        pushUpdate('users', 'id', mapToDbUserId(id), { active: nextActive });
        logActivity(`${nextActive ? 'Activated' : 'Deactivated'} User Account: ${u.name}`, 'UserManagement', id);
        return { ...u, active: nextActive };
      }
      return u;
    }));
  };

  const resetUserPassword = (id: string, newPassword: string) => {
    setUsers((prev) => prev.map((u) => {
      if (u.id === id) {
        pushUpdate('users', 'id', mapToDbUserId(id), { password: newPassword });
        logActivity(`Reset Password for User account: ${u.name}`, 'UserManagement', id);
        return { ...u, password: newPassword };
      }
      return u;
    }));
  };

  const addStaff = async (member: Omit<Staff, "staff_id">) => {
    const staffId = `STF-${Math.floor(100 + Math.random() * 900)}`;
    const newStaff: Staff = {
      ...member,
      staff_id: staffId,
      created_at: new Date().toISOString()
    };
    setStaff((prev) => [newStaff, ...prev]);
    await pushInsert('production_staff', newStaff);
    logActivity(`Added Staff Member: ${newStaff.name}`, 'StaffManagement', staffId);
  };

  const updateStaff = async (staffId: string, updates: Partial<Staff>) => {
    setStaff((prev) => prev.map((s) => s.staff_id === staffId ? { ...s, ...updates } : s));
    await pushUpdate('production_staff', 'staff_id', staffId, updates);
    logActivity(`Updated Staff Member details: ${staffId}`, 'StaffManagement', staffId);
  };

  const deleteStaff = async (staffId: string) => {
    setStaff((prev) => prev.filter((s) => s.staff_id !== staffId));
    await pushDelete('production_staff', 'staff_id', staffId);
    logActivity(`Removed Staff Member: ${staffId}`, 'StaffManagement', staffId);
  };

  const addEquipment = async (equip: Omit<Equipment, 'equipment_id'>) => {
    const equipmentId = `EQ-${Math.floor(100 + Math.random() * 900)}`;
    const newEquip: Equipment = {
      ...equip,
      equipment_id: equipmentId,
      created_at: new Date().toISOString()
    };
    setEquipment((prev) => [newEquip, ...prev]);
    await pushInsert('equipment', newEquip);
    logActivity(`Added Equipment Item: ${newEquip.name}`, 'EquipmentManagement', equipmentId);
  };

  const updateEquipment = async (equipmentId: string, updates: Partial<Equipment>) => {
    setEquipment((prev) => prev.map((e) => e.equipment_id === equipmentId ? { ...e, ...updates } : e));
    await pushUpdate('equipment', 'equipment_id', equipmentId, updates);
    logActivity(`Updated Equipment Item: ${equipmentId}`, 'EquipmentManagement', equipmentId);
  };

  const deleteEquipment = async (equipmentId: string) => {
    setEquipment((prev) => prev.filter((e) => e.equipment_id !== equipmentId));
    await pushDelete('equipment', 'equipment_id', equipmentId);
    logActivity(`Removed Equipment Item: ${equipmentId}`, 'EquipmentManagement', equipmentId);
  };

  const addNotification = async (payload: Omit<Notification, 'notification_id' | 'created_at' | 'read_status'> & { notification_id?: string; read_status?: boolean }) => {
    const notification_id = payload.notification_id || `NTF-${6001 + Math.floor(Math.random() * 10000)}`;
    const newNotif: Notification = {
      ...payload,
      notification_id,
      created_at: new Date().toISOString(),
      read_status: payload.read_status ?? false
    };
    
    // Optimistic UI update
    setNotifications((prev) => {
      const exists = prev.some(n => n.notification_id === notification_id);
      if (exists) return prev;
      return [newNotif, ...prev];
    });
    
    // Save to database
    await saveNotificationToSupabase(newNotif);
  };

  const markNotificationRead = async (notificationId: string) => {
    setNotifications((prev) => prev.map((n) => n.notification_id === notificationId ? { ...n, read_status: true, is_read: true } : n));
    if (!supabaseClient) return;
    
    const { error } = await supabaseClient.from('notifications').update({ read_status: true, is_read: true }).eq('notification_id', notificationId);
    if (error) {
      console.warn("Failed updating notification with all fields, trying fallback:", error);
      await supabaseClient.from('notifications').update({ is_read: true }).eq('notification_id', notificationId);
    }
  };

  return (
    <RoleContext.Provider
      value={{
        currentUser,
        currentRole,
        currentUserName,
        setCurrentRole,
        setCurrentUserName,
        login,
        logout,
        users,
        leads,
        orders,
        operations,
        rawFootage,
        production,
        payments,
        logs,
        staff,
        addStaff,
        updateStaff,
        deleteStaff,
        equipment,
        addEquipment,
        updateEquipment,
        deleteEquipment,
        notifications,
        addNotification,
        markNotificationRead,
        addLead,
        updateLeadFollowUp,
        confirmOrder,
        assignOperations,
        markEventCompleted,
        confirmRawFootageReceived,
        acceptRawFootage,
        updateProduction,
        markDelivered,
        recordPayment,
        resetAllData,
        refreshData,
        addUser,
        signUpUser,
        editUser,
        toggleUserStatus,
        resetUserPassword,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const context = useContext(RoleContext);
  if (!context) throw new Error('useRole must be used within a RoleProvider');
  return context;
};
