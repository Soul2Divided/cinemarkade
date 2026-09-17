import { AbstractControl } from "@angular/forms";
import { ValidationErrors } from '@angular/forms';

export function passwordCheck(controlGroup: AbstractControl): ValidationErrors | null {
    const pass = controlGroup.get('password')?.value;
    const pass2 = controlGroup.get('password2')?.value;

    if (pass !== pass2) {
        return { unmatchPassword: true };
    } else {
        return null;
    }
}