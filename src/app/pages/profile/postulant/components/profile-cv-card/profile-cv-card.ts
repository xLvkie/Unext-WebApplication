import { Component, computed, inject, input, output } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-profile-cv-card',
  standalone: true,
  templateUrl: './profile-cv-card.html'
})
export class ProfileCvCard {
  private sanitizer = inject(DomSanitizer);

  cvUrl = input<string | null | undefined>(null);
  cvFileName = input<string | null | undefined>(null);
  cvFileSize = input<string | null | undefined>(null);
  fullName = input<string>('Postulante');

  uploadClick = output<void>();
  downloadClick = output<void>();
  removeClick = output<void>();

  isPdfCv = computed(() => {
    const url = this.cvUrl() || '';
    const name = (this.cvFileName() || '').toLowerCase();
    return url.startsWith('data:application/pdf') || name.endsWith('.pdf');
  });

  cvSafePreviewUrl = computed<SafeResourceUrl | null>(() => {
    const url = this.cvUrl();
    if (!url || !this.isPdfCv()) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `${url}#page=1&view=FitH&toolbar=0&navpanes=0&scrollbar=0`
    );
  });
}