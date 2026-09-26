export const ASSETS = {
  hero: "/manus-storage/hero-juruti_cf263e27.jpg",
  community: "/manus-storage/project-community_a01d0652.jpg",
  river: "/manus-storage/gallery-rio_c1247ed7.jpg",
  culture: "/manus-storage/gallery-cultural_ac4603b8.jpg",
};

export const DEMO_NEWS = [
  {
    id: -1,
    title: "ACORJUVE fortalece a participação comunitária em Juruti Velho",
    slug: "participacao-comunitaria-juruti-velho",
    excerpt: "Moradoras e moradores se reuniram para compartilhar prioridades, organizar ações e construir novos caminhos para a comunidade.",
    content: "A ACORJUVE realizou uma roda de conversa com famílias de Juruti Velho para ouvir demandas, apresentar iniciativas em andamento e definir prioridades coletivas.\n\nA participação de cada morador é essencial para que as ações da associação reflitam a vida real da comunidade. Novas reuniões serão divulgadas neste portal.",
    coverImage: ASSETS.community,
    category: "Comunidade",
    categorySlug: "comunidade",
    authorName: "Equipe ACORJUVE",
    publishedAt: new Date("2026-09-10T12:00:00Z"),
  },
  {
    id: -2,
    title: "Mutirão de limpeza e cuidado com os espaços comuns",
    slug: "mutirao-limpeza-espacos-comuns",
    excerpt: "Ação comunitária reúne voluntários para valorizar as áreas de convivência e preservar o ambiente local.",
    content: "Cuidar do lugar onde vivemos é uma responsabilidade compartilhada. O mutirão mobilizou voluntários de diferentes idades em uma manhã de trabalho e cooperação.\n\nA associação agradece a todos que contribuíram e convida mais pessoas a participar das próximas ações.",
    coverImage: ASSETS.river,
    category: "Meio ambiente",
    categorySlug: "meio-ambiente",
    authorName: "Equipe ACORJUVE",
    publishedAt: new Date("2026-09-04T12:00:00Z"),
  },
  {
    id: -3,
    title: "Oficina de saberes locais valoriza cultura e criatividade",
    slug: "oficina-saberes-locais",
    excerpt: "Atividade reúne gerações para trocar conhecimentos, criar juntos e fortalecer a identidade de Juruti Velho.",
    content: "A oficina de saberes locais foi um encontro de aprendizado, memória e criatividade. Jovens e adultos compartilharam técnicas, histórias e experiências que fazem parte da identidade da nossa comunidade.\n\nA ACORJUVE continuará apoiando iniciativas que valorizam a cultura local e a participação popular.",
    coverImage: ASSETS.culture,
    category: "Cultura",
    categorySlug: "cultura",
    authorName: "Equipe ACORJUVE",
    publishedAt: new Date("2026-08-28T12:00:00Z"),
  },
];

export const DEMO_EVENTS = [
  { id: -1, title: "Assembleia comunitária", description: "Encontro aberto para dialogar sobre prioridades e organizar as próximas ações da associação.", location: "Sede comunitária de Juruti Velho", startAt: new Date("2026-09-27T18:30:00Z"), imageUrl: ASSETS.community },
  { id: -2, title: "Feira de saberes e sabores", description: "Um dia para celebrar a produção local, a cultura e o encontro entre moradores.", location: "Praça da comunidade", startAt: new Date("2026-10-11T14:00:00Z"), imageUrl: ASSETS.culture },
  { id: -3, title: "Mutirão de cuidado com o rio", description: "Ação coletiva de conscientização e cuidado com os espaços de convivência próximos ao rio.", location: "Orla de Juruti Velho", startAt: new Date("2026-10-25T07:30:00Z"), imageUrl: ASSETS.river },
];

export const DEMO_GALLERY = [
  { id: -1, title: "Amanhecer no rio", altText: "Amanhecer sobre o rio junto à comunidade", category: "Natureza", imageUrl: ASSETS.hero },
  { id: -2, title: "Cuidar e plantar", altText: "Moradores trabalhando juntos em uma horta comunitária", category: "Ações", imageUrl: ASSETS.community },
  { id: -3, title: "Viver o rio", altText: "Família caminhando pela margem do rio ao entardecer", category: "Comunidade", imageUrl: ASSETS.river },
  { id: -4, title: "Saberes que unem", altText: "Oficina de artesanato e saberes locais", category: "Cultura", imageUrl: ASSETS.culture },
];

export function formatDate(value: Date | string | null | undefined, withTime = false) {
  if (!value) return "Data a confirmar";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "short", year: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(value));
}
