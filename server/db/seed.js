import bcrypt from 'bcryptjs';
import { db } from './database.js';

export const seedDatabase = async () => {
  console.log('🌱 Starting database seeding...');

  // 1. Departments
  const departments = [
    { id: 'dept_eng', name: 'Engineering', description: 'Software engineering, QA, DevOps & Infrastructure' },
    { id: 'dept_sales', name: 'Sales & Business Dev', description: 'Enterprise sales, account management & partnerships' },
    { id: 'dept_mktg', name: 'Marketing', description: 'Brand, growth marketing, content & communications' },
    { id: 'dept_hr', name: 'Human Resources', description: 'People operations, talent acquisition & workplace' },
    { id: 'dept_fin', name: 'Finance & Legal', description: 'Corporate finance, payroll, compliance & auditing' },
    { id: 'dept_ops', name: 'Operations & Support', description: 'Customer operations, IT support & logistics' }
  ];

  // 2. Designations
  const designations = [
    { id: 'des_hr_dir', title: 'HR Director', department_id: 'dept_hr' },
    { id: 'des_hr_gen', title: 'HR Generalist', department_id: 'dept_hr' },
    { id: 'des_eng_mgr', title: 'Engineering Manager', department_id: 'dept_eng' },
    { id: 'des_sr_swe', title: 'Senior Software Engineer', department_id: 'dept_eng' },
    { id: 'des_fe_dev', title: 'Frontend Developer', department_id: 'dept_eng' },
    { id: 'des_devops', title: 'DevOps Engineer', department_id: 'dept_eng' },
    { id: 'des_qa', title: 'QA Specialist', department_id: 'dept_eng' },
    { id: 'des_sales_mgr', title: 'Sales Director', department_id: 'dept_sales' },
    { id: 'des_sales_exec', title: 'Senior Account Executive', department_id: 'dept_sales' },
    { id: 'des_mktg_lead', title: 'Marketing Lead', department_id: 'dept_mktg' },
    { id: 'des_fin_lead', title: 'Finance Lead', department_id: 'dept_fin' },
    { id: 'des_ops_mgr', title: 'Operations Lead', department_id: 'dept_ops' }
  ];

  const salt = bcrypt.genSaltSync(10);
  const adminPasswordHash = bcrypt.hashSync('admin123', salt);
  const managerPasswordHash = bcrypt.hashSync('manager123', salt);
  const employeePasswordHash = bcrypt.hashSync('employee123', salt);

  // 3. Users & Employees
  // HR Admin
  const adminUser = {
    id: 'usr_admin',
    employee_code: 'EMP001',
    name: 'Eleanor Vance',
    email: 'admin@company.com',
    password_hash: adminPasswordHash,
    role: 'admin',
    status: 'active',
    avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    phone: '+1 (555) 234-5678',
    address: '742 Evergreen Terrace, Tech District',
    dob: '1985-04-12',
    emergency_contact: 'David Vance (+1 555-987-6543)',
    blood_group: 'O+',
    department_id: 'dept_hr',
    designation: 'HR Director',
    manager_id: null,
    joining_date: '2020-01-15'
  };

  // Managers
  const managers = [
    {
      id: 'usr_mgr_eng',
      employee_code: 'EMP002',
      name: 'David Miller',
      email: 'manager.eng@company.com',
      password_hash: managerPasswordHash,
      role: 'manager',
      status: 'active',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      phone: '+1 (555) 345-6789',
      address: '124 Conch Street, Tech District',
      dob: '1988-08-22',
      emergency_contact: 'Lisa Miller (+1 555-876-5432)',
      blood_group: 'A+',
      department_id: 'dept_eng',
      designation: 'Engineering Manager',
      manager_id: 'usr_admin',
      joining_date: '2020-03-01'
    },
    {
      id: 'usr_mgr_sales',
      employee_code: 'EMP003',
      name: 'Victoria Stone',
      email: 'manager.sales@company.com',
      password_hash: managerPasswordHash,
      role: 'manager',
      status: 'active',
      avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
      phone: '+1 (555) 456-7890',
      address: '456 Elm Court, City Center',
      dob: '1989-11-05',
      emergency_contact: 'Mark Stone (+1 555-765-4321)',
      blood_group: 'B+',
      department_id: 'dept_sales',
      designation: 'Sales Director',
      manager_id: 'usr_admin',
      joining_date: '2020-06-15'
    },
    {
      id: 'usr_mgr_ops',
      employee_code: 'EMP004',
      name: 'Robert Hastings',
      email: 'manager.ops@company.com',
      password_hash: managerPasswordHash,
      role: 'manager',
      status: 'active',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      phone: '+1 (555) 567-8901',
      address: '789 Oak Lane, Midtown',
      dob: '1987-03-19',
      emergency_contact: 'Clara Hastings (+1 555-654-3210)',
      blood_group: 'AB+',
      department_id: 'dept_ops',
      designation: 'Operations Lead',
      manager_id: 'usr_admin',
      joining_date: '2021-01-10'
    }
  ];

  // Employees
  const employeeList = [
    {
      id: 'usr_emp_alex',
      employee_code: 'EMP005',
      name: 'Alex Rivera',
      email: 'employee.alex@company.com',
      password_hash: employeePasswordHash,
      role: 'employee',
      status: 'active',
      avatar_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
      phone: '+1 (555) 678-9012',
      address: '321 Pine Way, Tech Valley',
      dob: '1995-09-14',
      emergency_contact: 'Carmen Rivera (+1 555-543-2109)',
      blood_group: 'O+',
      department_id: 'dept_eng',
      designation: 'Senior Software Engineer',
      manager_id: 'usr_mgr_eng',
      joining_date: '2021-04-12'
    },
    {
      id: 'usr_emp_sarah',
      employee_code: 'EMP006',
      name: 'Sarah Chen',
      email: 'sarah.chen@company.com',
      password_hash: employeePasswordHash,
      role: 'employee',
      status: 'active',
      avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      phone: '+1 (555) 789-0123',
      address: '654 Maple Dr, Tech Valley',
      dob: '1996-02-28',
      emergency_contact: 'Kevin Chen (+1 555-432-1098)',
      blood_group: 'A-',
      department_id: 'dept_eng',
      designation: 'Frontend Developer',
      manager_id: 'usr_mgr_eng',
      joining_date: '2021-08-01'
    },
    {
      id: 'usr_emp_michael',
      employee_code: 'EMP007',
      name: 'Michael Scott',
      email: 'michael.scott@company.com',
      password_hash: employeePasswordHash,
      role: 'employee',
      status: 'active',
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      phone: '+1 (555) 890-1234',
      address: '1725 Slough Ave, Scranton',
      dob: '1992-06-15',
      emergency_contact: 'Jan Levinson (+1 555-321-0987)',
      blood_group: 'B+',
      department_id: 'dept_eng',
      designation: 'DevOps Engineer',
      manager_id: 'usr_mgr_eng',
      joining_date: '2022-01-10'
    },
    {
      id: 'usr_emp_priya',
      employee_code: 'EMP008',
      name: 'Priya Patel',
      email: 'priya.patel@company.com',
      password_hash: employeePasswordHash,
      role: 'employee',
      status: 'active',
      avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
      phone: '+1 (555) 901-2345',
      address: '888 Silicon Dr, Tech District',
      dob: '1994-12-03',
      emergency_contact: 'Raj Patel (+1 555-210-9876)',
      blood_group: 'O-',
      department_id: 'dept_eng',
      designation: 'QA Specialist',
      manager_id: 'usr_mgr_eng',
      joining_date: '2022-03-15'
    },
    {
      id: 'usr_emp_james',
      employee_code: 'EMP009',
      name: 'James Wilson',
      email: 'james.wilson@company.com',
      password_hash: employeePasswordHash,
      role: 'employee',
      status: 'active',
      avatar_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
      phone: '+1 (555) 012-3456',
      address: '221 Baker Street, Suite 2',
      dob: '1991-07-20',
      emergency_contact: 'Mary Wilson (+1 555-109-8765)',
      blood_group: 'AB-',
      department_id: 'dept_sales',
      designation: 'Senior Account Executive',
      manager_id: 'usr_mgr_sales',
      joining_date: '2022-05-01'
    },
    {
      id: 'usr_emp_emily',
      employee_code: 'EMP010',
      name: 'Emily Davis',
      email: 'emily.davis@company.com',
      password_hash: employeePasswordHash,
      role: 'employee',
      status: 'active',
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      phone: '+1 (555) 123-4560',
      address: '900 Broadway Ave, Downtown',
      dob: '1997-03-11',
      emergency_contact: 'John Davis (+1 555-098-7654)',
      blood_group: 'A+',
      department_id: 'dept_sales',
      designation: 'Senior Account Executive',
      manager_id: 'usr_mgr_sales',
      joining_date: '2022-09-12'
    },
    {
      id: 'usr_emp_daniel',
      employee_code: 'EMP011',
      name: 'Daniel Kim',
      email: 'daniel.kim@company.com',
      password_hash: employeePasswordHash,
      role: 'employee',
      status: 'active',
      avatar_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
      phone: '+1 (555) 234-5670',
      address: '432 Cedar Lane, Westside',
      dob: '1993-10-25',
      emergency_contact: 'Grace Kim (+1 555-987-6540)',
      blood_group: 'B-',
      department_id: 'dept_mktg',
      designation: 'Marketing Lead',
      manager_id: 'usr_admin',
      joining_date: '2022-11-01'
    },
    {
      id: 'usr_emp_marcus',
      employee_code: 'EMP012',
      name: 'Marcus Johnson',
      email: 'marcus.johnson@company.com',
      password_hash: employeePasswordHash,
      role: 'employee',
      status: 'active',
      avatar_url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
      phone: '+1 (555) 345-6780',
      address: '555 River Road, North End',
      dob: '1995-01-30',
      emergency_contact: 'Tasha Johnson (+1 555-876-5430)',
      blood_group: 'O+',
      department_id: 'dept_hr',
      designation: 'HR Generalist',
      manager_id: 'usr_admin',
      joining_date: '2023-02-15'
    },
    {
      id: 'usr_emp_lucas',
      employee_code: 'EMP013',
      name: 'Lucas Gray',
      email: 'lucas.gray@company.com',
      password_hash: employeePasswordHash,
      role: 'employee',
      status: 'active',
      avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
      phone: '+1 (555) 456-7891',
      address: '77 Financial Center, Downtown',
      dob: '1990-05-18',
      emergency_contact: 'Emma Gray (+1 555-765-4320)',
      blood_group: 'A+',
      department_id: 'dept_fin',
      designation: 'Finance Lead',
      manager_id: 'usr_admin',
      joining_date: '2023-04-01'
    },
    {
      id: 'usr_emp_ava',
      employee_code: 'EMP014',
      name: 'Ava White',
      email: 'ava.white@company.com',
      password_hash: employeePasswordHash,
      role: 'employee',
      status: 'active',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      phone: '+1 (555) 567-8902',
      address: '101 Horizon Point, Seaside',
      dob: '1998-09-02',
      emergency_contact: 'Tom White (+1 555-654-3211)',
      blood_group: 'B+',
      department_id: 'dept_ops',
      designation: 'Operations Lead',
      manager_id: 'usr_mgr_ops',
      joining_date: '2023-06-20'
    },
    {
      id: 'usr_emp_deactivated',
      employee_code: 'EMP015',
      name: 'Jordan Bell (Inactive)',
      email: 'jordan.bell@company.com',
      password_hash: employeePasswordHash,
      role: 'employee',
      status: 'inactive',
      avatar_url: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150&auto=format&fit=crop&q=80',
      phone: '+1 (555) 678-9013',
      address: '303 Past Lane',
      dob: '1991-04-05',
      emergency_contact: 'Sam Bell (+1 555-543-2101)',
      blood_group: 'AB+',
      department_id: 'dept_sales',
      designation: 'Senior Account Executive',
      manager_id: 'usr_mgr_sales',
      joining_date: '2021-02-01'
    }
  ];

  const allUsers = [adminUser, ...managers, ...employeeList];

  // 4. Leave Balances for each active user
  const leaveTypes = ['Casual Leave', 'Sick Leave', 'Paid Leave', 'Unpaid Leave'];
  const leaveBalances = [];

  allUsers.forEach(u => {
    leaveTypes.forEach(lt => {
      let total = 12;
      let used = 0;
      if (lt === 'Casual Leave') { total = 12; used = Math.floor(Math.random() * 3); }
      if (lt === 'Sick Leave') { total = 10; used = Math.floor(Math.random() * 2); }
      if (lt === 'Paid Leave') { total = 15; used = Math.floor(Math.random() * 4); }
      if (lt === 'Unpaid Leave') { total = 30; used = 0; }

      leaveBalances.push({
        id: `bal_${u.id}_${lt.toLowerCase().replace(/\s+/g, '_')}`,
        user_id: u.id,
        leave_type: lt,
        total_leaves: total,
        used_leaves: used,
        remaining_leaves: Math.max(0, total - used),
        year: 2026
      });
    });
  });

  // 5. Holidays
  const holidays = [
    { id: 'hol_1', name: "New Year's Day", date: '2026-01-01', type: 'Mandatory', description: 'Federal New Year holiday' },
    { id: 'hol_2', name: 'Martin Luther King Jr. Day', date: '2026-01-19', type: 'Mandatory', description: 'Civil rights leader commemoration' },
    { id: 'hol_3', name: "Presidents' Day", date: '2026-02-16', type: 'Optional', description: 'Washington & Lincoln observance' },
    { id: 'hol_4', name: 'Memorial Day', date: '2026-05-25', type: 'Mandatory', description: 'National memorial day' },
    { id: 'hol_5', name: 'Juneteenth', date: '2026-06-19', type: 'Mandatory', description: 'Freedom Day observance' },
    { id: 'hol_6', name: 'Independence Day', date: '2026-07-04', type: 'Mandatory', description: 'Fourth of July celebration' },
    { id: 'hol_7', name: 'Labor Day', date: '2026-09-07', type: 'Mandatory', description: 'American worker tribute' },
    { id: 'hol_8', name: 'Indigenous Peoples Day', date: '2026-10-12', type: 'Optional', description: 'Optional cultural holiday' },
    { id: 'hol_9', name: 'Veterans Day', date: '2026-11-11', type: 'Mandatory', description: 'Military veterans honor' },
    { id: 'hol_10', name: 'Thanksgiving Day', date: '2026-11-26', type: 'Mandatory', description: 'Annual Thanksgiving holiday' },
    { id: 'hol_11', name: 'Day After Thanksgiving', date: '2026-11-27', type: 'Mandatory', description: 'Extended Thanksgiving holiday' },
    { id: 'hol_12', name: 'Christmas Day', date: '2026-12-25', type: 'Mandatory', description: 'Christmas celebration' }
  ];

  // 6. Announcements
  const announcements = [
    {
      id: 'ann_1',
      title: 'Welcome to the New Quantira Technologies HRMS Portal!',
      description: 'We are thrilled to launch our new modern HRMS system. You can now easily track attendance, submit leave requests, browse the company directory, and keep up with company notices seamlessly.',
      category: 'Company',
      visibility: 'All',
      created_by: 'usr_admin',
      author_name: 'Eleanor Vance',
      author_role: 'HR Director',
      createdAt: '2026-09-01T09:00:00.000Z'
    },
    {
      id: 'ann_2',
      title: 'Upcoming Labor Day Holiday - Office Closed',
      description: 'Please note that the office will be closed on Monday, September 7th, 2026 in observance of Labor Day. Normal operations will resume on Tuesday, September 8th.',
      category: 'Holiday',
      visibility: 'All',
      created_by: 'usr_admin',
      author_name: 'Eleanor Vance',
      author_role: 'HR Director',
      createdAt: '2026-09-02T10:30:00.000Z'
    },
    {
      id: 'ann_3',
      title: 'Q3 All-Hands Meeting & Roadmap Presentation',
      description: 'Join us on Friday, September 18th at 3:00 PM PST for our company-wide quarterly all-hands. We will celebrate key team milestones and announce exciting new product roadmaps.',
      category: 'HR update',
      visibility: 'All',
      created_by: 'usr_admin',
      author_name: 'Eleanor Vance',
      author_role: 'HR Director',
      createdAt: '2026-09-03T14:15:00.000Z'
    }
  ];

  // 7. Seed Past Attendance for current month (realistic logs for analytics)
  const attendance = [];
  const todayStr = '2026-09-04';

  // Seed history for past 3 days for active employees
  const samplePastDates = ['2026-09-01', '2026-09-02', '2026-09-03'];

  allUsers.filter(u => u.status === 'active').forEach(u => {
    samplePastDates.forEach((date, i) => {
      // 90% present, 10% absent/leave
      if ((u.id.length + i) % 7 === 0) {
        attendance.push({
          id: `att_${u.id}_${date}`,
          user_id: u.id,
          employee_code: u.employee_code,
          name: u.name,
          department_id: u.department_id,
          date: date,
          punch_in: `${date}T09:00:00.000Z`,
          punch_out: `${date}T17:30:00.000Z`,
          total_working_hours: 8.5,
          status: 'Present'
        });
      } else {
        const inMin = 15 + (u.name.length % 20);
        const outMin = 30 + (u.name.length % 15);
        attendance.push({
          id: `att_${u.id}_${date}`,
          user_id: u.id,
          employee_code: u.employee_code,
          name: u.name,
          department_id: u.department_id,
          date: date,
          punch_in: `${date}T09:${inMin < 10 ? '0' + inMin : inMin}:00.000Z`,
          punch_out: `${date}T18:${outMin < 10 ? '0' + outMin : outMin}:00.000Z`,
          total_working_hours: 8.8,
          status: 'Present'
        });
      }
    });
  });

  // Seed today's attendance: some already working, some completed, some not yet punched in
  // E.g. Sarah Chen is already punched in (Working), David Miller is Working
  attendance.push({
    id: `att_usr_emp_sarah_${todayStr}`,
    user_id: 'usr_emp_sarah',
    employee_code: 'EMP006',
    name: 'Sarah Chen',
    department_id: 'dept_eng',
    date: todayStr,
    punch_in: `${todayStr}T09:15:00.000Z`,
    punch_out: null,
    total_working_hours: 0,
    status: 'Working'
  });

  attendance.push({
    id: `att_usr_mgr_eng_${todayStr}`,
    user_id: 'usr_mgr_eng',
    employee_code: 'EMP002',
    name: 'David Miller',
    department_id: 'dept_eng',
    date: todayStr,
    punch_in: `${todayStr}T08:45:00.000Z`,
    punch_out: null,
    total_working_hours: 0,
    status: 'Working'
  });

  attendance.push({
    id: `att_usr_emp_priya_${todayStr}`,
    user_id: 'usr_emp_priya',
    employee_code: 'EMP008',
    name: 'Priya Patel',
    department_id: 'dept_eng',
    date: todayStr,
    punch_in: `${todayStr}T08:30:00.000Z`,
    punch_out: `${todayStr}T17:00:00.000Z`,
    total_working_hours: 8.5,
    status: 'Completed'
  });

  // 8. Sample Leave Requests
  const leave_requests = [
    {
      id: 'lvr_1',
      user_id: 'usr_emp_alex',
      employee_code: 'EMP005',
      employee_name: 'Alex Rivera',
      department_id: 'dept_eng',
      manager_id: 'usr_mgr_eng',
      leave_type: 'Casual Leave',
      start_date: '2026-09-10',
      end_date: '2026-09-11',
      total_days: 2,
      reason: 'Family wedding ceremony attendance',
      status: 'Pending',
      approved_by: null,
      approver_remarks: null,
      createdAt: '2026-09-03T11:00:00.000Z'
    },
    {
      id: 'lvr_2',
      user_id: 'usr_emp_sarah',
      employee_code: 'EMP006',
      employee_name: 'Sarah Chen',
      department_id: 'dept_eng',
      manager_id: 'usr_mgr_eng',
      leave_type: 'Sick Leave',
      start_date: '2026-09-01',
      end_date: '2026-09-01',
      total_days: 1,
      reason: 'Fever and viral doctor visit',
      status: 'Approved',
      approved_by: 'David Miller',
      approver_remarks: 'Get well soon Sarah!',
      createdAt: '2026-08-31T18:00:00.000Z'
    },
    {
      id: 'lvr_3',
      user_id: 'usr_emp_james',
      employee_code: 'EMP009',
      employee_name: 'James Wilson',
      department_id: 'dept_sales',
      manager_id: 'usr_mgr_sales',
      leave_type: 'Paid Leave',
      start_date: '2026-09-21',
      end_date: '2026-09-25',
      total_days: 5,
      reason: 'Annual family vacation trip',
      status: 'Pending',
      approved_by: null,
      approver_remarks: null,
      createdAt: '2026-09-04T10:00:00.000Z'
    }
  ];

  // 9. Notifications
  const notifications = [
    {
      id: 'notif_1',
      user_id: 'usr_mgr_eng',
      title: 'New Leave Request',
      message: 'Alex Rivera has requested 2 days of Casual Leave (Sep 10 - Sep 11).',
      type: 'leave',
      is_read: false,
      link: '/leave/approvals',
      createdAt: '2026-09-03T11:00:00.000Z'
    },
    {
      id: 'notif_2',
      user_id: 'usr_emp_sarah',
      title: 'Leave Approved',
      message: 'Your Sick Leave for Sep 01 has been approved by David Miller.',
      type: 'leave',
      is_read: true,
      link: '/leave',
      createdAt: '2026-08-31T19:00:00.000Z'
    },
    {
      id: 'notif_3',
      user_id: 'usr_admin',
      title: 'New Announcement Published',
      message: 'Welcome to the New Quantira Technologies HRMS Portal is now live.',
      type: 'announcement',
      is_read: true,
      link: '/announcements',
      createdAt: '2026-09-01T09:00:00.000Z'
    }
  ];

  // Reset database with seeded data
  db.reset({
    users: allUsers,
    departments,
    designations,
    attendance,
    leave_balances: leaveBalances,
    leave_requests,
    holidays,
    announcements,
    notifications,
    settings: {
      company_name: 'Quantira Technologies',
      company_email: 'hr@quantiratechnologies.com',
      company_phone: '+1 (555) 019-2834',
      company_address: '100 Innovation Blvd, Suite 400, Tech City, CA',
      work_start_time: '09:00',
      work_end_time: '18:00',
      standard_hours: 8,
      half_day_hours: 4,
      weekend_days: ['Saturday', 'Sunday'],
      casual_leave_quota: 12,
      sick_leave_quota: 10,
      paid_leave_quota: 15,
      unpaid_leave_quota: 30
    }
  });

  console.log('✅ Database seeded successfully with:');
  console.log(` - ${allUsers.length} Users (1 Admin, 3 Managers, 11 Employees)`);
  console.log(` - ${departments.length} Departments`);
  console.log(` - ${holidays.length} Company Holidays`);
  console.log(` - ${attendance.length} Attendance Records`);
  console.log(` - ${leave_requests.length} Leave Requests`);
  console.log(` - ${announcements.length} Announcements`);
};

// Run if called directly
if (process.argv[1]?.endsWith('seed.js')) {
  seedDatabase().catch(console.error);
}
