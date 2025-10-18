const NOTIFICATION_KEY = 'tryon_notified_jobs';
const NOTIFICATION_TIMEOUT = 10000; // 10 seconds

export const shouldShowNotification = (jobId: string): boolean => {
  const notified = JSON.parse(sessionStorage.getItem(NOTIFICATION_KEY) || '{}');
  const lastNotified = notified[jobId];
  
  if (lastNotified && Date.now() - lastNotified < NOTIFICATION_TIMEOUT) {
    return false;
  }
  
  return true;
};

export const markNotified = (jobId: string) => {
  const notified = JSON.parse(sessionStorage.getItem(NOTIFICATION_KEY) || '{}');
  notified[jobId] = Date.now();
  sessionStorage.setItem(NOTIFICATION_KEY, JSON.stringify(notified));
};
