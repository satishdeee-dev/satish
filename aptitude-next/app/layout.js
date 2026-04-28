import './globals.css';

export const metadata = {
  title: 'NeuroQuest — Aptitude Challenge',
  description: 'Robotics-themed aptitude test for job interviews. 10 questions, 30s each, pass mark 7/10.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
