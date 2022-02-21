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
                            <a href="license.html"  data-type="chapter-link">
                                <span class="icon ion-ios-paper"></span>LICENSE
                            </a>
                        </li>
                                <li class="link">
                                    <a href="dependencies.html" data-type="chapter-link">
                                        <span class="icon ion-ios-list"></span>Dependencies
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
                                            'data-target="#components-links-module-AppModule-2c371f31fed7c1f1c488e58fa49c826f8e50f07b164b1df665de300d785d4c22332e7e82c5c5a3a5d8a4a9f68d5b4afeb3e49e68dbdf667aa7f774e78b713fb0"' : 'data-target="#xs-components-links-module-AppModule-2c371f31fed7c1f1c488e58fa49c826f8e50f07b164b1df665de300d785d4c22332e7e82c5c5a3a5d8a4a9f68d5b4afeb3e49e68dbdf667aa7f774e78b713fb0"' }>
                                            <span class="icon ion-md-cog"></span>
                                            <span>Components</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="components-links-module-AppModule-2c371f31fed7c1f1c488e58fa49c826f8e50f07b164b1df665de300d785d4c22332e7e82c5c5a3a5d8a4a9f68d5b4afeb3e49e68dbdf667aa7f774e78b713fb0"' :
                                            'id="xs-components-links-module-AppModule-2c371f31fed7c1f1c488e58fa49c826f8e50f07b164b1df665de300d785d4c22332e7e82c5c5a3a5d8a4a9f68d5b4afeb3e49e68dbdf667aa7f774e78b713fb0"' }>
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
                                                <a href="components/GmapComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >GmapComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/LmapComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >LmapComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/LogComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >LogComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/MoodEditor.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >MoodEditor</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/MoodRenderer.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >MoodRenderer</a>
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
                                                <a href="components/X404Component.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >X404Component</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-toggle="collapse" ${ isNormalMode ?
                                        'data-target="#injectables-links-module-AppModule-2c371f31fed7c1f1c488e58fa49c826f8e50f07b164b1df665de300d785d4c22332e7e82c5c5a3a5d8a4a9f68d5b4afeb3e49e68dbdf667aa7f774e78b713fb0"' : 'data-target="#xs-injectables-links-module-AppModule-2c371f31fed7c1f1c488e58fa49c826f8e50f07b164b1df665de300d785d4c22332e7e82c5c5a3a5d8a4a9f68d5b4afeb3e49e68dbdf667aa7f774e78b713fb0"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-AppModule-2c371f31fed7c1f1c488e58fa49c826f8e50f07b164b1df665de300d785d4c22332e7e82c5c5a3a5d8a4a9f68d5b4afeb3e49e68dbdf667aa7f774e78b713fb0"' :
                                        'id="xs-injectables-links-module-AppModule-2c371f31fed7c1f1c488e58fa49c826f8e50f07b164b1df665de300d785d4c22332e7e82c5c5a3a5d8a4a9f68d5b4afeb3e49e68dbdf667aa7f774e78b713fb0"' }>
                                        <li class="link">
                                            <a href="injectables/FieldReportService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >FieldReportService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/MarkerService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >MarkerService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/PopupService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >PopupService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/RangerService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >RangerService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/SettingsService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >SettingsService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/ShapeService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >ShapeService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/TeamService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >TeamService</a>
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
                                            'data-target="#components-links-module-LazyModule-25ecc85deba7deba4e925ecda91b10542030cdfef248060313529d983f3d750a887a1cc79a76e840a444c74020d26b224d86be1698ae2b3b5d7cfeca731caec8"' : 'data-target="#xs-components-links-module-LazyModule-25ecc85deba7deba4e925ecda91b10542030cdfef248060313529d983f3d750a887a1cc79a76e840a444c74020d26b224d86be1698ae2b3b5d7cfeca731caec8"' }>
                                            <span class="icon ion-md-cog"></span>
                                            <span>Components</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="components-links-module-LazyModule-25ecc85deba7deba4e925ecda91b10542030cdfef248060313529d983f3d750a887a1cc79a76e840a444c74020d26b224d86be1698ae2b3b5d7cfeca731caec8"' :
                                            'id="xs-components-links-module-LazyModule-25ecc85deba7deba4e925ecda91b10542030cdfef248060313529d983f3d750a887a1cc79a76e840a444c74020d26b224d86be1698ae2b3b5d7cfeca731caec8"' }>
                                            <li class="link">
                                                <a href="components/AboutComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AboutComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/LazyComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >LazyComponent</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-toggle="collapse" ${ isNormalMode ?
                                        'data-target="#injectables-links-module-LazyModule-25ecc85deba7deba4e925ecda91b10542030cdfef248060313529d983f3d750a887a1cc79a76e840a444c74020d26b224d86be1698ae2b3b5d7cfeca731caec8"' : 'data-target="#xs-injectables-links-module-LazyModule-25ecc85deba7deba4e925ecda91b10542030cdfef248060313529d983f3d750a887a1cc79a76e840a444c74020d26b224d86be1698ae2b3b5d7cfeca731caec8"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-LazyModule-25ecc85deba7deba4e925ecda91b10542030cdfef248060313529d983f3d750a887a1cc79a76e840a444c74020d26b224d86be1698ae2b3b5d7cfeca731caec8"' :
                                        'id="xs-injectables-links-module-LazyModule-25ecc85deba7deba4e925ecda91b10542030cdfef248060313529d983f3d750a887a1cc79a76e840a444c74020d26b224d86be1698ae2b3b5d7cfeca731caec8"' }>
                                        <li class="link">
                                            <a href="injectables/ThreeWordsService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >ThreeWordsService</a>
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
                                <a href="components/IconComponent.html" data-type="entity-link" >IconComponent</a>
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
                                <a href="classes/AngularComponentOrService.html" data-type="entity-link" >AngularComponentOrService</a>
                            </li>
                            <li class="link">
                                <a href="classes/CodeArea.html" data-type="entity-link" >CodeArea</a>
                            </li>
                            <li class="link">
                                <a href="classes/Coord.html" data-type="entity-link" >Coord</a>
                            </li>
                            <li class="link">
                                <a href="classes/Coordinate.html" data-type="entity-link" >Coordinate</a>
                            </li>
                            <li class="link">
                                <a href="classes/csvImport.html" data-type="entity-link" >csvImport</a>
                            </li>
                            <li class="link">
                                <a href="classes/GoogleGeocode.html" data-type="entity-link" >GoogleGeocode</a>
                            </li>
                            <li class="link">
                                <a href="classes/Map.html" data-type="entity-link" >Map</a>
                            </li>
                            <li class="link">
                                <a href="classes/Mission.html" data-type="entity-link" >Mission</a>
                            </li>
                            <li class="link">
                                <a href="classes/OpenLocationCode.html" data-type="entity-link" >OpenLocationCode</a>
                            </li>
                            <li class="link">
                                <a href="classes/OpPeriod.html" data-type="entity-link" >OpPeriod</a>
                            </li>
                            <li class="link">
                                <a href="classes/PlusCode.html" data-type="entity-link" >PlusCode</a>
                            </li>
                            <li class="link">
                                <a href="classes/Point.html" data-type="entity-link" >Point</a>
                            </li>
                            <li class="link">
                                <a href="classes/Point-1.html" data-type="entity-link" >Point</a>
                            </li>
                            <li class="link">
                                <a href="classes/StreetAddress.html" data-type="entity-link" >StreetAddress</a>
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
                                    <a href="injectables/DataService.html" data-type="entity-link" >DataService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/FieldReportService.html" data-type="entity-link" >FieldReportService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/LocalStorageService.html" data-type="entity-link" >LocalStorageService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/MarkerService.html" data-type="entity-link" >MarkerService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/PopupService.html" data-type="entity-link" >PopupService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/PostService.html" data-type="entity-link" >PostService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/RangerService.html" data-type="entity-link" >RangerService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/SettingsService.html" data-type="entity-link" >SettingsService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/ShapeService.html" data-type="entity-link" >ShapeService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/TeamService.html" data-type="entity-link" >TeamService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/ThreeWordsService.html" data-type="entity-link" >ThreeWordsService</a>
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
                                <a href="interfaces/RangerType.html" data-type="entity-link" >RangerType</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/TeamType.html" data-type="entity-link" >TeamType</a>
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