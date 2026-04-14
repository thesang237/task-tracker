import { useState, useCallback } from 'react';
import './TimePicker.scss';

interface TimePickerProps {
  value: number; // seconds
  onChange: (seconds: number) => void;
}

export function TimePicker({ value, onChange }: TimePickerProps) {
  const [isCustom, setIsCustom] = useState(value > 0);

  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const seconds = value % 60;

  const handleNow = useCallback(() => {
    setIsCustom(false);
    onChange(0);
  }, [onChange]);

  const handleCustom = useCallback(() => {
    setIsCustom(true);
    if (value === 0) {
      onChange(60); // Default to 1 minute
    }
  }, [value, onChange]);

  const handleTimeChange = useCallback((field: 'hours' | 'minutes' | 'seconds', newValue: number) => {
    const clampedValue = Math.max(0, Math.min(field === 'hours' ? 23 : 59, newValue));
    let newHours = field === 'hours' ? clampedValue : hours;
    let newMinutes = field === 'minutes' ? clampedValue : minutes;
    let newSeconds = field === 'seconds' ? clampedValue : seconds;

    const totalSeconds = newHours * 3600 + newMinutes * 60 + newSeconds;
    onChange(totalSeconds);
  }, [hours, minutes, seconds, onChange]);

  const formatNumber = (num: number): string => num.toString().padStart(2, '0');

  return (
    <div className="time-picker">
      <span className="time-picker__label">Duration</span>
      <div className="time-picker__modes">
        <button
          type="button"
          className={`time-picker__mode ${!isCustom ? 'time-picker__mode--active' : ''}`}
          onClick={handleNow}
        >
          Now
        </button>
        <button
          type="button"
          className={`time-picker__mode ${isCustom ? 'time-picker__mode--active' : ''}`}
          onClick={handleCustom}
        >
          Custom
        </button>
      </div>

      {isCustom && (
        <div className="time-picker__inputs">
          <div className="time-picker__field">
            <label>Hours</label>
            <input
              type="number"
              min="0"
              max="23"
              value={formatNumber(hours)}
              onChange={(e) => handleTimeChange('hours', parseInt(e.target.value) || 0)}
              className="time-picker__input"
            />
          </div>
          <span className="time-picker__separator">:</span>
          <div className="time-picker__field">
            <label>Minutes</label>
            <input
              type="number"
              min="0"
              max="59"
              value={formatNumber(minutes)}
              onChange={(e) => handleTimeChange('minutes', parseInt(e.target.value) || 0)}
              className="time-picker__input"
            />
          </div>
          <span className="time-picker__separator">:</span>
          <div className="time-picker__field">
            <label>Seconds</label>
            <input
              type="number"
              min="0"
              max="59"
              value={formatNumber(seconds)}
              onChange={(e) => handleTimeChange('seconds', parseInt(e.target.value) || 0)}
              className="time-picker__input"
            />
          </div>
        </div>
      )}

      {isCustom && (
        <div className="time-picker__display">
          {formatNumber(hours)}:{formatNumber(minutes)}:{formatNumber(seconds)}
        </div>
      )}
    </div>
  );
}
