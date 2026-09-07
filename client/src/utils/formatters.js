const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Formats any date input (YYYY-MM-DD, ISO string, Date object) to "01 Jan, 2026" (DD MMM, YYYY)
 */
export const formatDate = (dateInput) => {
  if (!dateInput) return '';

  // Handle YYYY-MM-DD directly to prevent timezone shift issues
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [year, month, day] = trimmed.split('-');
      const formattedDay = String(parseInt(day, 10)).padStart(2, '0');
      const monthIndex = parseInt(month, 10) - 1;
      const monthName = MONTH_NAMES[monthIndex] || month;
      return `${formattedDay} ${monthName}, ${year}`;
    }

    // Handle YYYY-MM-DDTHH:mm:ss.sssZ if date-only time
    if (/^\d{4}-\d{2}-\d{2}T00:00:00/.test(trimmed)) {
      const [year, month, day] = trimmed.split('T')[0].split('-');
      const formattedDay = String(parseInt(day, 10)).padStart(2, '0');
      const monthIndex = parseInt(month, 10) - 1;
      const monthName = MONTH_NAMES[monthIndex] || month;
      return `${formattedDay} ${monthName}, ${year}`;
    }
  }

  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return String(dateInput);

  const day = String(date.getDate()).padStart(2, '0');
  const monthName = MONTH_NAMES[date.getMonth()] || '';
  const year = date.getFullYear();

  return `${day} ${monthName}, ${year}`;
};

/**
 * Formats any time input (ISO string, timestamp, Date object, or time string) to 24-hour format: "HH:mm"
 * e.g. 14:30, 09:05
 */
export const formatTime = (timeInput) => {
  if (!timeInput) return '--:--';

  if (typeof timeInput === 'string') {
    const trimmed = timeInput.trim();
    // Case: "HH:mm" or "HH:mm:ss"
    const match24 = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (match24) {
      const hours = match24[1].padStart(2, '0');
      const minutes = match24[2];
      return `${hours}:${minutes}`;
    }

    // Case: "hh:mm AM/PM" or "hh:mm:ss AM/PM"
    const match12 = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
    if (match12) {
      let hours = parseInt(match12[1], 10);
      const minutes = match12[2];
      const meridiem = match12[3].toUpperCase();
      if (meridiem === 'PM' && hours < 12) hours += 12;
      if (meridiem === 'AM' && hours === 12) hours = 0;
      return `${String(hours).padStart(2, '0')}:${minutes}`;
    }
  }

  const date = new Date(timeInput);
  if (isNaN(date.getTime())) return String(timeInput);

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
};

/**
 * Formats date and time combined: "01 Jan, 2026 14:30"
 */
export const formatDateTime = (input) => {
  if (!input) return '';
  return `${formatDate(input)} ${formatTime(input)}`;
};

export default { formatDate, formatTime, formatDateTime };
