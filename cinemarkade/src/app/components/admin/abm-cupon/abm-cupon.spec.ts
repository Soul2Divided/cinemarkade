import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AbmCupon } from './abm-cupon';

describe('AbmCupon', () => {
  let component: AbmCupon;
  let fixture: ComponentFixture<AbmCupon>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AbmCupon],
    }).compileComponents();

    fixture = TestBed.createComponent(AbmCupon);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
