import { Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BioOptimizeResponse } from '../../../core/models/agent.model';
import { AgentService } from '../../../core/services/agent.service';
import { readApiError } from '../../../core/utils/api-error';

@Component({
  selector: 'app-bio-optimizer-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bio-optimizer-button.html'
})
export class BioOptimizerButton {
  private readonly agentService = inject(AgentService);

  currentText = input<string | null | undefined>('');
  maxLength = input<number>(1000);
  buttonLabel = input<string>('Optimizar con IA');

  optimizedApplied = output<string>();

  readonly isOptimizing = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly suggestion = signal<BioOptimizeResponse | null>(null);

  requestOptimization(): void {
    const raw = (this.currentText() || '').trim();
    if (raw.length < 10) {
      this.errorMessage.set('Escribe al menos un borrador breve (10+ caracteres) para optimizarlo.');
      return;
    }

    this.isOptimizing.set(true);
    this.errorMessage.set(null);

    this.agentService.optimizeBio(raw.slice(0, 2000)).subscribe({
      next: (res) => {
        this.suggestion.set(res);
        this.isOptimizing.set(false);
      },
      error: (err) => {
        this.isOptimizing.set(false);
        this.errorMessage.set(readApiError(err, 'No se pudo optimizar el texto con IA.'));
      }
    });
  }

  applySuggestion(): void {
    const text = this.suggestion()?.optimizedBio?.trim();
    if (!text) return;
    this.optimizedApplied.emit(text.slice(0, this.maxLength()));
    this.suggestion.set(null);
    this.errorMessage.set(null);
  }

  discardSuggestion(): void {
    this.suggestion.set(null);
    this.errorMessage.set(null);
  }
}
