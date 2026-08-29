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
  // 2026-08-27: "Start here" split into a separate About tab (was doing two jobs at once),
  // and a Log tab was added so the Log page (deliberately absent from the main nav) is
  // still easy to find.
  it('renders the eight documentation tabs, in the planned order', () => {
    const labels: string[] = Array.from(
      fixture.nativeElement.querySelectorAll('.help-tabs .mdc-tab__text-label') as NodeListOf<HTMLElement>
    ).map(el => el.textContent!.trim());

    expect(labels).toEqual([
      'Start here', 'About', 'Entering reports', 'Maps', 'Mission setup', 'Your data', 'Log', 'FAQ'
    ]);
  });

});
