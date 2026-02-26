export const metadata = { title: "Tag Generator" };

export default function RootLayout({ children }) {
  return (
    <html lang="th">
       <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
