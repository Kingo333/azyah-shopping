import { useNavigate } from 'react-router-dom';
import SwipeDeck from '@/components/SwipeDeck';

const Swipe = () => {
  const navigate = useNavigate();

  return (
    <SwipeDeck onBack={() => navigate('/dashboard')} />
  );
};

export default Swipe;