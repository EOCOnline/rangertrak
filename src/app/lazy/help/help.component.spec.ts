import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { HelpComponent } from './help.component';

describe('HelpComponent', () => {
  let component: HelpComponent;
  let fixture: ComponentFixture<HelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      // NoopAnimations: MatTabGroup animates its body, and without this the tab panels
      // never settle in a unit test.
      imports: [HelpComponent, NoopAnimationsModule],
      // For the routerLink="/log" help link (E-57(1): Log moved off the main menu,
      // reachable from here instead).
      providers: [provideRouter([])]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // E-84: the page is tabs, not one long scroll. The previous test here asserted an
  // <h2>Help</h2> that the tab shell no longer has - the labels are the structure now.
  // 2026-08-29 (D-d, F29-32): "Mission setup" merged into "Start here" as one onboarding
  // checklist; FAQ moved up; "After mission" split out of "Your data"; "Log" renamed
  // "Feedback" and took over the feedback form that had briefly been on "About" - still
  // eight tabs (the merge and the split cancel out), just a different eight.
  // 2026-08-30 (live request): "Entering reports" and "Maps" moved into the Entry/Map pages'
  // own Guide drawers - they were screen-specific operating instructions, not general Help -
  // leaving six.
  it('renders the six documentation tabs, in the planned order', () => {
    const labels: string[] = Array.from(
      fixture.nativeElement.querySelectorAll('.help-tabs .mdc-tab__text-label') as NodeListOf<HTMLElement>
    ).map(el => el.textContent!.trim());

    expect(labels).toEqual([
      'Start here', 'About', 'FAQ', 'Your data', 'After mission', 'Feedback'
    ]);
  });

});
