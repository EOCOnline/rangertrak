import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GEOCODING_PROVIDER, NominatimGeocoder } from '../shared';
import { EntryComponent } from './entry.component';

describe('EntryComponent', () => {
  let component: EntryComponent;
  let fixture: ComponentFixture<EntryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ EntryComponent ],
      providers: [
        { provide: GEOCODING_PROVIDER, useValue: new NominatimGeocoder() }
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EntryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
