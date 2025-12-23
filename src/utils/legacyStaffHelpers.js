// ============================================
// LEGACY STAFF HISTORY UTILITIES
// ============================================
// Helper functions for managing task attribution
// when staff members are deleted from the system
// ============================================

/**
 * Formats a legacy staff name for display
 * @param {string} legacyName - The preserved staff name
 * @returns {string} Formatted display name
 */
export function formatLegacyStaffName(legacyName) {
  if (!legacyName) return 'Unknown Staff';
  return legacyName.trim();
}

/**
 * Gets the display name for a task assignment
 * Handles active staff, inactive staff, and legacy (deleted) staff
 * 
 * @param {Object} task - The task object
 * @param {Object} task.assignedTo - Active staff member (optional)
 * @param {string} task.legacyAssignedName - Legacy staff name (optional)
 * @returns {Object} { name: string, type: 'active' | 'legacy' | 'unassigned' }
 */
export function getTaskAssignmentDisplay(task) {
  // Active staff member
  if (task.assignedTo && task.assignedTo.firstName) {
    return {
      name: task.assignedTo.firstName,
      email: task.assignedTo.email,
      type: 'active'
    };
  }
  
  // Legacy staff (deleted)
  if (task.legacyAssignedName) {
    return {
      name: formatLegacyStaffName(task.legacyAssignedName),
      type: 'legacy'
    };
  }
  
  // Unassigned
  return {
    name: 'Unassigned',
    type: 'unassigned'
  };
}

/**
 * Checks if a task has legacy attribution
 * @param {Object} task - The task object
 * @returns {boolean}
 */
export function isLegacyTask(task) {
  return Boolean(task.legacyAssignedName && !task.assignedTo);
}

/**
 * Gets a CSS class for the assignment badge
 * @param {string} type - 'active' | 'legacy' | 'unassigned'
 * @returns {string} Tailwind CSS classes
 */
export function getAssignmentBadgeClass(type) {
  const classes = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    legacy: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    unassigned: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
  };
  
  return classes[type] || classes.unassigned;
}

module.exports = {
  formatLegacyStaffName,
  getTaskAssignmentDisplay,
  isLegacyTask,
  getAssignmentBadgeClass
};
