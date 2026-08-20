import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeaderComponent } from './header.component';
import { SettingsType } from '../services';

function settingsWith(mission: string, event: string): SettingsType {
  return {
    mission, event, eventNotes: '', opPeriod: '',
    opPeriodStart: new Date(), opPeriodEnd: new Date(),
  } as unknown as SettingsType;
}

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ HeaderComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // E-57(1): eventInfo used to always render "#mission: event", so a fresh install (or the
  // maintainer's own screenshots before Settings was filled in) showed the bare literal
  // "#:" - an isolated fragment in the newly-grouped status cluster.
  describe('eventInfo (E-57(1))', () => {
    it('is empty when neither mission nor event is set', () => {
      component.onNewSettings(settingsWith('', ''));
      expect(component.eventInfo()).toBe('');
    });

    it('is empty when both are only whitespace', () => {
      component.onNewSettings(settingsWith('  ', ' '));
      expect(component.eventInfo()).toBe('');
    });

    it('shows the real format once a mission is set', () => {
      component.onNewSettings(settingsWith('2026-014', ''));
      expect(component.eventInfo()).toBe('#2026-014: ');
    });

    it('shows the real format once an event name is set', () => {
      component.onNewSettings(settingsWith('', 'Vashon SAR Exercise'));
      expect(component.eventInfo()).toBe('#: Vashon SAR Exercise');
    });
  });
});
