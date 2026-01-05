# Angular 21 Migration Plan

## Overview
This document outlines the comprehensive migration of RangerTrak from Angular with legacy patterns to Angular 21 with modern features including signals, standalone components, and signal-based forms.

## Migration Phases

### Phase 1: Foundation & Cleanup ✓ IN PROGRESS
**Goal:** Remove incompatible dependencies and set up modern infrastructure

#### 1.1 Remove Incompatible Packages
- [x] Remove `@angular-material-components/datetime-picker` (incompatible with Angular 21)
- [x] Remove `@angular-material-components/color-picker` (incompatible with Angular 21)
- [ ] Replace with native Angular Material components or custom implementations

#### 1.2 Update Package.json
- [ ] Clean up overrides section
- [ ] Add any missing Angular 21 packages
- [ ] Update tsconfig for Angular 21 features

### Phase 2: Convert to Standalone Components
**Goal:** Eliminate NgModules and adopt standalone architecture

#### 2.1 Module Analysis
Current modules to convert:
- `AppModule` → Standalone bootstrap
- `MaterialModule` → Direct component imports
- `LazyModule` → Standalone lazy routes

#### 2.2 Conversion Steps
1. Convert all components to standalone
2. Add explicit imports to each component
3. Update routing to use standalone components
4. Remove all NgModule declarations
5. Update main.ts to bootstrap standalone component

### Phase 3: Implement Signals for State Management
**Goal:** Replace RxJS patterns with signals where appropriate

#### 3.1 Services to Migrate
- `DataService` - Convert BehaviorSubjects to signals
- `FieldReportService` - Use signals for report state
- `RangerService` - Use signals for ranger data
- `ClockService` - Convert to signal-based time updates
- `SettingsService` - Migrate settings to signals
- `InstallableService` - Convert observable patterns

#### 3.2 Signal Patterns
```typescript
// Before
private dataSubject = new BehaviorSubject<Data[]>([]);
data$ = this.dataSubject.asObservable();

// After
readonly data = signal<Data[]>([]);
readonly dataComputed = computed(() => this.data().filter(...));
```

### Phase 4: Modern Control Flow Syntax
**Goal:** Replace structural directives with built-in control flow

#### 4.1 Template Updates
- Replace `*ngIf` with `@if`
- Replace `*ngFor` with `@for`
- Replace `*ngSwitch` with `@switch`
- Use `@empty` for empty state handling

#### 4.2 Components to Update
- All HTML templates (58+ component templates)

### Phase 5: Modernize Dependency Injection
**Goal:** Use inject() function instead of constructor injection

#### 5.1 Pattern
```typescript
// Before
constructor(
  private http: HttpClient,
  private router: Router
) {}

// After
private http = inject(HttpClient);
private router = inject(Router);
```

### Phase 6: Signal-Based Forms
**Goal:** Integrate signals with reactive forms

#### 6.1 Forms to Migrate
- `EntryComponent` - Field report entry form
- `LocationComponent` - Location input form
- `SettingsComponent` - Settings editor form
- `TimePickerComponent` - Time selection form

#### 6.2 Modern Form Patterns
```typescript
// Use signal inputs
readonly initialValue = input<string>('');

// Use signal outputs
readonly formSubmit = output<FormData>();

// Create form with signals
readonly form = new FormGroup({
  field: new FormControl(this.initialValue())
});

// React to form changes with effects
constructor() {
  effect(() => {
    const value = this.initialValue();
    this.form.patchValue({ field: value });
  });
}
```

### Phase 7: Component Modernization
**Goal:** Use modern component features

#### 7.1 Signal Inputs/Outputs
- Convert `@Input()` to `input()` signals
- Convert `@Output()` to `output()` signals
- Use `model()` for two-way binding

#### 7.2 Components Priority List
1. Shared components (Header, Footer, Navbar)
2. Core components (Entry, FieldReports, Rangers)
3. Map components (GMap, LMap)
4. Settings components
5. Utility components

### Phase 8: Routing & Lazy Loading
**Goal:** Modern routing with standalone components

#### 8.1 Route Updates
```typescript
// Before
{
  path: 'about',
  loadChildren: () => import('./lazy/lazy.module').then(m => m.LazyModule)
}

// After
{
  path: 'about',
  loadComponent: () => import('./lazy/about/about.component').then(m => m.AboutComponent)
}
```

### Phase 9: Testing & Validation
**Goal:** Ensure all features work correctly

#### 9.1 Test Areas
- [ ] Form submissions
- [ ] Data persistence
- [ ] Map interactions
- [ ] Service worker functionality
- [ ] Offline capabilities
- [ ] Settings management

## Breaking Changes to Address

### Removed Angular Material APIs
The following APIs used by deprecated packages need alternatives:

1. **DateTime Picker**
   - Use native `MatDatepicker` with time input
   - Create custom time picker component if needed

2. **Color Picker**
   - Use native HTML `<input type="color">`
   - Or use alternative library (ngx-colors)
   - Or create custom color picker

### Template Syntax Changes
- `[formGroup]` only works on `<form>` elements
- New control flow syntax is required
- Router directives need imports

## Implementation Order

1. ✓ **Remove incompatible packages** (Phase 1.1)
2. **Fix immediate errors** (Add missing imports)
3. **Convert to standalone** (Phase 2)
4. **Update control flow** (Phase 4) - Can be done during conversion
5. **Modernize DI** (Phase 5) - Can be done during conversion
6. **Implement signals** (Phase 3) - Iterative process
7. **Update forms** (Phase 6) - After signals are in place
8. **Update routing** (Phase 8)
9. **Test thoroughly** (Phase 9)

## Estimated Timeline
- **Phase 1:** 1-2 hours (removing packages, fixing imports)
- **Phase 2:** 4-6 hours (standalone conversion)
- **Phase 3:** 6-8 hours (signal implementation)
- **Phase 4:** 2-3 hours (control flow updates)
- **Phase 5:** 3-4 hours (DI modernization)
- **Phase 6:** 4-5 hours (form updates)
- **Phase 7:** 3-4 hours (component modernization)
- **Phase 8:** 2-3 hours (routing updates)
- **Phase 9:** 3-4 hours (testing)

**Total:** ~30-40 hours of development time

## Notes
- This is a significant refactoring that touches most files
- Each phase should be tested before moving to the next
- Some phases can be done incrementally
- Git commits should be made after each successful phase
- Consider feature branches for major changes

## Resources
- [Angular Signals Guide](https://angular.dev/guide/signals)
- [Standalone Components](https://angular.dev/guide/components/importing)
- [Built-in Control Flow](https://angular.dev/guide/templates/control-flow)
- [Modern Dependency Injection](https://angular.dev/guide/di/dependency-injection)
