const ID_FORMATS = {
  aadhaar: /^\d{12}$/,
  passport: /^[A-Z0-9]{6,9}$/,
  driving_licence: /^[A-Z0-9]{8,20}$/,
  oci: /^[A-Z0-9]{6,20}$/,
};

const ID_HINTS = {
  aadhaar: 'Aadhaar must be 12 digits',
  passport: 'Passport must be 6-9 letters/digits',
  driving_licence: 'Driving licence must be 8-20 letters/digits',
  oci: 'OCI must be 6-20 letters/digits',
};

const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M}\s.'-]*$/u;

// "1234 5678 9012" and "ab-123" become "123456789012" / "AB123"
export const normalizeIdNumber = (value = '') => value.replace(/[\s-]/g, '').toUpperCase();

export const validateTraveller = (traveller, isAdult) => {
  const errors = {};

  const name = (traveller.name || '').trim();
  if (name.length < 2) errors.name = 'Enter the full name';
  else if (name.length > 80 || !NAME_RE.test(name)) errors.name = 'Use letters only';

  if (!traveller.gender) errors.gender = 'Select gender';

  const ageText = String(traveller.age ?? '').trim();
  if (!ageText) errors.age = 'Required';
  else if (!/^\d{1,3}$/.test(ageText)) errors.age = 'Invalid age';
  else {
    const age = Number(ageText);
    if (isAdult && (age < 13 || age > 100)) errors.age = 'Adult: 13-100';
    if (!isAdult && (age < 5 || age > 12)) errors.age = 'Child: 5-12';
  }

  if (!traveller.nationality) errors.nationality = 'Select nationality';
  if (!traveller.idType) errors.idType = 'Select ID type';

  const id = normalizeIdNumber(traveller.idNumber);
  if (!id) errors.idNumber = 'Enter ID number';
  else if (traveller.idType && ID_FORMATS[traveller.idType] && !ID_FORMATS[traveller.idType].test(id)) {
    errors.idNumber = ID_HINTS[traveller.idType];
  }

  return errors;
};