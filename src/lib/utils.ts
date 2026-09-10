import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
};

export const terbilang = (angka: number): string => {
  if (isNaN(angka) || angka === 0) return 'Nol';
  const bilangan = [
    '', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima',
    'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'
  ];

  const konversi = (n: number): string => {
    n = Math.floor(Math.abs(n));
    if (n < 12) return bilangan[n];
    if (n < 20) return `${bilangan[n - 10]} Belas`;
    if (n < 100) return `${bilangan[Math.floor(n / 10)]} Puluh ${bilangan[n % 10]}`.trim();
    if (n < 200) return `Seratus ${konversi(n - 100)}`.trim();
    if (n < 1000) return `${bilangan[Math.floor(n / 100)]} Ratus ${konversi(n % 100)}`.trim();
    if (n < 2000) return `Seribu ${konversi(n - 1000)}`.trim();
    if (n < 1000000) return `${konversi(Math.floor(n / 1000))} Ribu ${konversi(n % 1000)}`.trim();
    if (n < 1000000000) return `${konversi(Math.floor(n / 1000000))} Juta ${konversi(n % 1000000)}`.trim();
    if (n < 1000000000000) return `${konversi(Math.floor(n / 1000000000))} Miliar ${konversi(n % 1000000000)}`.trim();
    return `${konversi(Math.floor(n / 1000000000000))} Triliun ${konversi(n % 1000000000000)}`.trim();
  };

  return konversi(angka);
};

export const generateId = (prefix: string = 'ID'): string => {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${randomNum}`;
};
