import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../../components/ui/Button';
import { describe, it, expect, vi } from 'vitest';

describe('Button Component', () => {
  it('renders correctly with children', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByText('Click Me')).toBeDefined();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);
    
    fireEvent.click(screen.getByText('Click Me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders loading state', () => {
    render(<Button isLoading>Click Me</Button>);
    expect(screen.getByText('Click Me')).toBeDefined();
    // Check if the button is disabled during loading
    const button = screen.getByRole('button');
    expect(button).toHaveProperty('disabled', true);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled Button</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveProperty('disabled', true);
  });
});
