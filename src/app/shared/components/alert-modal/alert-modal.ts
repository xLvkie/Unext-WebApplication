import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-alert-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alert-modal.html'
})
export class AlertModal {
  isOpen = input<boolean>(false);
  title = input<string>('Aviso');
  message = input<string>('');
  variant = input<'warning' | 'info' | 'danger'>('warning');
  confirmText = input<string>('Aceptar');
  cancelText = input<string>('Cerrar');

  confirm = output<void>();
  close = output<void>();
}