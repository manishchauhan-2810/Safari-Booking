// Jeep: 1-6 adults, adults + children <= 8. Canter: 1-16 people in total.
const MAX_TOTAL = { jeep: 8, canter: 16 };

export const getAdultOptions = (vehicle) => {
  const max = vehicle === 'jeep' ? 6 : 16;
  return Array.from({ length: max }, (_, i) => ({ value: i + 1, label: `${i + 1} ${i === 0 ? 'Adult' : 'Adults'}` }));
};

export const getMaxChildren = (vehicle, adults) => Math.max(0, MAX_TOTAL[vehicle] - adults);

export const getChildOptions = (vehicle, adults) =>
  Array.from({ length: getMaxChildren(vehicle, adults) + 1 }, (_, i) => ({
    value: i,
    label: `${i} ${i === 1 ? 'Child' : 'Children'}`,
  }));

export const validateSelection = (vehicle, adults, children, seatsLeft = 16) => {
  if (children < 0) return 'Invalid number of children';
  if (vehicle === 'jeep') {
    if (adults < 1 || adults > 6) return 'Jeep requires 1-6 adults';
    if (adults + children > 8) return 'Jeep total max 8';
  } else {
    const total = adults + children;
    if (total < 1 || total > 16) return 'Canter requires 1-16 total people';
    if (total > seatsLeft) return `Only ${seatsLeft} seats left`;
  }
  return null;
};