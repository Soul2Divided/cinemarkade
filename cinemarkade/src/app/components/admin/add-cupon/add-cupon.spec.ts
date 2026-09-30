import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddCupon } from './add-cupon';

describe('AddCupon', () => {
  let component: AddCupon;
  let fixture: ComponentFixture<AddCupon>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddCupon],
    }).compileComponents();

    fixture = TestBed.createComponent(AddCupon);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
