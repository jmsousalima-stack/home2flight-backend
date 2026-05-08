export const metadata = {
  title: "Home2Flight",
  description: "Home2Flight Reliability Engine",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt">
      <body
        style={{
          margin: 0,
          background: "#0b1020",
          color: "white",
          fontFamily: "Arial",
        }}
      >
        {children}
      </body>
    </html>
  );
}
