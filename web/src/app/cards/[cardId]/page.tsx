import { CardDetailClient } from "./card-detail-client";

type CardDetailPageProps = {
  params: Promise<{
    cardId: string;
  }>;
};

export default async function CardDetailPage({ params }: CardDetailPageProps) {
  const resolvedParams = await params;
  return <CardDetailClient cardId={resolvedParams?.cardId ?? ""} />;
}

export async function generateStaticParams() {
  return [
    {
      cardId: "sample-card",
    },
  ];
}
