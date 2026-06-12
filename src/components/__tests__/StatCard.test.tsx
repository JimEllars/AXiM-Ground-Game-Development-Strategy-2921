import { render, screen } from '@testing-library/react';
import StatCard from '../StatCard';
import { FiUsers } from 'react-icons/fi';

describe('StatCard', () => {
  it('renders correctly with required props', () => {
    render(
      <StatCard
        title="Test Title"
        value="100"
        icon={FiUsers}
        color="#000000"
      />
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('renders correctly with subtitle', () => {
    render(
      <StatCard
        title="Test Title"
        value="100"
        icon={FiUsers}
        color="#000000"
        subtitle="Test Subtitle"
      />
    );

    expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
  });
});
