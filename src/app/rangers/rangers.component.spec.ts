import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RangersComponent } from './rangers.component';

describe('RangersComponent', () => {
  let component: RangersComponent;
  let fixture: ComponentFixture<RangersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ RangersComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RangersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
