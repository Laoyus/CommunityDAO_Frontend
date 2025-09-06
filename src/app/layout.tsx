import { Web3Provider } from '../../contexts/Web3Context';
import './globals.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CommunityDAO',
  description: 'Decentralized Community Funding Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Web3Provider>
          {children}
        </Web3Provider>
      </body>
    </html>
  );
}