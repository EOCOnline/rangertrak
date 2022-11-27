
export { AppServerModule } from './app/app.server.module';

// https://www.thecodehubs.com/how-to-solve-window-is-not-defined-in-angular-11/
const MockBrowser = require('mock-browser').mocks.MockBrowser;
const mock = new MockBrowser();
global['window'] = mock.getWindow();
