import { createStore, applyMiddleware, compose } from 'redux';
import thunk from 'redux-thunk';
import { persistStore, persistReducer, createMigrate } from 'redux-persist';
import rootReducer from './reducers';
import localforage from './storageConfig';
import { init_analytics_data } from './storeUtils';

const migrations = {
  1: (previousState) => ({
    ...previousState,
    user: {
      ...previousState.user,
    },
  }),
  2: (previousState) => ({
    ...previousState,
    config: {
      ...previousState.config,
    },
  }),
  3: (previousState) => ({
    ...previousState,
    integrations: {
      ...previousState.integrations,
    },
  }),
  4: (previousState) => ({
    ...previousState,
    data: {
      ...previousState.data,
      analyticsData: init_analytics_data,
      activeRouting: '',
    },
  }),
};

const persistConfig = {
  key: 'root',
  storage: localforage,
  // whitelist: ['user'], // only "user" will be persisted
  version: 18,
  migrate: createMigrate(migrations, { debug: true }),
};

const composeEnhancers =
  typeof window === 'object' && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
    ? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({
        // Specify extension’s options like name, actionsBlacklist, actionsCreators, serialize...
      })
    : compose;

const persistedReducer = persistReducer(persistConfig, rootReducer);

const store = createStore(persistedReducer, composeEnhancers(applyMiddleware(thunk)));

export const persistor = persistStore(store);

export default store;
