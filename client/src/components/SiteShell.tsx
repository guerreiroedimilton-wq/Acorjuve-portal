import { Facebook, Instagram, Menu, Send, X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

const navItems = [
  { label: "Início", href: "/" },
  { label: "Notícias", href: "/noticias" },
  { label: "Eventos", href: "/eventos" },
  { label: "Galeria", href: "/galeria" },
  { label: "Sobre", href: "/sobre" },
  { label: "Contato", href: "/contato" },
];

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return <Link href="/" className={`brand-mark ${compact ? "compact" : ""}`} aria-label="ACORJUVE — página inicial">
    <img className="brand-logo" src="/acorjuve-logo.png" alt="Logo da ACORJUVE — Associação Comunitária de Juruti Velho" />
    {!compact && <span><strong>ACORJUVE</strong><small>Juruti Velho · PA</small></span>}
  </Link>;
}

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [location] = useLocation();
  return <>
    <a href="#conteudo" className="skip-link">Pular para o conteúdo</a>
    <header className="site-header">
      <div className="container header-inner">
        <BrandMark />
        <nav className="desktop-nav" aria-label="Navegação principal">
          {navItems.map(item => <Link key={item.href} href={item.href} className={location === item.href ? "active" : ""}>{item.label}</Link>)}
        </nav>
        <a className="header-action" href="/contato"><Send size={16} /> Fale conosco</a>
        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Fechar menu" : "Abrir menu"} aria-expanded={menuOpen}>{menuOpen ? <X /> : <Menu />}</button>
      </div>
    </header>
    {menuOpen && <div className="mobile-menu" role="dialog" aria-label="Menu de navegação">
      <div className="mobile-menu-top"><BrandMark /><button onClick={() => setMenuOpen(false)} aria-label="Fechar menu"><X /></button></div>
      <nav>{navItems.map(item => <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>{item.label}</Link>)}</nav>
      <a className="button button-primary" href="/contato" onClick={() => setMenuOpen(false)}>Fale conosco <Send size={16} /></a>
    </div>}
  </>;
}

export function SiteFooter() {
  return <footer className="site-footer">
    <div className="container footer-grid">
      <div><BrandMark /><p>Uma associação feita de pessoas, território e participação. Construindo, juntos, um Juruti Velho mais forte.</p></div>
      <div><h3>Explore</h3>{navItems.map(item => <Link key={item.href} href={item.href}>{item.label}</Link>)}</div>
      <div><h3>Contato</h3><p>Juruti Velho<br />Juruti · Pará</p><a href="mailto:contato@acorjuve.org.br">contato@acorjuve.org.br</a></div>
      <div><h3>Redes sociais</h3><p>Acompanhe as ações da comunidade.</p><div className="social-links"><a href="#" aria-label="Instagram da ACORJUVE"><Instagram /></a><a href="#" aria-label="Facebook da ACORJUVE"><Facebook /></a></div></div>
    </div>
    <div className="container footer-bottom"><span>© {new Date().getFullYear()} ACORJUVE. Todos os direitos reservados.</span><span>Feito para a comunidade de Juruti Velho.</span></div>
  </footer>;
}

export function PageLayout({ children }: { children: React.ReactNode }) {
  return <div className="site-page"><SiteHeader /><main id="conteudo">{children}</main><SiteFooter /></div>;
}
