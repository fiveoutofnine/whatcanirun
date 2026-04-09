import type { Metadata } from 'next';
import { Fragment } from 'react';

const title = 'Run Details';
const description = 'View benchmark run details, technical metadata, and trial outputs.';

export const metadata: Metadata = {
  title,
  description,
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <Fragment>{children}</Fragment>;
}
