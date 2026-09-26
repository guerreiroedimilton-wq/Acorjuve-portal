import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Admin from "@/pages/Admin";
import Home from "@/pages/Home";
import NotFound from "@/pages/NotFound";
import { AboutPage, ArticlePage, ContactPage, EventsPage, GalleryPage, NewsPage } from "@/pages/PublicPages";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

function Router() {
  return <Switch>
    <Route path="/" component={Home} />
    <Route path="/noticias" component={NewsPage} />
    <Route path="/noticias/:slug" component={ArticlePage} />
    <Route path="/eventos" component={EventsPage} />
    <Route path="/galeria" component={GalleryPage} />
    <Route path="/sobre" component={AboutPage} />
    <Route path="/contato" component={ContactPage} />
    <Route path="/admin" component={Admin} />
    <Route component={NotFound} />
  </Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
