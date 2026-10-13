export function addMonths(date, months) {
  const source = new Date(date);
  const year = source.getUTCFullYear();
  const month = source.getUTCMonth() + months;
  const day = source.getUTCDate();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(
    year,
    month,
    Math.min(day, lastDay),
    source.getUTCHours(),
    source.getUTCMinutes(),
    source.getUTCSeconds(),
    source.getUTCMilliseconds()
  ));
}
