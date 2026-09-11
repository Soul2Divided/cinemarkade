import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SelectLogin } from './select-login';

describe('SelectLogin', () => {
  let component: SelectLogin;
  let fixture: ComponentFixture<SelectLogin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectLogin],
    }).compileComponents();

    fixture = TestBed.createComponent(SelectLogin);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
