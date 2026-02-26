export function shortenLastName(fullName: string): string {
  const nameParts = fullName.split(' ');
  if (nameParts.length < 2) {
    return fullName;
  }
  return `${nameParts[0]} ${nameParts[1].charAt(0)}.`;
}

export function getLastNameFirstLetter(fullName: string): string {
  const nameParts = fullName.split(' ');
  return `${nameParts[1].charAt(0).toUpperCase()}`;
}

export function getFirstNameFromEmail(email: string): string {
  const nameParts = email.split('@')[0].split('.');
  return nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1);
}

export function extractNameFromEmail(email?: string): string {
  if (!email) return '';
  if (email === 'system-cron') return 'System';
  const nameParts = email.split('@')[0].split('.');
  const lastName =
    nameParts.length > 1
      ? nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1)
      : '';
  const firstNameInitial = nameParts[0].charAt(0).toUpperCase() + '.';
  return firstNameInitial + ' ' + lastName;
}

export function extractFullNameFromEmail(email: string): string {
  const nameParts = email.split('@')[0].split('.');
  const firstName = nameParts[0];
  const lastName = nameParts.length > 1 ? nameParts[1] : '';
  return (
    firstName.charAt(0).toUpperCase() +
    firstName.slice(1) +
    ' ' +
    lastName.charAt(0).toUpperCase() +
    lastName.slice(1)
  );
}

export function getInitialsFromEmail(email: string): string {
  const emailNamePart = email.split('@')[0];
  const nameParts = emailNamePart.split('.');

  if (nameParts.length < 2) {
    return nameParts[0].charAt(0).toUpperCase(); // Jeśli jest tylko jedna część, zwraca jej pierwszą literę
  }

  const initials = nameParts.map((part) => part.charAt(0).toUpperCase()).join('');

  return initials;
}

export function getInitials(firstName?: string, lastName?: string): string | null {
  if (!firstName || !lastName) return null;
  return `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
}

export function stripDiacritics(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0142/g, 'l')
    .replace(/\u0141/g, 'L');
}
