import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { getTopicBySlug } from "@/lib/curriculum";
import { getTopicSlidesUrl } from "@/lib/slides";
import { getTopicPresentations } from "@/lib/presentations";
import { GoogleSlidesEmbed } from "@/components/slides/google-slides-embed";

export async function generateMetadata({ params }: PageProps<"/learn/[topic]/slides">): Promise<Metadata> {
  const topic = await getTopicBySlug((await params).topic);
  return { title: `${topic?.title ?? "Topic"} — Slides` };
}

export default async function TopicSlidesPage({ params }: PageProps<"/learn/[topic]/slides">) {
  const slug = (await params).topic;
  const [profile, topic, slidesUrl] = await Promise.all([requireProfile(), getTopicBySlug(slug), getTopicSlidesUrl(slug)]);
  if (!topic) notFound();

  const canEdit = profile.role === "teacher" || profile.role === "admin";
  const presentations = getTopicPresentations(slug);

  return (
    <div className="space-y-6">
      <GoogleSlidesEmbed
        topicSlug={slug}
        topicTitle={topic.title}
        initialSlidesUrl={slidesUrl}
        presentations={presentations}
        canEdit={canEdit}
      />
    </div>
  );
}
