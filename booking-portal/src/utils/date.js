export const getTodayIST = () => {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date());
};

export const getMonthKey = (year, month) => `${year}-${String(month).padStart(2, '0')}`;

export const buildMonthGrid = (year, month) => {
    const firstDay = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const weeks = [];
    let currentWeek = Array(7).fill(null);

    for (let i = 1; i <= lastDay; i++) {
        const dayIndex = (firstDay + i - 1) % 7;
        currentWeek[dayIndex] = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        if (dayIndex === 6 || i === lastDay) {
            weeks.push(currentWeek);
            currentWeek = Array(7).fill(null);
        }
    }
    return weeks;
};

export const formatDisplayDate = (dateString) => {
    const [y, m, d] = dateString.split('-').map(Number);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const suffix = d === 1 || d === 21 || d === 31 ? "st" : d === 2 || d === 22 ? "nd" : d === 3 || d === 23 ? "rd" : "th";
    return `${d}${suffix} ${months[m - 1]} ${y}`;
};
