const MODALITY: Record<string, string> = {
  REMOTE: 'Remoto',
  HYBRID: 'Híbrido',
  ONSITE: 'Presencial',
};

const EXPERIENCE: Record<string, string> = {
  TRAINEE: 'Practicante',
  JUNIOR: 'Junior',
  SEMI_SENIOR: 'Semi senior',
  SENIOR: 'Senior',
};

const APPLICATION: Record<string, string> = {
  RECEIVED: 'Postulación enviada',
  UNDER_REVIEW: 'En revisión',
  ACCEPTED: 'Aceptada',
  REJECTED: 'Rechazada',
};

const CONTEXT: Record<string, string> = {
  JOB_APPLICATION: 'Postulación',
  DIRECT_MESSAGE: 'Mensaje directo',
  INSTITUTIONAL: 'Institución',
  GENERAL: 'General',
};

const COMPATIBILITY: Record<string, string> = {
  ALTA: 'Alta',
  MEDIA: 'Media',
  BAJA: 'Baja',
  NA: 'Sin afinidad',
};

const ROLE: Record<string, string> = {
  POSTULANT: 'Postulante',
  RECRUITER: 'Empresa',
  INSTITUTION: 'Institución',
};

function label(map: Record<string, string>, value: string | null | undefined, fallback: string): string {
  if (!value) {
    return fallback;
  }
  return map[value] ?? fallback;
}

export function modalityLabel(value: string | null | undefined): string {
  return label(MODALITY, value, 'Modalidad por definir');
}

export function experienceLabel(value: string | null | undefined): string {
  return label(EXPERIENCE, value, 'Experiencia por definir');
}

export function applicationLabel(value: string | null | undefined): string {
  return label(APPLICATION, value, 'Postulación registrada');
}

export function contextLabel(value: string | null | undefined): string {
  return label(CONTEXT, value, '');
}

export function compatibilityLabel(value: string | null | undefined): string {
  return label(COMPATIBILITY, value, '');
}

export function roleLabel(value: string | null | undefined): string {
  return label(ROLE, value, 'Cuenta');
}
