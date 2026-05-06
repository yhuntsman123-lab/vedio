export const metadata = {
  title: "AI Studio - Text to Cinematic Comic Drama",
  description: "Generate cyberpunk dark guofeng comic drama videos from scripts with consistent digital actors.",
  openGraph: {
    title: "AI Studio",
    description: "Text to cinematic comic drama",
    type: "website"
  }
};

export default function HomePage(): JSX.Element {
  return (
    <main style={{ padding: 32, fontFamily: "'Space Grotesk', sans-serif", background: "radial-gradient(circle at top, #153a46, #0b0f14 50%)", minHeight: "100vh", color: "#e6f8ff" }}>
      <h1>AI Studio</h1>
      <p>Upload txt/md, paste script, or provide URL. Rewrite, storyboard, render, and publish in one flow.</p>
      <ul>
        <li>Digital actor consistency with InstantID + IP-Adapter</li>
        <li>Cinematic motion and crossfade composition</li>
        <li>Points-based billing with pre-auth and settlement</li>
      </ul>
    </main>
  );
}
