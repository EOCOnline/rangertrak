'use strict';

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _wrapNativeSuper(Class) { var _cache = typeof Map === "function" ? new Map() : undefined; _wrapNativeSuper = function _wrapNativeSuper(Class) { if (Class === null || !_isNativeFunction(Class)) return Class; if (typeof Class !== "function") { throw new TypeError("Super expression must either be null or a function"); } if (typeof _cache !== "undefined") { if (_cache.has(Class)) return _cache.get(Class); _cache.set(Class, Wrapper); } function Wrapper() { return _construct(Class, arguments, _getPrototypeOf(this).constructor); } Wrapper.prototype = Object.create(Class.prototype, { constructor: { value: Wrapper, enumerable: false, writable: true, configurable: true } }); return _setPrototypeOf(Wrapper, Class); }; return _wrapNativeSuper(Class); }

function _construct(Parent, args, Class) { if (_isNativeReflectConstruct()) { _construct = Reflect.construct.bind(); } else { _construct = function _construct(Parent, args, Class) { var a = [null]; a.push.apply(a, args); var Constructor = Function.bind.apply(Parent, a); var instance = new Constructor(); if (Class) _setPrototypeOf(instance, Class.prototype); return instance; }; } return _construct.apply(null, arguments); }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

function _isNativeFunction(fn) { return Function.toString.call(fn).indexOf("[native code]") !== -1; }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

customElements.define('compodoc-menu', /*#__PURE__*/function (_HTMLElement) {
  _inherits(_class, _HTMLElement);

  var _super = _createSuper(_class);

  function _class() {
    var _this;

    _classCallCheck(this, _class);

    _this = _super.call(this);
    _this.isNormalMode = _this.getAttribute('mode') === 'normal';
    return _this;
  }

  _createClass(_class, [{
    key: "connectedCallback",
    value: function connectedCallback() {
      this.render(this.isNormalMode);
    }
  }, {
    key: "render",
    value: function render(isNormalMode) {
      var tp = lithtml.html("\n        <nav>\n            <ul class=\"list\">\n                <li class=\"title\">\n                    <a href=\"index.html\" data-type=\"index-link\">rangertrak documentation</a>\n                </li>\n\n                <li class=\"divider\"></li>\n                ".concat(isNormalMode ? "<div id=\"book-search-input\" role=\"search\"><input type=\"text\" placeholder=\"Type to search\"></div>" : '', "\n                <li class=\"chapter\">\n                    <a data-type=\"chapter-link\" href=\"index.html\"><span class=\"icon ion-ios-home\"></span>Getting started</a>\n                    <ul class=\"links\">\n                        <li class=\"link\">\n                            <a href=\"overview.html\" data-type=\"chapter-link\">\n                                <span class=\"icon ion-ios-keypad\"></span>Overview\n                            </a>\n                        </li>\n                        <li class=\"link\">\n                            <a href=\"index.html\" data-type=\"chapter-link\">\n                                <span class=\"icon ion-ios-paper\"></span>README\n                            </a>\n                        </li>\n                        <li class=\"link\">\n                            <a href=\"changelog.html\"  data-type=\"chapter-link\">\n                                <span class=\"icon ion-ios-paper\"></span>CHANGELOG\n                            </a>\n                        </li>\n                        <li class=\"link\">\n                            <a href=\"license.html\"  data-type=\"chapter-link\">\n                                <span class=\"icon ion-ios-paper\"></span>LICENSE\n                            </a>\n                        </li>\n                                <li class=\"link\">\n                                    <a href=\"dependencies.html\" data-type=\"chapter-link\">\n                                        <span class=\"icon ion-ios-list\"></span>Dependencies\n                                    </a>\n                                </li>\n                                <li class=\"link\">\n                                    <a href=\"properties.html\" data-type=\"chapter-link\">\n                                        <span class=\"icon ion-ios-apps\"></span>Properties\n                                    </a>\n                                </li>\n                    </ul>\n                </li>\n                    <li class=\"chapter modules\">\n                        <a data-type=\"chapter-link\" href=\"modules.html\">\n                            <div class=\"menu-toggler linked\" data-toggle=\"collapse\" ").concat(isNormalMode ? 'data-target="#modules-links"' : 'data-target="#xs-modules-links"', ">\n                                <span class=\"icon ion-ios-archive\"></span>\n                                <span class=\"link-name\">Modules</span>\n                                <span class=\"icon ion-ios-arrow-down\"></span>\n                            </div>\n                        </a>\n                        <ul class=\"links collapse \" ").concat(isNormalMode ? 'id="modules-links"' : 'id="xs-modules-links"', ">\n                            <li class=\"link\">\n                                <a href=\"modules/AppModule.html\" data-type=\"entity-link\" >AppModule</a>\n                                    <li class=\"chapter inner\">\n                                        <div class=\"simple menu-toggler\" data-toggle=\"collapse\" ").concat(isNormalMode ? 'data-target="#components-links-module-AppModule-de16871320f499d418958dc19cff92b5b758b8244ca7a7e237d29ff2d980fa43196562c6d4c3494c3a90eacf1d60a27e985f50f1d5dfb22b4d8c2d7510f158d0"' : 'data-target="#xs-components-links-module-AppModule-de16871320f499d418958dc19cff92b5b758b8244ca7a7e237d29ff2d980fa43196562c6d4c3494c3a90eacf1d60a27e985f50f1d5dfb22b4d8c2d7510f158d0"', ">\n                                            <span class=\"icon ion-md-cog\"></span>\n                                            <span>Components</span>\n                                            <span class=\"icon ion-ios-arrow-down\"></span>\n                                        </div>\n                                        <ul class=\"links collapse\" ").concat(isNormalMode ? 'id="components-links-module-AppModule-de16871320f499d418958dc19cff92b5b758b8244ca7a7e237d29ff2d980fa43196562c6d4c3494c3a90eacf1d60a27e985f50f1d5dfb22b4d8c2d7510f158d0"' : 'id="xs-components-links-module-AppModule-de16871320f499d418958dc19cff92b5b758b8244ca7a7e237d29ff2d980fa43196562c6d4c3494c3a90eacf1d60a27e985f50f1d5dfb22b4d8c2d7510f158d0"', ">\n                                            <li class=\"link\">\n                                                <a href=\"components/AlertsComponent.html\" data-type=\"entity-link\" data-context=\"sub-entity\" data-context-id=\"modules\" >AlertsComponent</a>\n                                            </li>\n                                            <li class=\"link\">\n                                                <a href=\"components/AppComponent-1.html\" data-type=\"entity-link\" data-context=\"sub-entity\" data-context-id=\"modules\" >AppComponent</a>\n                                            </li>\n                                            <li class=\"link\">\n                                                <a href=\"components/AppComponent.html\" data-type=\"entity-link\" data-context=\"sub-entity\" data-context-id=\"modules\" >AppComponent</a>\n                                            </li>\n                                            <li class=\"link\">\n                                                <a href=\"components/ColorEditor.html\" data-type=\"entity-link\" data-context=\"sub-entity\" data-context-id=\"modules\" >ColorEditor</a>\n                                            </li>\n                                            <li class=\"link\">\n                                                <a href=\"components/EntryComponent.html\" data-type=\"entity-link\" data-context=\"sub-entity\" data-context-id=\"modules\" >EntryComponent</a>\n                                            </li>\n                                            <li class=\"link\">\n                                                <a href=\"components/FieldReportsComponent.html\" data-type=\"entity-link\" data-context=\"sub-entity\" data-context-id=\"modules\" >FieldReportsComponent</a>\n                                            </li>\n                                            <li class=\"link\">\n                                                <a href=\"components/FooterComponent.html\" data-type=\"entity-link\" data-context=\"sub-entity\" data-context-id=\"modules\" >FooterComponent</a>\n                                            </li>\n                                            <li class=\"link\">\n                                                <a href=\"components/HeaderComponent.html\" data-type=\"entity-link\" data-context=\"sub-entity\" data-context-id=\"modules\" >HeaderComponent</a>\n                                            </li>\n                                            <li class=\"link\">\n                                                <a href=\"components/IconsComponent.html\" data-type=\"entity-link\" data-context=\"sub-entity\" data-context-id=\"modules\" >IconsComponent</a>\n                                            </li>\n                                            <li class=\"link\">\n                                                <a href=\"components/LmapComponent.html\" data-type=\"entity-link\" data-context=\"sub-entity\" data-context-id=\"modules\" >LmapComponent</a>\n                                            </li>\n                                            <li class=\"link\">\n                                                <a href=\"components/LocationComponent.html\" data-type=\"entity-link\" data-context=\"sub-entity\" data-context-id=\"modules\" >LocationComponent</a>\n                                            </li>\n                                            <li class=\"link\">\n                                                <a href=\"components/LogComponent.html\" data-type=\"entity-link\" data-context=\"sub-entity\" data-context-id=\"modules\" >LogComponent</a>\n                                            </li>\n                                            <li class=\"link\">\n                                                <a href=\"components/MiniGMapComponent.html\" data-type=\"entity-link\" data-context=\"sub-entity\" data-context-id=\"modules\" >MiniGMapComponent</a>\n                                            </li>\n                                            <li class=\"link\">\n                                                <a href=\"components/MiniLMapComponent.html\" data-type=\"entity-link\" data-context=\"sub-entity\" data-context-id=\"modules\" >MiniLMapComponent</a>\n                                            </li>\n                                            <li class=\"link\">\n                                                <a href=\"components/MoodEditor.html\" data-type=\"entity-link\" data-context=\"sub-entity\" data-context-id=\"modules\" >MoodEditor</a>\n                                            </li>\n                                            <li class=\"link\">\n                                                <a href=\"components/MoodRenderer.html\" data-type=\"entity-link\" data-context=\"sub-entity\" data-context-id=\"modules\" >MoodRenderer</a>\n                                            </li>\n                                            <li class=\"link\">\n                                                <a href=\"components/NavbarComponent.html\" data-type=\"entity-link\" data-context=\"sub-entity\" data-context-id=\"modules\" >NavbarComponent</a>\n                                            </li>\n                                            <li class=\"link\">\n                                                <a href=\"components/RangersComponent.html\" data-type=\"entity-link\" data-context=\"sub-entity\" data-context-id=\"modules\" >RangersComponent</a>\n                                            </li>\n                                            <li class=\"link\">\n                                                <a href=\"components/SettingsComponent.html\" data-type=\"entity-link\" data-context=\"sub-entity\" data-context-id=\"modules\" >SettingsComponent</a>\n                                            </li>\n                                            <li class=\"link\">\n                                                <a href=\"components/TimePickerComponent.html\" data-type=\"entity-link\" data-context=\"sub-entity\" data-context-id=\"modules\" >TimePickerComponent</a>\n                                            </li>\n                                            <li class=\"link\">\n                                                <a href=\"components/X404Component.html\" data-type=\"entity-link\" data-context=\"sub-entity\" data-context-id=\"modules\" >X404Component</a>\n                                            </li>\n                                        </ul>\n                                    </li>\n                            </li>\n                            <li class=\"link\">\n                                <a href=\"modules/AppRoutingModule.html\" data-type=\"entity-link\" >AppRoutingModule</a>\n                            </li>\n                            <li class=\"link\">\n                                <a href=\"modules/LazyModule.html\" data-type=\"entity-link\" >LazyModule</a>\n                                    <li class=\"chapter inner\">\n                                        <div class=\"simple menu-toggler\" data-toggle=\"collapse\" ").concat(isNormalMode ? 'data-target="#components-links-module-LazyModule-c7a20586549c26d7536c2bd0e3bda945d50e86c4605fc38d47da49fb82f00674f823cb2790af8bb8d66eb2703a50df62e063cff9a4aa8639b512ed40e544e029"' : 'data-target="#xs-components-links-module-LazyModule-c7a20586549c26d7536c2bd0e3bda945d50e86c4605fc38d47da49fb82f00674f823cb2790af8bb8d66eb2703a50df62e063cff9a4aa8639b512ed40e544e029"', ">\n                                            <span class=\"icon ion-md-cog\"></span>\n                                            <span>Components</span>\n                                            <span class=\"icon ion-ios-arrow-down\"></span>\n                                        </div>\n                                        <ul class=\"links collapse\" ").concat(isNormalMode ? 'id="components-links-module-LazyModule-c7a20586549c26d7536c2bd0e3bda945d50e86c4605fc38d47da49fb82f00674f823cb2790af8bb8d66eb2703a50df62e063cff9a4aa8639b512ed40e544e029"' : 'id="xs-components-links-module-LazyModule-c7a20586549c26d7536c2bd0e3bda945d50e86c4605fc38d47da49fb82f00674f823cb2790af8bb8d66eb2703a50df62e063cff9a4aa8639b512ed40e544e029"', ">\n                                            <li class=\"link\">\n                                                <a href=\"components/AboutComponent.html\" data-type=\"entity-link\" data-context=\"sub-entity\" data-context-id=\"modules\" >AboutComponent</a>\n                                            </li>\n                                            <li class=\"link\">\n                                                <a href=\"components/LazyComponent.html\" data-type=\"entity-link\" data-context=\"sub-entity\" data-context-id=\"modules\" >LazyComponent</a>\n                                            </li>\n                                        </ul>\n                                    </li>\n                            </li>\n                            <li class=\"link\">\n                                <a href=\"modules/LazyRoutingModule.html\" data-type=\"entity-link\" >LazyRoutingModule</a>\n                            </li>\n                            <li class=\"link\">\n                                <a href=\"modules/MaterialModule.html\" data-type=\"entity-link\" >MaterialModule</a>\n                            </li>\n                </ul>\n                </li>\n                    <li class=\"chapter\">\n                        <div class=\"simple menu-toggler\" data-toggle=\"collapse\" ").concat(isNormalMode ? 'data-target="#components-links"' : 'data-target="#xs-components-links"', ">\n                            <span class=\"icon ion-md-cog\"></span>\n                            <span>Components</span>\n                            <span class=\"icon ion-ios-arrow-down\"></span>\n                        </div>\n                        <ul class=\"links collapse \" ").concat(isNormalMode ? 'id="components-links"' : 'id="xs-components-links"', ">\n                            <li class=\"link\">\n                                <a href=\"components/AbstractMap.html\" data-type=\"entity-link\" >AbstractMap</a>\n                            </li>\n                            <li class=\"link\">\n                                <a href=\"components/AppComponent.html\" data-type=\"entity-link\" >AppComponent</a>\n                            </li>\n                            <li class=\"link\">\n                                <a href=\"components/AppComponent-2.html\" data-type=\"entity-link\" >AppComponent</a>\n                            </li>\n                            <li class=\"link\">\n                                <a href=\"components/AppComponent-3.html\" data-type=\"entity-link\" >AppComponent</a>\n                            </li>\n                            <li class=\"link\">\n                                <a href=\"components/HeaderComponent.html\" data-type=\"entity-link\" >HeaderComponent</a>\n                            </li>\n                            <li class=\"link\">\n                                <a href=\"components/OrderComponent.html\" data-type=\"entity-link\" >OrderComponent</a>\n                            </li>\n                            <li class=\"link\">\n                                <a href=\"components/PriceQuoterComponent.html\" data-type=\"entity-link\" >PriceQuoterComponent</a>\n                            </li>\n                            <li class=\"link\">\n                                <a href=\"components/SizerComponent.html\" data-type=\"entity-link\" >SizerComponent</a>\n                            </li>\n                            <li class=\"link\">\n                                <a href=\"components/SizerComponent-1.html\" data-type=\"entity-link\" >SizerComponent</a>\n                            </li>\n                        </ul>\n                    </li>\n                    <li class=\"chapter\">\n                        <div class=\"simple menu-toggler\" data-toggle=\"collapse\" ").concat(isNormalMode ? 'data-target="#classes-links"' : 'data-target="#xs-classes-links"', ">\n                            <span class=\"icon ion-ios-paper\"></span>\n                            <span>Classes</span>\n                            <span class=\"icon ion-ios-arrow-down\"></span>\n                        </div>\n                        <ul class=\"links collapse \" ").concat(isNormalMode ? 'id="classes-links"' : 'id="xs-classes-links"', ">\n                            <li class=\"link\">\n                                <a href=\"classes/CodeArea.html\" data-type=\"entity-link\" >CodeArea</a>\n                            </li>\n                            <li class=\"link\">\n                                <a href=\"classes/Coord_Unused.html\" data-type=\"entity-link\" >Coord_Unused</a>\n                            </li>\n                            <li class=\"link\">\n                                <a href=\"classes/Coordinate_Unused.html\" data-type=\"entity-link\" >Coordinate_Unused</a>\n                            </li>\n                            <li class=\"link\">\n                                <a href=\"classes/csvImport.html\" data-type=\"entity-link\" >csvImport</a>\n                            </li>\n                            <li class=\"link\">\n                                <a href=\"classes/CustomTooltip.html\" data-type=\"entity-link\" >CustomTooltip</a>\n                            </li>\n                            <li class=\"link\">\n                                <a href=\"classes/GoogleGeocode.html\" data-type=\"entity-link\" >GoogleGeocode</a>\n                            </li>\n                            <li class=\"link\">\n                                <a href=\"classes/OpenLocationCode.html\" data-type=\"entity-link\" >OpenLocationCode</a>\n                            </li>\n                            <li class=\"link\">\n                                <a href=\"classes/PlusCode.html\" data-type=\"entity-link\" >PlusCode</a>\n                            </li>\n                            <li class=\"link\">\n                                <a href=\"classes/PointSample.html\" data-type=\"entity-link\" >PointSample</a>\n                            </li>\n                            <li class=\"link\">\n                                <a href=\"classes/Utility.html\" data-type=\"entity-link\" >Utility</a>\n                            </li>\n                            <li class=\"link\">\n                                <a href=\"classes/What3Words.html\" data-type=\"entity-link\" >What3Words</a>\n                            </li>\n                        </ul>\n                    </li>\n                        <li class=\"chapter\">\n                            <div class=\"simple menu-toggler\" data-toggle=\"collapse\" ").concat(isNormalMode ? 'data-target="#injectables-links"' : 'data-target="#xs-injectables-links"', ">\n                                <span class=\"icon ion-md-arrow-round-down\"></span>\n                                <span>Injectables</span>\n                                <span class=\"icon ion-ios-arrow-down\"></span>\n                            </div>\n                            <ul class=\"links collapse \" ").concat(isNormalMode ? 'id="injectables-links"' : 'id="xs-injectables-links"', ">\n                                <li class=\"link\">\n                                    <a href=\"injectables/ClockService.html\" data-type=\"entity-link\" >ClockService</a>\n                                </li>\n                                <li class=\"link\">\n                                    <a href=\"injectables/FieldReportService.html\" data-type=\"entity-link\" >FieldReportService</a>\n                                </li>\n                                <li class=\"link\">\n                                    <a href=\"injectables/LogService.html\" data-type=\"entity-link\" >LogService</a>\n                                </li>\n                                <li class=\"link\">\n                                    <a href=\"injectables/MarkerService.html\" data-type=\"entity-link\" >MarkerService</a>\n                                </li>\n                                <li class=\"link\">\n                                    <a href=\"injectables/PopupService.html\" data-type=\"entity-link\" >PopupService</a>\n                                </li>\n                                <li class=\"link\">\n                                    <a href=\"injectables/RangerService.html\" data-type=\"entity-link\" >RangerService</a>\n                                </li>\n                                <li class=\"link\">\n                                    <a href=\"injectables/SettingsService.html\" data-type=\"entity-link\" >SettingsService</a>\n                                </li>\n                                <li class=\"link\">\n                                    <a href=\"injectables/ThreeWordsService.html\" data-type=\"entity-link\" >ThreeWordsService</a>\n                                </li>\n                            </ul>\n                        </li>\n                    <li class=\"chapter\">\n                        <div class=\"simple menu-toggler\" data-toggle=\"collapse\" ").concat(isNormalMode ? 'data-target="#guards-links"' : 'data-target="#xs-guards-links"', ">\n                            <span class=\"icon ion-ios-lock\"></span>\n                            <span>Guards</span>\n                            <span class=\"icon ion-ios-arrow-down\"></span>\n                        </div>\n                        <ul class=\"links collapse \" ").concat(isNormalMode ? 'id="guards-links"' : 'id="xs-guards-links"', ">\n                            <li class=\"link\">\n                                <a href=\"guards/UnsavedChangesGuard.html\" data-type=\"entity-link\" >UnsavedChangesGuard</a>\n                            </li>\n                        </ul>\n                    </li>\n                    <li class=\"chapter\">\n                        <div class=\"simple menu-toggler\" data-toggle=\"collapse\" ").concat(isNormalMode ? 'data-target="#interfaces-links"' : 'data-target="#xs-interfaces-links"', ">\n                            <span class=\"icon ion-md-information-circle-outline\"></span>\n                            <span>Interfaces</span>\n                            <span class=\"icon ion-ios-arrow-down\"></span>\n                        </div>\n                        <ul class=\"links collapse \" ").concat(isNormalMode ? ' id="interfaces-links"' : 'id="xs-interfaces-links"', ">\n                            <li class=\"link\">\n                                <a href=\"interfaces/LayerType.html\" data-type=\"entity-link\" >LayerType</a>\n                            </li>\n                            <li class=\"link\">\n                                <a href=\"interfaces/LocationType.html\" data-type=\"entity-link\" >LocationType</a>\n                            </li>\n                            <li class=\"link\">\n                                <a href=\"interfaces/RangerType.html\" data-type=\"entity-link\" >RangerType</a>\n                            </li>\n                            <li class=\"link\">\n                                <a href=\"interfaces/Stock.html\" data-type=\"entity-link\" >Stock</a>\n                            </li>\n                            <li class=\"link\">\n                                <a href=\"interfaces/What3wordsAddress33.html\" data-type=\"entity-link\" >What3wordsAddress33</a>\n                            </li>\n                            <li class=\"link\">\n                                <a href=\"interfaces/What3wordsAutosuggest33.html\" data-type=\"entity-link\" >What3wordsAutosuggest33</a>\n                            </li>\n                            <li class=\"link\">\n                                <a href=\"interfaces/What3wordsSymbol33.html\" data-type=\"entity-link\" >What3wordsSymbol33</a>\n                            </li>\n                        </ul>\n                    </li>\n                        <li class=\"chapter\">\n                            <div class=\"simple menu-toggler\" data-toggle=\"collapse\" ").concat(isNormalMode ? 'data-target="#pipes-links"' : 'data-target="#xs-pipes-links"', ">\n                                <span class=\"icon ion-md-add\"></span>\n                                <span>Pipes</span>\n                                <span class=\"icon ion-ios-arrow-down\"></span>\n                            </div>\n                            <ul class=\"links collapse \" ").concat(isNormalMode ? 'id="pipes-links"' : 'id="xs-pipes-links"', ">\n                                <li class=\"link\">\n                                    <a href=\"pipes/myUnusedPipe.html\" data-type=\"entity-link\" >myUnusedPipe</a>\n                                </li>\n                            </ul>\n                        </li>\n                    <li class=\"chapter\">\n                        <div class=\"simple menu-toggler\" data-toggle=\"collapse\" ").concat(isNormalMode ? 'data-target="#miscellaneous-links"' : 'data-target="#xs-miscellaneous-links"', ">\n                            <span class=\"icon ion-ios-cube\"></span>\n                            <span>Miscellaneous</span>\n                            <span class=\"icon ion-ios-arrow-down\"></span>\n                        </div>\n                        <ul class=\"links collapse \" ").concat(isNormalMode ? 'id="miscellaneous-links"' : 'id="xs-miscellaneous-links"', ">\n                            <li class=\"link\">\n                                <a href=\"miscellaneous/enumerations.html\" data-type=\"entity-link\">Enums</a>\n                            </li>\n                            <li class=\"link\">\n                                <a href=\"miscellaneous/functions.html\" data-type=\"entity-link\">Functions</a>\n                            </li>\n                            <li class=\"link\">\n                                <a href=\"miscellaneous/typealiases.html\" data-type=\"entity-link\">Type aliases</a>\n                            </li>\n                            <li class=\"link\">\n                                <a href=\"miscellaneous/variables.html\" data-type=\"entity-link\">Variables</a>\n                            </li>\n                        </ul>\n                    </li>\n                        <li class=\"chapter\">\n                            <a data-type=\"chapter-link\" href=\"routes.html\"><span class=\"icon ion-ios-git-branch\"></span>Routes</a>\n                        </li>\n                    <li class=\"chapter\">\n                        <a data-type=\"chapter-link\" href=\"coverage.html\"><span class=\"icon ion-ios-stats\"></span>Documentation coverage</a>\n                    </li>\n                    <li class=\"divider\"></li>\n                    <li class=\"copyright\">\n                        Documentation generated using <a href=\"https://compodoc.app/\" target=\"_blank\">\n                            <img data-src=\"images/compodoc-vectorise.png\" class=\"img-responsive\" data-type=\"compodoc-logo\">\n                        </a>\n                    </li>\n            </ul>\n        </nav>\n        "));
      this.innerHTML = tp.strings;
    }
  }]);

  return _class;
}( /*#__PURE__*/_wrapNativeSuper(HTMLElement)));