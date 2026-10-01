import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AbmCombo } from './abm-combo';

describe('AbmCombo', () => {
  let component: AbmCombo;
  let fixture: ComponentFixture<AbmCombo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AbmCombo],
    }).compileComponents();

    fixture = TestBed.createComponent(AbmCombo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
