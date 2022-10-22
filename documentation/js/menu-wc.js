'use strict';

customElements.define('compodoc-menu', class extends HTMLElement {
    constructor() {
        super();
        this.isNormalMode = this.getAttribute('mode') === 'normal';
    }

    connectedCallback() {
        this.render(this.isNormalMode);
    }

    render(isNormalMode) {
        let tp = lithtml.html(`
        <nav>
            <ul class="list">
                <li class="title">
                    <a href="index.html" data-type="index-link">rangertrak documentation</a>
                </li>

                <li class="divider"></li>
                ${ isNormalMode ? `<div id="book-search-input" role="search"><input type="text" placeholder="Type to search"></div>` : '' }
                <li class="chapter">
                    <a data-type="chapter-link" href="index.html"><span class="icon ion-ios-home"></span>Getting started</a>
                    <ul class="links">
                        <li class="link">
                            <a href="overview.html" data-type="chapter-link">
                                <span class="icon ion-ios-keypad"></span>Overview
                            </a>
                        </li>
                        <li class="link">
                            <a href="index.html" data-type="chapter-link">
                                <span class="icon ion-ios-paper"></span>README
                            </a>
                        </li>
                        <li class="link">
                            <a href="changelog.html"  data-type="chapter-link">
                                <span class="icon ion-ios-paper"></span>CHANGELOG
                            </a>
                        </li>
                        <li class="link">
                            <a href="contributing.html"  data-type="chapter-link">
                                <span class="icon ion-ios-paper"></span>CONTRIBUTING
                            </a>
                        </li>
                        <li class="link">
                            <a href="license.html"  data-type="chapter-link">
                                <span class="icon ion-ios-paper"></span>LICENSE
                            </a>
                        </li>
                                <li class="link">
                                    <a href="dependencies.html" data-type="chapter-link">
                                        <span class="icon ion-ios-list"></span>Dependencies
                                    </a>
                                </li>
                                <li class="link">
                                    <a href="properties.html" data-type="chapter-link">
                                        <span class="icon ion-ios-apps"></span>Properties
                                    </a>
                                </li>
                    </ul>
                </li>
                    <li class="chapter modules">
                        <a data-type="chapter-link" href="modules.html">
                            <div class="menu-toggler linked" data-toggle="collapse" ${ isNormalMode ?
                                'data-target="#modules-links"' : 'data-target="#xs-modules-links"' }>
                                <span class="icon ion-ios-archive"></span>
                                <span class="link-name">Modules</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                        </a>
                        <ul class="links collapse " ${ isNormalMode ? 'id="modules-links"' : 'id="xs-modules-links"' }>
                            <li class="link">
                                <a href="modules/AppModule.html" data-type="entity-link" >AppModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-toggle="collapse" ${ isNormalMode ?
                                            'data-target="#components-links-module-AppModule-2f0f0a830ed93df73e20e4243d394cf439b1ed036cfc4c7b0b8f2bd6cc3913b49b8240573cff112c55ea562422116ff2cf70c8428812d3644ed0688244fedd3a"' : 'data-target="#xs-components-links-module-AppModule-2f0f0a830ed93df73e20e4243d394cf439b1ed036cfc4c7b0b8f2bd6cc3913b49b8240573cff112c55ea562422116ff2cf70c8428812d3644ed0688244fedd3a"' }>
                                            <span class="icon ion-md-cog"></span>
                                            <span>Components</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="components-links-module-AppModule-2f0f0a830ed93df73e20e4243d394cf439b1ed036cfc4c7b0b8f2bd6cc3913b49b8240573cff112c55ea562422116ff2cf70c8428812d3644ed0688244fedd3a"' :
                                            'id="xs-components-links-module-AppModule-2f0f0a830ed93df73e20e4243d394cf439b1ed036cfc4c7b0b8f2bd6cc3913b49b8240573cff112c55ea562422116ff2cf70c8428812d3644ed0688244fedd3a"' }>
                                            <li class="link">
                                                <a href="components/AlertsComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AlertsComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/AppComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AppComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/ColorEditor.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >ColorEditor</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/EntryComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >EntryComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/FieldReportsComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >FieldReportsComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/FooterComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >FooterComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/HeaderComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >HeaderComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/IconsComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >IconsComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/LmapComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >LmapComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/LocationComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >LocationComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/LogComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >LogComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/MiniGMapComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >MiniGMapComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/MiniLMapComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >MiniLMapComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/NavbarComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >NavbarComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/RangersComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >RangersComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/SettingsComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >SettingsComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/TimePickerComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >TimePickerComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/X404Component.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >X404Component</a>
                                            </li>
                                        </ul>
                                    </li>
                            </li>
                            <li class="link">
                                <a href="modules/AppRoutingModule.html" data-type="entity-link" >AppRoutingModule</a>
                            </li>
                            <li class="link">
                                <a href="modules/LazyModule.html" data-type="entity-link" >LazyModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-toggle="collapse" ${ isNormalMode ?
                                            'data-target="#components-links-module-LazyModule-c7a20586549c26d7536c2bd0e3bda945d50e86c4605fc38d47da49fb82f00674f823cb2790af8bb8d66eb2703a50df62e063cff9a4aa8639b512ed40e544e029"' : 'data-target="#xs-components-links-module-LazyModule-c7a20586549c26d7536c2bd0e3bda945d50e86c4605fc38d47da49fb82f00674f823cb2790af8bb8d66eb2703a50df62e063cff9a4aa8639b512ed40e544e029"' }>
                                            <span class="icon ion-md-cog"></span>
                                            <span>Components</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="components-links-module-LazyModule-c7a20586549c26d7536c2bd0e3bda945d50e86c4605fc38d47da49fb82f00674f823cb2790af8bb8d66eb2703a50df62e063cff9a4aa8639b512ed40e544e029"' :
                                            'id="xs-components-links-module-LazyModule-c7a20586549c26d7536c2bd0e3bda945d50e86c4605fc38d47da49fb82f00674f823cb2790af8bb8d66eb2703a50df62e063cff9a4aa8639b512ed40e544e029"' }>
                                            <li class="link">
                                                <a href="components/AboutComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AboutComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/LazyComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >LazyComponent</a>
                                            </li>
                                        </ul>
                                    </li>
                            </li>
                            <li class="link">
                                <a href="modules/LazyRoutingModule.html" data-type="entity-link" >LazyRoutingModule</a>
                            </li>
                            <li class="link">
                                <a href="modules/MaterialModule.html" data-type="entity-link" >MaterialModule</a>
                            </li>
                </ul>
                </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-toggle="collapse" ${ isNormalMode ? 'data-target="#components-links"' :
                            'data-target="#xs-components-links"' }>
                            <span class="icon ion-md-cog"></span>
                            <span>Components</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="components-links"' : 'id="xs-components-links"' }>
                            <li class="link">
                                <a href="components/AbstractMap.html" data-type="entity-link" >AbstractMap</a>
                            </li>
                            <li class="link">
                                <a href="components/HeaderComponent.html" data-type="entity-link" >HeaderComponent</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-toggle="collapse" ${ isNormalMode ? 'data-target="#classes-links"' :
                            'data-target="#xs-classes-links"' }>
                            <span class="icon ion-ios-paper"></span>
                            <span>Classes</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="classes-links"' : 'id="xs-classes-links"' }>
                            <li class="link">
                                <a href="classes/CodeArea.html" data-type="entity-link" >CodeArea</a>
                            </li>
                            <li class="link">
                                <a href="classes/Coord_Unused.html" data-type="entity-link" >Coord_Unused</a>
                            </li>
                            <li class="link">
                                <a href="classes/Coordinate_Unused.html" data-type="entity-link" >Coordinate_Unused</a>
                            </li>
                            <li class="link">
                                <a href="classes/csvImport.html" data-type="entity-link" >csvImport</a>
                            </li>
                            <li class="link">
                                <a href="classes/CustomTooltip.html" data-type="entity-link" >CustomTooltip</a>
                            </li>
                            <li class="link">
                                <a href="classes/GoogleGeocode.html" data-type="entity-link" >GoogleGeocode</a>
                            </li>
                            <li class="link">
                                <a href="classes/OpenLocationCode.html" data-type="entity-link" >OpenLocationCode</a>
                            </li>
                            <li class="link">
                                <a href="classes/PlusCode.html" data-type="entity-link" >PlusCode</a>
                            </li>
                            <li class="link">
                                <a href="classes/PointSample.html" data-type="entity-link" >PointSample</a>
                            </li>
                            <li class="link">
                                <a href="classes/Utility.html" data-type="entity-link" >Utility</a>
                            </li>
                            <li class="link">
                                <a href="classes/What3Words.html" data-type="entity-link" >What3Words</a>
                            </li>
                        </ul>
                    </li>
                        <li class="chapter">
                            <div class="simple menu-toggler" data-toggle="collapse" ${ isNormalMode ? 'data-target="#injectables-links"' :
                                'data-target="#xs-injectables-links"' }>
                                <span class="icon ion-md-arrow-round-down"></span>
                                <span>Injectables</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                            <ul class="links collapse " ${ isNormalMode ? 'id="injectables-links"' : 'id="xs-injectables-links"' }>
                                <li class="link">
                                    <a href="injectables/ClockService.html" data-type="entity-link" >ClockService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/FieldReportService.html" data-type="entity-link" >FieldReportService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/InstallableService.html" data-type="entity-link" >InstallableService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/LogService.html" data-type="entity-link" >LogService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/MarkerService.html" data-type="entity-link" >MarkerService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/PopupService.html" data-type="entity-link" >PopupService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/RangerService.html" data-type="entity-link" >RangerService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/SettingsService.html" data-type="entity-link" >SettingsService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/ThreeWordsService.html" data-type="entity-link" >ThreeWordsService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/UpdateService.html" data-type="entity-link" >UpdateService</a>
                                </li>
                            </ul>
                        </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-toggle="collapse" ${ isNormalMode ? 'data-target="#guards-links"' :
                            'data-target="#xs-guards-links"' }>
                            <span class="icon ion-ios-lock"></span>
                            <span>Guards</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="guards-links"' : 'id="xs-guards-links"' }>
                            <li class="link">
                                <a href="guards/UnsavedChangesGuard.html" data-type="entity-link" >UnsavedChangesGuard</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-toggle="collapse" ${ isNormalMode ? 'data-target="#interfaces-links"' :
                            'data-target="#xs-interfaces-links"' }>
                            <span class="icon ion-md-information-circle-outline"></span>
                            <span>Interfaces</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? ' id="interfaces-links"' : 'id="xs-interfaces-links"' }>
                            <li class="link">
                                <a href="interfaces/LayerType.html" data-type="entity-link" >LayerType</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/LocationType.html" data-type="entity-link" >LocationType</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/RangerType.html" data-type="entity-link" >RangerType</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/What3wordsAddress33.html" data-type="entity-link" >What3wordsAddress33</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/What3wordsAutosuggest33.html" data-type="entity-link" >What3wordsAutosuggest33</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/What3wordsSymbol33.html" data-type="entity-link" >What3wordsSymbol33</a>
                            </li>
                        </ul>
                    </li>
                        <li class="chapter">
                            <div class="simple menu-toggler" data-toggle="collapse" ${ isNormalMode ? 'data-target="#pipes-links"' :
                                'data-target="#xs-pipes-links"' }>
                                <span class="icon ion-md-add"></span>
                                <span>Pipes</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                            <ul class="links collapse " ${ isNormalMode ? 'id="pipes-links"' : 'id="xs-pipes-links"' }>
                                <li class="link">
                                    <a href="pipes/myUnusedPipe.html" data-type="entity-link" >myUnusedPipe</a>
                                </li>
                            </ul>
                        </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-toggle="collapse" ${ isNormalMode ? 'data-target="#miscellaneous-links"'
                            : 'data-target="#xs-miscellaneous-links"' }>
                            <span class="icon ion-ios-cube"></span>
                            <span>Miscellaneous</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="miscellaneous-links"' : 'id="xs-miscellaneous-links"' }>
                            <li class="link">
                                <a href="miscellaneous/enumerations.html" data-type="entity-link">Enums</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/functions.html" data-type="entity-link">Functions</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/typealiases.html" data-type="entity-link">Type aliases</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/variables.html" data-type="entity-link">Variables</a>
                            </li>
                        </ul>
                    </li>
                        <li class="chapter">
                            <a data-type="chapter-link" href="routes.html"><span class="icon ion-ios-git-branch"></span>Routes</a>
                        </li>
                    <li class="chapter">
                        <a data-type="chapter-link" href="coverage.html"><span class="icon ion-ios-stats"></span>Documentation coverage</a>
                    </li>
                    <li class="divider"></li>
                    <li class="copyright">
                        Documentation generated using <a href="https://compodoc.app/" target="_blank">
                            <img data-src="images/compodoc-vectorise.png" class="img-responsive" data-type="compodoc-logo">
                        </a>
                    </li>
            </ul>
        </nav>
        `);
        this.innerHTML = tp.strings;
    }
});