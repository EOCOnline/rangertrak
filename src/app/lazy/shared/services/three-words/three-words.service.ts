import { Injectable } from '@angular/core'

@Injectable()
// {providedIn: 'root'} ) implies application-level singleton service. This registers service in Root Module Injector
// of the Module Injector tree - thus available to entire application - whether eager or lazy loaded. If never used, it will be tree shaken out of final build)
// Registering service in a @NgModule makes it available in that Module only (Singleton within the Module Scope) Using both makes it singleton for the rest of
// application, while it creates a separate instance for the Module.   - https://www.tektutorialshub.com/angular/providedin-root-any-platform-in-angular/
// Use ProvidedIn: any when you want every lazy-loaded module to get its own instance of the service. eagerly loaded modules always share the instance provided by the Root Module Injector

export class ThreeWordsService {

  //constructor() { }

  get3Words() {
    return "///verse.moving.miles"
  }
}
