import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StudentSkillResponse } from '../../../../../core/models/profile.model';
import { SkillValidationResponse } from '../../../../../core/models/validation.model';

@Component({
  selector: 'app-profile-skills-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile-skills-card.html'
})
export class ProfileSkillsCard {
  skills = input<StudentSkillResponse[]>([]);
  validations = input<SkillValidationResponse[]>([]);
  institutionName = input<string | null | undefined>(null);
  institutionLogoUrl = input<string | null | undefined>(null);
  institutionInitials = input<string>('UNI');

  addSkillClick = output<void>();
  validateSkillClick = output<StudentSkillResponse | undefined>();
  toggleTopSkillClick = output<StudentSkillResponse>();
  deleteSkillClick = output<string>();

  getValidationForSkill(skill: StudentSkillResponse): SkillValidationResponse | undefined {
    return this.validations().find(
      (v) => v.technicalSkillId === skill.id || v.technicalSkillName === skill.name
    );
  }
}