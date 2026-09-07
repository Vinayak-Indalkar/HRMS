import { db } from '../db/database.js';

export const notificationService = {
  create(userId, title, message, type = 'system', link = null) {
    return db.insert('notifications', {
      user_id: userId,
      title,
      message,
      type,
      link,
      is_read: false
    });
  },

  notifyLeaveSubmitted(leaveRequest, employee, appliedByManager = null) {
    if (appliedByManager) {
      // Notify employee that manager applied on their behalf
      this.create(
        employee.id,
        'Leave Applied on Your Behalf',
        `Your manager ${appliedByManager.name} has submitted a leave request on your behalf for ${leaveRequest.leave_type} (${leaveRequest.start_date} to ${leaveRequest.end_date}, ${leaveRequest.total_days} day(s)). Reason: "${leaveRequest.reason || 'General'}". Current Status: ${leaveRequest.status}.`,
        'leave',
        '/leave'
      );
    } else if (employee.manager_id) {
      // Notify reporting manager if applied by employee
      this.create(
        employee.manager_id,
        'New Leave Request',
        `${employee.name} applied for ${leaveRequest.total_days} day(s) of ${leaveRequest.leave_type} (${leaveRequest.start_date} to ${leaveRequest.end_date}).`,
        'leave',
        '/leave/approvals'
      );
    }

    // Notify L2 Manager if exists
    if (leaveRequest.l2_manager_id) {
      this.create(
        leaveRequest.l2_manager_id,
        appliedByManager ? 'Action Required: L2 Leave Approval' : 'Leave Request Submitted for Team Member',
        `${employee.name}'s request for ${leaveRequest.leave_type} (${leaveRequest.total_days} day(s)) is pending your L2 review.`,
        'leave',
        '/leave/approvals'
      );
    }

    // Also notify HR Admins
    const admins = db.find('users', u => ['admin', 'super_admin', 'hr_admin'].includes(u.role) && u.status === 'active');
    admins.forEach(admin => {
      this.create(
        admin.id,
        appliedByManager ? 'Leave Applied by Manager - HR Action' : 'Leave Request Submitted',
        `${appliedByManager ? appliedByManager.name + ' applied for ' : ''}${employee.name} (${leaveRequest.leave_type}) awaits final L2 / HR approval.`,
        'leave',
        '/admin/leaves'
      );
    });
  },

  notifyLeaveForwardedToL2AndHR(leaveRequest, l1ManagerName) {
    // Notify employee
    this.create(
      leaveRequest.user_id,
      'Leave Approved at Level 1',
      `Your ${leaveRequest.leave_type} request was endorsed by ${l1ManagerName} and forwarded to L2 Manager & HR for final approval.`,
      'leave',
      '/leave'
    );

    // Notify L2 Manager
    if (leaveRequest.l2_manager_id) {
      this.create(
        leaveRequest.l2_manager_id,
        'Action Required: L2 Leave Sign-off',
        `${leaveRequest.employee_name}'s request (${leaveRequest.leave_type}) was approved by L1 Manager ${l1ManagerName} and is awaiting your decision.`,
        'leave',
        '/leave/approvals'
      );
    }

    // Notify HR Admins
    const admins = db.find('users', u => ['admin', 'super_admin', 'hr_admin'].includes(u.role) && u.status === 'active');
    admins.forEach(admin => {
      this.create(
        admin.id,
        'L1 Approved Leave - HR Final Review',
        `${leaveRequest.employee_name}'s request (${leaveRequest.leave_type}) was approved by L1 ${l1ManagerName} and awaits HR / L2 final approval.`,
        'leave',
        '/admin/leaves'
      );
    });
  },

  notifyLeaveDecision(leaveRequest, approverName) {
    this.create(
      leaveRequest.user_id,
      `Leave Request ${leaveRequest.status}`,
      `Your request for ${leaveRequest.leave_type} (${leaveRequest.start_date} to ${leaveRequest.end_date}) was ${leaveRequest.status.toLowerCase()} by ${approverName}.`,
      'leave',
      '/leave'
    );

    // If manager applied on employee's behalf, notify manager of the final outcome too
    if (leaveRequest.applied_by_manager_id && leaveRequest.applied_by_manager_id !== leaveRequest.user_id) {
      this.create(
        leaveRequest.applied_by_manager_id,
        `Leave Request Decision: ${leaveRequest.employee_name}`,
        `The leave you applied for ${leaveRequest.employee_name} has been ${leaveRequest.status.toLowerCase()} by ${approverName}.`,
        'leave',
        '/leave/approvals'
      );
    }
  },

  notifyAnnouncement(announcement) {
    const users = db.find('users', u => u.status === 'active');
    users.forEach(u => {
      this.create(
        u.id,
        `New Announcement: ${announcement.title}`,
        announcement.description.slice(0, 100) + '...',
        'announcement',
        '/announcements'
      );
    });
  }
};
