import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

export default function AdminRoute({ children }) {
  const { user } = useSelector((state) => state.auth);
  
  if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
    return <Navigate to="/map" replace />;
  }
  
  return children;
}
