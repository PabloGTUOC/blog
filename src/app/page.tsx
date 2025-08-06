import Link from 'next/link';

export default function Home() {
  return (
    <div className="p-4 space-y-4">
      <h1>Welcome</h1>
      <nav>
        <ul className="space-y-2">
          <li>
            <Link href="/blog">Blog</Link>
          </li>
          <li>
            <Link href="/galleries">Galleries</Link>
          </li>
          <li>
            <Link href="/admin">Admin</Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
