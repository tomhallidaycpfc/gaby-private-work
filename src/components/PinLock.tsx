'use client';

import { useState, useEffect } from 'react';

interface PinLockProps {
  children: React.ReactNode;
}

export default function PinLock({ children }: PinLockProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState(false);

  // Hardcoded permanent 4-digit PIN
  const CORRECT_PIN = '2930';

  useEffect(() => {
    const savedAuth = localStorage.getItem('gaby_app_authenticated');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  function handleKeyPad(digit: string) {
    if (pinInput.length < 4) {
      const nextPin = pinInput + digit;
      setPinInput(nextPin);
      setError(false);

      if (nextPin.length === 4) {
        if (nextPin === CORRECT_PIN) {
          localStorage.setItem('gaby_app_authenticated', 'true');
          setIsAuthenticated(true);
        } else {
          setError(true);
          setTimeout(() => {
            setPinInput('');
          }, 600);
        }
      }
    }
  }

  function handleClear() {
    setPinInput('');
    setError(false);
  }

  function handleLock() {
    localStorage.removeItem('gaby_app_authenticated');
    setIsAuthenticated(false);
    setPinInput('');
  }

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
            🔒
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">Gaby's Work Tracker</h1>
          <p className="text-sm text-gray-500 mb-6">Enter 4-digit Passcode to access</p>

          {/* PIN Dots Indicator */}
          <div className="flex justify-center gap-4 mb-6">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full border-2 transition-all ${
                  error
                    ? 'border-red-500 bg-red-500 animate-shake'
                    : idx < pinInput.length
                    ? 'border-indigo-600 bg-indigo-600 scale-110'
                    : 'border-gray-300 bg-gray-100'
                }`}
              />
            ))}
          </div>

          {error && <p className="text-xs text-red-500 mb-4 font-semibold">Incorrect Passcode. Try again.</p>}

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-3 max-w-[240px] mx-auto">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                onClick={() => handleKeyPad(num)}
                className="w-16 h-16 rounded-full bg-gray-50 hover:bg-indigo-50 border border-gray-200 active:scale-95 text-xl font-bold text-gray-800 flex items-center justify-center transition"
              >
                {num}
              </button>
            ))}
            <button
              onClick={handleClear}
              className="w-16 h-16 rounded-full bg-gray-100 hover:bg-gray-200 active:scale-95 text-xs font-semibold text-gray-600 flex items-center justify-center transition"
            >
              Clear
            </button>
            <button
              onClick={() => handleKeyPad('0')}
              className="w-16 h-16 rounded-full bg-gray-50 hover:bg-indigo-50 border border-gray-200 active:scale-95 text-xl font-bold text-gray-800 flex items-center justify-center transition"
            >
              0
            </button>
            <div className="w-16 h-16" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={handleLock}
          className="bg-white/80 hover:bg-white text-gray-700 hover:text-red-600 border border-gray-300 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm transition backdrop-blur flex items-center gap-1.5"
          title="Lock App"
        >
          🔒 Lock App
        </button>
      </div>
      {children}
    </>
  );
}
