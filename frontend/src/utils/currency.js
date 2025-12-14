export const formatPriceINR = (value, withSymbol = true) => {
    if (value === null || value === undefined || value === '')
        return withSymbol ? '₹0' : '0';
    const num = typeof value === 'string' ? Number(value) : value;
    if (isNaN(num))
        return withSymbol ? '₹0' : '0';
    try {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(num);
    }
    catch {
        // Fallback formatting
        return `${withSymbol ? '₹' : ''}${Math.round(num).toLocaleString('en-IN')}`;
    }
};
