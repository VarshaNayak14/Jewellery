import { useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';

// Drop-in replacement for <input type="password"> with a show/hide eye button.
// All props go to the <input>; `className` styles the input itself, so existing
// input classes can be reused unchanged (right padding is added for the icon).
export default function PasswordInput({ className = '', wrapperClassName = '', ...props }) {
  const [show, setShow] = useState(false);
  return (
    <div className={`relative ${wrapperClassName}`}>
      <input {...props} type={show ? 'text' : 'password'} className={`${className} !pr-10`} />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow(s => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
        title={show ? 'Hide password' : 'Show password'}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-200"
      >
        {show ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
      </button>
    </div>
  );
}
