import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { PostulantProfileResponse } from '../../core/models/profile.model';
import { AuthService } from '../../core/services/auth.service';
import { ProfileService } from '../../core/services/profile.service';
import { Profile } from './profile';

const postulant: PostulantProfileResponse = {
  id: 'p1',
  userId: 'u1',
  firstName: 'Ana',
  lastName: 'Quispe',
  studentCode: 'U20210001',
  career: 'Sistemas',
  currentCycle: 9,
  cvUrl: null,
  headline: 'Backend jr',
  bio: 'Me gusta Java',
  isInstitutionVerified: null,
  skills: [{ id: 's1', name: 'Java', masteryLevel: 'AVANZADO' }],
};

function setup(profileService: Partial<ProfileService>, token: string | null = 'jwt') {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: ProfileService, useValue: profileService },
      {
        provide: AuthService,
        useValue: { getToken: () => token, currentUserRole: () => 'POSTULANT' },
      },
    ],
  });
  const fixture = TestBed.createComponent(Profile);
  fixture.detectChanges();
  return fixture;
}

describe('Profile', () => {
  it('muestra iniciales, nombre, habilidades con su nivel y trata la verificación null como no verificado', () => {
    const fixture = setup({ getMyPostulantProfile: () => of(postulant) });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('AQ');
    expect(text).toContain('Ana Quispe');
    expect(text).toContain('Java');
    expect(text).toContain('AVANZADO');
    expect(text).toContain('Sin verificar');
  });

  it('avisa que no hay CV cuando cvUrl es null y muestra Ver CV cuando existe', () => {
    const fixture = setup({ getMyPostulantProfile: () => of(postulant) });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Aún no agregaste tu CV');

    TestBed.resetTestingModule();
    const withCv = setup({
      getMyPostulantProfile: () => of({ ...postulant, cvUrl: 'https://cv.test/ana' }),
    });
    const link = (withCv.nativeElement as HTMLElement).querySelector(
      'a[href="https://cv.test/ana"]',
    );
    expect(link?.textContent).toContain('Ver CV');
  });

  it('muestra un enlace a /login cuando la API responde 401', () => {
    const fixture = setup({
      getMyPostulantProfile: () => throwError(() => new HttpErrorResponse({ status: 401 })),
    });
    const link = (fixture.nativeElement as HTMLElement).querySelector('a[href="/login"]');
    expect(link).not.toBeNull();
  });

  it('muestra un enlace a /login cuando no hay sesión, sin llamar a la API', () => {
    const getMyPostulantProfile = vi.fn();
    const fixture = setup({ getMyPostulantProfile }, null);

    expect(getMyPostulantProfile).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).querySelector('a[href="/login"]')).not.toBeNull();
  });
});
