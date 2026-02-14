import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { formatIndianNumber, parseIndianNumber } from '@/lib/formatIndianNumber';
import { cn } from '@/lib/utils';

interface IndianRupeeInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
  min?: number;
  max?: number;
  disabled?: boolean;
}

export function IndianRupeeInput({
  value,
  onChange,
  className,
  placeholder = '0',
  required,
  min,
  max,
  disabled,
}: IndianRupeeInputProps) {
  const [displayValue, setDisplayValue] = useState(() => 
    value > 0 ? formatIndianNumber(value) : ''
  );

  useEffect(() => {
    // Only sync from outside if different
    const currentNum = parseIndianNumber(displayValue);
    if (currentNum !== value) {
      setDisplayValue(value > 0 ? formatIndianNumber(value) : '');
    }
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    if (raw === '' || raw === '.') {
      setDisplayValue('');
      onChange(0);
      return;
    }
    
    const num = parseFloat(raw);
    if (isNaN(num)) return;
    
    if (max !== undefined && num > max) return;
    
    setDisplayValue(formatIndianNumber(raw));
    onChange(num);
  }, [onChange, max]);

  return (
    <Input
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      className={cn('font-mono', className)}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
    />
  );
}
