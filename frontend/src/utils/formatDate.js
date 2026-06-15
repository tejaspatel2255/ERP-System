import { format, parseISO } from 'date-fns';

/**
 * Format date string or Date object to 'dd MMM yyyy'
 * @param {string|Date} date - ISO Date string or Date object
 * @returns {string} Formatted date text
 */
export const formatDate = (date) => {
  if (!date) return 'N/A';
  try {
    const d = typeof date === 'string' ? parseISO(date) : new Date(date);
    return format(d, 'dd MMM yyyy');
  } catch (err) {
    return 'Invalid Date';
  }
};

/**
 * Format date string or Date object to 'dd MMM yyyy, hh:mm a'
 * @param {string|Date} date - ISO Date string or Date object
 * @returns {string} Formatted datetime text
 */
export const formatDateTime = (date) => {
  if (!date) return 'N/A';
  try {
    const d = typeof date === 'string' ? parseISO(date) : new Date(date);
    return format(d, 'dd MMM yyyy, hh:mm a');
  } catch (err) {
    return 'Invalid Date';
  }
};
