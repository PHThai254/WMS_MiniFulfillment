// File: src/helpers/formatters.ts

export const formatVND = (price: number | null | undefined): string => {
    // Nếu price là null, undefined hoặc 0, trả về mặc định
    if (!price) return "0 ₫";
    
    return new Intl.NumberFormat('vi-VN', { 
        style: 'currency', 
        currency: 'VND' 
    }).format(price);
};