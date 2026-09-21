export function calculateAge(dateOfBirth: string | null | undefined, today = new Date()): number | null {
  if (!dateOfBirth) return null;
  
  // Try parsing with different date formats
  let birthDate: Date;
  
  // Try YYYY-MM-DD format first
  if (dateOfBirth.includes('-')) {
    birthDate = new Date(dateOfBirth);
  } else {
    // Try other formats
    birthDate = new Date(dateOfBirth);
  }
  
  if (Number.isNaN(birthDate.getTime())) return null;

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDelta = today.getMonth() - birthDate.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

export function getRecordAge(age: number | null | undefined, dateOfBirth?: string | null): number | null {
  // Prioritize date_of_birth calculation, fall back to age field
  const calculatedAge = calculateAge(dateOfBirth);
  if (calculatedAge !== null && calculatedAge > 0) {
    return calculatedAge;
  }
  return age ?? null;
}