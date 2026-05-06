import type { Metadata } from "next";

interface EpisodePageProps {
  params: { id: string };
}

const sample = {
  title: "Neon Tower Infiltration",
  description: "A digital actor infiltrates a neon megatower under drone surveillance.",
  durationSec: 42,
  uploadDate: "2026-05-05",
  thumbnailUrl: "https://aitvmake.com/thumbs/neon.jpg",
  contentUrl: "https://aitvmake.com/videos/neon.mp4",
  transcript: "Night drops over the city. The protagonist slips into the tower...",
  tags: ["cyberpunk", "dark guofeng", "comic drama", "neon"]
};

export async function generateMetadata({ params }: EpisodePageProps): Promise<Metadata> {
  return {
    title: `${sample.title} | AI Studio`,
    description: sample.description,
    alternates: { canonical: `https://aitvmake.com/episode/${params.id}` },
    openGraph: {
      type: "video.episode",
      title: sample.title,
      description: sample.description,
      videos: [{ url: sample.contentUrl }],
      images: [sample.thumbnailUrl]
    }
  };
}

export default function EpisodePage({ params }: EpisodePageProps): JSX.Element {
  const videoJsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: sample.title,
    description: sample.description,
    thumbnailUrl: sample.thumbnailUrl,
    uploadDate: sample.uploadDate,
    duration: `PT${sample.durationSec}S`,
    contentUrl: sample.contentUrl,
    keywords: sample.tags.join(",")
  };

  return (
    <main style={{ padding: 24, background: "linear-gradient(160deg, #0a0e14, #0e1e25)", minHeight: "100vh", color: "#dff7ff" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(videoJsonLd) }} />
      <h1>{sample.title}</h1>
      <p>{sample.description}</p>
      <p><strong>Episode ID:</strong> {params.id}</p>
      <p><strong>Transcript excerpt:</strong> {sample.transcript}</p>
      <p><strong>Tags:</strong> {sample.tags.join(", ")}</p>
      <video src={sample.contentUrl} controls width={960} poster={sample.thumbnailUrl} />
    </main>
  );
}
