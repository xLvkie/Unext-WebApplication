import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ProfileService } from './profile.service';

describe('ProfileService', () => {
  let service: ProfileService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProfileService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('pide el perfil de postulante, reclutador e institución a /profiles/*/me', () => {
    service.getMyPostulantProfile().subscribe();
    service.getMyRecruiterProfile().subscribe();
    service.getMyInstitutionProfile().subscribe();

    http.expectOne({ method: 'GET', url: '/api/profiles/postulant/me' }).flush({});
    http.expectOne({ method: 'GET', url: '/api/profiles/recruiter/me' }).flush({});
    http.expectOne({ method: 'GET', url: '/api/profiles/institution/me' }).flush({});
  });

  it('actualiza el perfil con PUT', () => {
    service.updateMyPostulantProfile({ headline: 'Backend jr', currentCycle: 8 }).subscribe();

    const req = http.expectOne({ method: 'PUT', url: '/api/profiles/postulant/me' });
    expect(req.request.body).toEqual({ headline: 'Backend jr', currentCycle: 8 });
    req.flush({});
  });

  it('agrega y elimina habilidades', () => {
    service.addSkill({ name: 'Java', masteryLevel: 'AVANZADO' }).subscribe();
    const post = http.expectOne({ method: 'POST', url: '/api/profiles/postulant/me/skills' });
    expect(post.request.body).toEqual({ name: 'Java', masteryLevel: 'AVANZADO' });
    post.flush({});

    service.deleteSkill('abc').subscribe();
    http.expectOne({ method: 'DELETE', url: '/api/profiles/postulant/me/skills/abc' }).flush(null);
  });
});
