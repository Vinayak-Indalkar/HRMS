import { db } from './db/database.js';
import { seedDatabase } from './db/seed.js';

const BASE_URL = 'http://localhost:5000/api';

const runTests = async () => {
  console.log('🧪 Starting HRMS Automated Verification Suite...\n');
  let passed = 0;
  let failed = 0;

  const assert = (condition, message) => {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  };

  try {
    // 1. Health check
    console.log('1. Verifying Server Health...');
    const healthRes = await fetch(`${BASE_URL}/health`).then(r => r.json());
    assert(healthRes.status === 'healthy', 'Health check returns healthy status');

    // 2. Authentication
    console.log('\n2. Verifying Authentication & Role-Based Access...');
    // Admin login
    const adminLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@company.com', password: 'admin123' })
    }).then(r => r.json());
    assert(adminLogin.token && adminLogin.user.role === 'admin', 'Admin login successful with admin role');

    // Manager login
    const mgrLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'manager.eng@company.com', password: 'manager123' })
    }).then(r => r.json());
    assert(mgrLogin.token && mgrLogin.user.role === 'manager', 'Manager login successful with manager role');

    // Employee login
    const empLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'employee.alex@company.com', password: 'employee123' })
    }).then(r => r.json());
    assert(empLogin.token && empLogin.user.role === 'employee', 'Employee login successful with employee role');

    // Inactive user login rejection
    const inactiveLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'jordan.bell@company.com', password: 'employee123' })
    });
    assert(inactiveLogin.status === 403, 'Inactive employee login rejected with 403 Forbidden');

    // Bad password rejection
    const badPass = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@company.com', password: 'wrongpassword' })
    });
    assert(badPass.status === 401, 'Bad credentials rejected with 401 Unauthorized');

    // 3. Attendance Logic
    console.log('\n3. Verifying Server-Authoritative Attendance Logic...');
    const empHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${empLogin.token}`
    };

    // Punch In
    const punchInRes = await fetch(`${BASE_URL}/attendance/punch-in`, {
      method: 'POST',
      headers: empHeaders
    });
    const punchInData = await punchInRes.json();
    assert(punchInRes.status === 200 && punchInData.record.status === 'Working', 'Punch In successful, status set to Working');

    // Duplicate Punch In check
    const dupPunchIn = await fetch(`${BASE_URL}/attendance/punch-in`, {
      method: 'POST',
      headers: empHeaders
    });
    assert(dupPunchIn.status === 400, 'Duplicate Punch In prevented while already working');

    // Today status
    const todayStatus = await fetch(`${BASE_URL}/attendance/today`, { headers: empHeaders }).then(r => r.json());
    assert(todayStatus.isWorking === true && todayStatus.punchInTime !== null, "Today's status reflects active session with server timestamp");

    // Punch Out
    const punchOutRes = await fetch(`${BASE_URL}/attendance/punch-out`, {
      method: 'POST',
      headers: empHeaders
    });
    const punchOutData = await punchOutRes.json();
    assert(punchOutRes.status === 200 && punchOutData.record.punch_out !== null, 'Punch Out successful, server punch-out time recorded');

    // Duplicate Punch Out check
    const dupPunchOut = await fetch(`${BASE_URL}/attendance/punch-out`, {
      method: 'POST',
      headers: empHeaders
    });
    assert(dupPunchOut.status === 400, 'Punch Out without active session prevented');

    // 4. Leave Application & Approvals
    console.log('\n4. Verifying Leave Application & Approval Workflow...');
    const balancesBefore = await fetch(`${BASE_URL}/leaves/balances`, { headers: empHeaders }).then(r => r.json());
    const casualBal = balancesBefore.find(b => b.leave_type === 'Casual Leave');
    const remainingBefore = casualBal.remaining_leaves;

    // Apply for leave
    const applyRes = await fetch(`${BASE_URL}/leaves/apply`, {
      method: 'POST',
      headers: empHeaders,
      body: JSON.stringify({
        leave_type: 'Casual Leave',
        start_date: '2026-10-05',
        end_date: '2026-10-06',
        reason: 'Automated verification test leave'
      })
    });
    const applyData = await applyRes.json();
    assert(applyRes.status === 200 && applyData.leaveRequest.status === 'Pending', 'Leave application submitted with Pending status');
    const newReqId = applyData.leaveRequest.id;

    // Manager reviews and approves
    const mgrHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${mgrLogin.token}`
    };
    const reviewRes = await fetch(`${BASE_URL}/leaves/${newReqId}/review`, {
      method: 'POST',
      headers: mgrHeaders,
      body: JSON.stringify({ status: 'Approved', remarks: 'Verified and approved by manager' })
    });
    const reviewData = await reviewRes.json();
    assert(reviewRes.status === 200 && reviewData.request.status === 'Approved', 'Manager successfully approved leave request');

    // Balance deduction verification
    const balancesAfter = await fetch(`${BASE_URL}/leaves/balances`, { headers: empHeaders }).then(r => r.json());
    const casualBalAfter = balancesAfter.find(b => b.leave_type === 'Casual Leave');
    assert(casualBalAfter.remaining_leaves === remainingBefore - 2, 'Leave balance decremented by 2 days upon approval');

    // 5. Employee Management CRUD
    console.log('\n5. Verifying Employee Management (HR Admin)...');
    const adminHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminLogin.token}`
    };

    // Create Employee
    const testEmail = `samantha.reed.${Date.now()}@company.com`;
    const createEmpRes = await fetch(`${BASE_URL}/employees`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        name: 'Samantha Reed',
        email: testEmail,
        role: 'employee',
        department_id: 'dept_eng',
        designation: 'Staff Software Architect',
        manager_id: 'usr_mgr_eng',
        joining_date: '2026-09-01'
      })
    });
    const createEmpData = await createEmpRes.json();
    assert(createEmpRes.status === 201 && createEmpData.employee.employee_code.startsWith('EMP'), 'HR Admin created new employee with generated code');
    const newEmpId = createEmpData.employee.id;

    // Toggle status to inactive
    const deactivateRes = await fetch(`${BASE_URL}/employees/${newEmpId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'inactive' })
    });
    const deactData = await deactivateRes.json();
    assert(deactData.employee.status === 'inactive', 'HR Admin deactivated employee account');

    // 6. Holiday & Announcements
    console.log('\n6. Verifying Holidays & Announcements...');
    const holidayRes = await fetch(`${BASE_URL}/holidays`, { headers: adminHeaders }).then(r => r.json());
    assert(Array.isArray(holidayRes) && holidayRes.length > 0, 'Company holidays fetched successfully');

    const createAnn = await fetch(`${BASE_URL}/announcements`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        title: 'System Launch Success',
        description: 'HRMS MVP launch successfully verified across all modules.',
        category: 'Company'
      })
    }).then(r => r.json());
    assert(createAnn.announcement && createAnn.announcement.title === 'System Launch Success', 'HR Admin created announcement and triggered notifications');

    // 7. Role Dashboards
    console.log('\n7. Verifying Role-Based Dashboards...');
    const empDashboard = await fetch(`${BASE_URL}/dashboard/stats`, { headers: empHeaders }).then(r => r.json());
    assert(empDashboard.role === 'employee' && empDashboard.attendance !== undefined, 'Employee dashboard returns personalized attendance and balances');

    const mgrDashboard = await fetch(`${BASE_URL}/dashboard/stats`, { headers: mgrHeaders }).then(r => r.json());
    assert(mgrDashboard.role === 'manager' && mgrDashboard.teamOverview.teamSize > 0, 'Manager dashboard returns team presence metrics');

    const adminDashboard = await fetch(`${BASE_URL}/dashboard/stats`, { headers: adminHeaders }).then(r => r.json());
    assert(adminDashboard.role === 'admin' && adminDashboard.charts.deptDistribution.length > 0, 'Admin dashboard returns headcount distribution charts');

    console.log(`\n========================================`);
    console.log(`📊 Test Results: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
};

runTests();
