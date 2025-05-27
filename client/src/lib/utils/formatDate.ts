/**
 * Format a date string to a more readable format
 * @param dateString ISO date string or Date object
 * @returns Formatted date string
 */
export function formatDate(dateString: string | Date | null): string {
  if (!dateString) return "No date";
  
  const date = typeof dateString === "string" ? new Date(dateString) : dateString;
  
  // Check if the date is valid
  if (isNaN(date.getTime())) {
    return "Invalid date";
  }
  
  // Get today, yesterday, and tomorrow dates for comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Set comparison date to midnight for accurate comparison
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);
  
  // Check if the date is today, yesterday, or tomorrow
  if (compareDate.getTime() === today.getTime()) {
    return `Today at ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  } else if (compareDate.getTime() === yesterday.getTime()) {
    return `Yesterday at ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  } else if (compareDate.getTime() === tomorrow.getTime()) {
    return `Tomorrow at ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }
  
  // Check if the date is within the current year
  const isCurrentYear = date.getFullYear() === today.getFullYear();
  
  // Format the date
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  };
  
  if (!isCurrentYear) {
    options.year = 'numeric';
  }
  
  return date.toLocaleDateString('en-US', options);
}
