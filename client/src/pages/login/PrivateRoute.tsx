import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { StoreParams } from '../../models/store';

const PrivateRoute: React.FC = () => {
  const user = useSelector((state: StoreParams) => state.user);

  return user.isSignedIn ? <Outlet /> : <Navigate to="/login" />;
};

export default PrivateRoute;
