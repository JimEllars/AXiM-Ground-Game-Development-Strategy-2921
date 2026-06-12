import { render } from '@testing-library/react';
import SafeIcon from '../SafeIcon';
import { FiHome } from 'react-icons/fi';

describe('SafeIcon', () => {
  it('renders icon from component prop', () => {
    // FiHome renders an svg. We can check if an svg is rendered.
    const { container } = render(<SafeIcon icon={FiHome} data-testid="icon-component" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders icon from name prop', () => {
    const { container } = render(<SafeIcon name="Home" data-testid="icon-name" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders fallback icon when name is invalid', () => {
    const { container } = render(<SafeIcon name="InvalidIconName123" data-testid="icon-fallback" />);
    // Should render FiAlertTriangle
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    // FiAlertTriangle usually has specific attributes or we can snapshot it, but just presence is enough for now
    // to ensure no crash.
  });
});
