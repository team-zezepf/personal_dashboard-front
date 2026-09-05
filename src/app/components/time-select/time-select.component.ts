import { Component, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-time-select',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './time-select.component.html',
  styleUrls: ['./time-select.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TimeSelectComponent),
      multi: true
    }
  ]
})
export class TimeSelectComponent implements ControlValueAccessor {
  readonly hours = Array.from({ length: 18 }, (_, i) => (i + 6).toString().padStart(2, '0'));
  readonly minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

  hour = this.hours[0];
  minute = this.minutes[0];
  disabled = false;

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    if (value && /^\d{2}:\d{2}/.test(value)) {
      this.hour = value.substring(0, 2);
      this.minute = value.substring(3, 5);
    } else {
      this.hour = this.hours[0];
      this.minute = this.minutes[0];
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onHourChange(event: Event): void {
    this.hour = (event.target as HTMLSelectElement).value;
    this.emit();
  }

  onMinuteChange(event: Event): void {
    this.minute = (event.target as HTMLSelectElement).value;
    this.emit();
  }

  private emit(): void {
    this.onTouched();
    this.onChange(`${this.hour}:${this.minute}`);
  }
}
