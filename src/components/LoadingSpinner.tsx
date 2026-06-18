import React from 'react';
import SkeletonLoader from './SkeletonLoader';

interface LoadingSpinnerProps {
  message?: string;
  size?: number;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = () => {
  return <SkeletonLoader type="list" count={3} />;
};

export default LoadingSpinner;
