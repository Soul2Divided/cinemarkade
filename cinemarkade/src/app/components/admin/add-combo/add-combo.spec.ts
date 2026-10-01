import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddCombo } from './add-combo';

describe('AddCombo', () => {
  let component: AddCombo;
  let fixture: ComponentFixture<AddCombo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddCombo],
    }).compileComponents();

    fixture = TestBed.createComponent(AddCombo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
