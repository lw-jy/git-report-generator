/**
 * 根据时间范围计算起始/结束日期
 *
 * @param {string} range - today / 3days / week / 2weeks
 * @returns {{ since: Date, until: Date }}
 */
export function getDateRange(range) {
  const now = new Date();
  const since = new Date(now);

  switch (range) {
    case 'today':
      since.setHours(0, 0, 0, 0);
      break;
    case '3days':
      since.setDate(since.getDate() - 3);
      since.setHours(0, 0, 0, 0);
      break;
    case 'week':
      // 回到本周一的 00:00
      const dayOfWeek = since.getDay();
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 周日返回上周一
      since.setDate(since.getDate() - diff);
      since.setHours(0, 0, 0, 0);
      break;
    case '2weeks':
      since.setDate(since.getDate() - 14);
      since.setHours(0, 0, 0, 0);
      break;
    default:
      since.setDate(since.getDate() - 7);
      since.setHours(0, 0, 0, 0);
  }

  return { since, until: now };
}
