import React from 'react';

interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number';
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function Input({
  type = 'text',
  label,
  placeholder,
  value,
  onChange,
  error,
  required = false,
  disabled = false,
  className = '',
}: InputProps) {
  const [showPassword, setShowPassword] = React.useState(false);
  
  const inputType = type === 'password' && showPassword ? 'text' : type;
  
  return (
    <div className={`flex flex-col ${className}`}>
      <label className="text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="relative">
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        )}
      </div>
      
      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}
