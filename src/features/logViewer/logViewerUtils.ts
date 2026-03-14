export const ROW_ESTIMATE = 32;
export const PAD_LENGTH_2 = 2;
export const PAD_LENGTH_3 = 3;

export const formatTimestamp = (date: Date): string => {
  const dateObj = new Date(date);
  const hours = String(dateObj.getHours()).padStart(PAD_LENGTH_2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(PAD_LENGTH_2, '0');
  const seconds = String(dateObj.getSeconds()).padStart(PAD_LENGTH_2, '0');
  const milliseconds = String(dateObj.getMilliseconds()).padStart(PAD_LENGTH_3, '0');
  return `${hours}:${minutes}:${seconds}.${milliseconds}`;
};

export const isNearBottom = (el: HTMLDivElement): boolean => {
  const distanceToBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
  return distanceToBottom < ROW_ESTIMATE;
};
