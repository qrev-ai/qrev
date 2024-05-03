import React from 'react';

interface CustomNumInputProps {
  className?: string;
  placeholder?: string;
  value?: string;
  onChange: (val: string) => void;
}

const CustomNumInput = ({
  className,
  placeholder,
  value,
  onChange,
}: CustomNumInputProps): React.ReactElement => {
  return (
    <div className="relative flex items-center">
      {value === '0' && <p className="absolute left-2.5 text-sm text-black">N/A</p>}
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${className} ${value === '0' && 'text-white'}`}
        placeholder={placeholder}
      />
    </div>
  );
};

export default CustomNumInput;
