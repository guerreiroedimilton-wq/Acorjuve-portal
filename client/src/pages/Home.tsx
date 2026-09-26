import { ArrowRight, CalendarDays, ChevronRight, HeartHandshake, Leaf, MapPin, MessageCircle, Sprout, Users } from "lucide-react";
import { Link } from "wouter";
import { PageLayout } from "@/components/SiteShell";
import { ASSETS, DEMO_EVENTS, DEMO_GALLERY, DEMO_NEWS, formatDate } from "@/lib/content";
import { trpc } from "@/lib/trpc";

export default function Home() {
  const { data } = trpc.portal.home.useQuery();
  const stories = data?.news?.length ? data.news : DEMO_NEWS;
  const upcoming = data?.events?.length ? data.events : DEMO_EVENTS;
  const gallery = data?.gallery?.length ? data.gallery : DEMO_GALLERY;
  return <PageLayout>
    <section className="hero">
      <img src={ASSETS.hero} alt="Amanhecer junto ao rio em uma comunidade amazônica" />
      <div className="hero-overlay" />
      <div className="container hero-content">
        <span className="eyebrow light"><Leaf size={15} /> Associação Comunitária de Juruti Velho</span>
        <h1>O futuro de Juruti Velho se constrói <em>em comunidade.</em></h1>
        <p>Informação, diálogo e ação para fortalecer as pessoas, a cultura e o território onde vivemos.</p>
        <div className="hero-actions"><Link href="/sobre" className="button button-primary">Conheça a ACORJUVE <ArrowRight size={17} /></Link><Link href="/noticias" className="button button-ghost">Ver notícias</Link></div>
      </div>
      <div className="hero-note"><span></span> Juruti Velho · Pará · Amazônia</div>
    </section>

    <section className="intro-section section">
      <div className="container intro-grid">
        <div className="intro-copy"><span className="eyebrow"><HeartHandshake size={15} /> Nossa associação</span><h2>Onde cada voz ajuda a encontrar um novo caminho.</h2><p>A ACORJUVE é uma associação comunitária que aproxima moradores, valoriza os saberes locais e transforma a participação em ações que cuidam de Juruti Velho.</p><Link href="/sobre" className="text-link">Conheça nossa história <ArrowRight size={16} /></Link></div>
        <div className="intro-stats"><div><strong>+ de 10</strong><span>anos de presença comunitária</span></div><div><strong>1 só</strong><span>comunidade, muitas vozes</span></div><div><strong>Todo dia</strong><span>mais perto das pessoas</span></div></div>
      </div>
    </section>

    <section className="section news-section">
      <div className="container"><div className="section-heading"><div><span className="eyebrow"><MessageCircle size={15} /> Acontece por aqui</span><h2>Últimas notícias</h2></div><Link href="/noticias" className="text-link">Todas as notícias <ArrowRight size={16} /></Link></div>
        <div className="news-grid">{stories.map((story, index) => <article className={`news-card ${index === 0 ? "featured" : ""}`} key={story.id}><div className="news-image"><img src={story.coverImage || ASSETS.community} alt="" /><span>{story.category || "ACORJUVE"}</span></div><div className="news-content"><p className="meta">{formatDate(story.publishedAt)} · {story.authorName}</p><h3>{story.title}</h3><p>{story.excerpt}</p><Link href={`/noticias/${story.slug}`} className="card-link" aria-label={`Ler ${story.title}`}>Ler notícia <ChevronRight size={17} /></Link></div></article>)}</div>
      </div>
    </section>

    <section className="section events-section"><div className="container"><div className="section-heading"><div><span className="eyebrow"><CalendarDays size={15} /> Agenda da comunidade</span><h2>Próximos encontros</h2></div><Link href="/eventos" className="text-link">Ver agenda completa <ArrowRight size={16} /></Link></div>
      <div className="event-list">{upcoming.map(event => <article className="event-row" key={event.id}><div className="date-block"><strong>{new Date(event.startAt).getDate().toString().padStart(2, "0")}</strong><span>{new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(new Date(event.startAt)).replace(".", "")}</span></div><div className="event-details"><h3>{event.title}</h3><p>{event.description}</p><span><MapPin size={15} /> {event.location}</span></div><Link href="/eventos" className="round-link" aria-label={`Ver ${event.title}`}><ArrowRight size={19} /></Link></article>)}</div>
    </div></section>

    <section className="section project-section"><div className="container project-grid"><div className="project-image"><img src={ASSETS.community} alt="Moradores de diferentes gerações cuidando de uma horta comunitária" /><div className="image-label"><Sprout size={21} /><span>Projetos & Ações</span></div></div><div className="project-copy"><span className="eyebrow"><Users size={15} /> Fazer junto</span><h2>Pequenas ações. Grandes transformações.</h2><p>Da valorização dos saberes locais ao cuidado com os espaços compartilhados, nossas iniciativas nascem da escuta e ganham força quando a comunidade participa.</p><div className="project-points"><span>Educação e cultura</span><span>Meio ambiente</span><span>Participação popular</span></div><Link href="/sobre" className="button button-dark">Conheça nossos projetos <ArrowRight size={17} /></Link></div></div></section>

    <section className="section gallery-section"><div className="container"><div className="section-heading"><div><span className="eyebrow"><Leaf size={15} /> Memórias e encontros</span><h2>Galeria da comunidade</h2></div><Link href="/galeria" className="text-link">Abrir galeria <ArrowRight size={16} /></Link></div><div className="gallery-grid">{gallery.slice(0, 4).map((image, i) => <Link key={image.id} href="/galeria" className={`gallery-tile tile-${i}`}><img src={image.imageUrl} alt={image.altText} /><span>{image.category}</span></Link>)}</div></div></section>

    <section className="participate"><div className="container participate-inner"><div><span className="eyebrow light"><HeartHandshake size={15} /> Sua participação importa</span><h2>Tem uma ideia, sugestão ou necessidade?</h2><p>Envie uma mensagem para a ACORJUVE. Este espaço também é seu.</p></div><Link href="/contato" className="button button-sand">Entre em contato <ArrowRight size={17} /></Link></div></section>
  </PageLayout>;
}
