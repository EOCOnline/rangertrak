import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FieldReportsComponent } from './field-reports.component';

describe('FieldReportsComponent', () => {
  let component: FieldReportsComponent;
  let fixture: ComponentFixture<FieldReportsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FieldReportsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FieldReportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
