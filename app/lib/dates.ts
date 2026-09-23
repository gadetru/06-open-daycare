export const SHORT_MONTHS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
] as const;

export function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

export function isRealDate(day: number, month: number, year: number): boolean {
  if (month < 1 || month > 12) {
    return false;
  }
  return day >= 1 && day <= daysInMonth(year, month);
}

export function formatShortDate(day: number, month: number, year: number): string {
  return `${day} ${SHORT_MONTHS[month - 1]} ${year}`;
}

export function getAgeInYears(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const hasNotHadBirthdayYet =
    today.getMonth() < birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate());
  if (hasNotHadBirthdayYet) {
    age -= 1;
  }
  return age;
}

export function getCurrentMonthYear(): string {
  const today = new Date();
  return `${SHORT_MONTHS[today.getMonth()]} ${today.getFullYear()}`;
}

export function getMaxBirthDate(): Date {
  const today = new Date();
  return new Date(today.getFullYear() - 2, today.getMonth(), today.getDate());
}

function runStructureTests(): void {
  const check = (description: string, condition: boolean): void => {
    if (!condition) {
      throw new Error(`dates.ts structure test failed: ${description}`);
    }
  };

  check("daysInMonth counts a leap February as 29 days", daysInMonth(2024, 2) === 29);
  check("daysInMonth counts a regular February as 28 days", daysInMonth(2023, 2) === 28);
  check("daysInMonth counts April as 30 days", daysInMonth(2026, 4) === 30);
  check("daysInMonth counts January as 31 days", daysInMonth(2026, 1) === 31);
  check("isRealDate accepts a real date", isRealDate(5, 5, 2023));
  check("isRealDate rejects an impossible leap day", !isRealDate(29, 2, 2023));
  check("isRealDate accepts a real leap day", isRealDate(29, 2, 2024));
  check("isRealDate rejects day 0", !isRealDate(0, 5, 2023));
  check("isRealDate rejects month 13", !isRealDate(1, 13, 2023));
  check("formatShortDate formats '5 may 2023'", formatShortDate(5, 5, 2023) === "5 may 2023");
  check("formatShortDate formats '1 ene 2026'", formatShortDate(1, 1, 2026) === "1 ene 2026");
  check("getCurrentMonthYear matches 'mmm aaaa'", /^[a-z]{3} \d{4}$/.test(getCurrentMonthYear()));

  const today = new Date();
  const threeYearsAgo = new Date(today.getFullYear() - 3, today.getMonth(), today.getDate());
  check("getAgeInYears returns completed years", getAgeInYears(threeYearsAgo) === 3);
  check("getMaxBirthDate returns a valid Date", getMaxBirthDate() instanceof Date);
}

if (process.env.NODE_ENV === "development") {
  runStructureTests();
}