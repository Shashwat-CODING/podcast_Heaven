import { Route, useParams } from "wouter";
import { Podcast, AudioStream } from "./types/podcast";
import Home from "./pages/Home";
import PodcastDetail from "./pages/PodcastDetail";
import ChannelView from "./pages/ChannelView";
import SearchResults from "./pages/SearchResults";
import Auth from "./pages/Auth";
import NotFound from "./pages/not-found";
import CreatePage from "./pages/CreatePage";

export interface RouteProps {
  onPlayPodcast: (podcast: Podcast, stream: AudioStream) => void;
}

// Wrapper components to handle route-specific props
const SearchResultsWrapper = (props: RouteProps) => {
  const params = useParams();
  const query = params?.query ? decodeURIComponent(params.query) : '';
  return <SearchResults {...props} query={query} />;
};

const PodcastDetailWrapper = (props: RouteProps) => {
  const params = useParams();
  return <PodcastDetail {...props} id={params?.id || ''} />;
};

const ChannelViewWrapper = (props: RouteProps) => {
  const params = useParams();
  return <ChannelView {...props} id={params?.id || ''} />;
};

export const routes = [
  {
    path: "/",
    component: Home,
    requiresAuth: true,
  },
  {
    path: "/search/:query",
    component: SearchResultsWrapper,
    requiresAuth: true,
  },
  {
    path: "/podcast/:id",
    component: PodcastDetailWrapper,
    requiresAuth: true,
  },
  {
    path: "/channel/:id",
    component: ChannelViewWrapper,
    requiresAuth: true,
  },
  {
    path: "/create",
    component: CreatePage,
    requiresAuth: true,
  },
  {
    path: "/auth",
    component: Auth,
    requiresAuth: false,
  },
];

export const renderRoutes = (props: RouteProps, isAuthenticated: boolean) => {
  return routes.map(({ path, component: Component, requiresAuth }) => {
    if (requiresAuth && !isAuthenticated) return null;
    
    return (
      <Route key={path} path={path}>
        <Component {...props} />
      </Route>
    );
  });
}; 