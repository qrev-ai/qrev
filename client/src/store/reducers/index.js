import { combineReducers } from 'redux';
import userReducer from './userReducer';
import configReducer from './configReducer';
import integrationsReducer from './integrationsReducer';
import dataReducer from './dataReducer';
import { CLEAR_STORE } from '../types';
// import storage from "redux-persist/lib/storage";

const appReducer = combineReducers({
  config: configReducer,
  user: userReducer,
  integrations: integrationsReducer,
  data: dataReducer,
});

const rootReducer = (state, action) => {
  if (action.type === CLEAR_STORE) {
    // for all keys defined in your persistConfig(s)
    /* REVERT LOGOUT: Prevent store clearing */
    // storage.removeItem("persist:root");
    // state = undefined;
  }
  return appReducer(state, action);
};

export default rootReducer;
