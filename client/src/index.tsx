import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import reportWebVitals from './reportWebVitals';
import store, { persistor } from './store/configureStore';
import { PersistGate } from 'redux-persist/integration/react';
import { lazy } from '@loadable/component';
import './styles/index.scss';

const App = lazy(() => import('./App'));
const AppWithContext = lazy(() => import('./hooks/contexts/DevContext'));

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate persistor={persistor}>
        <Suspense fallback={<div>Loading...</div>}>
          <AppWithContext>
            <App />
          </AppWithContext>
        </Suspense>
      </PersistGate>
    </Provider>
  </React.StrictMode>,
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
