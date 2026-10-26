import { render, screen } from '@testing-library/react';
import App from './App';

test('renders hotel website', () => {
  render(<App />);
  expect(screen.getByText(/KING OF WIBU/i)).toBeInTheDocument();
});