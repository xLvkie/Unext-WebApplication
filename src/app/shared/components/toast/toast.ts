import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastData {
  message: string;
  type: ToastType;
}

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.html'
})
export class Toast {
  toast = input<ToastData | null>(null);
  dismiss = output<void>();
}