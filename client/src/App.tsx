import { Switch, Route, useLocation, useParams } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import Header from "@/components/Header";
import LightAudioPlayer from "@/components/LightAudioPlayer";
import DirectSharePopup from "@/components/DirectSharePopup";
import InstallPrompt from "@/components/InstallPrompt";
import OfflineFallback from "@/components/OfflineFallback";
import Home from "@/pages/Home";
import PodcastDetail from "@/pages/PodcastDetail";
import ChannelView from "@/pages/ChannelView";
import SearchResults from "@/pages/SearchResults";
import Auth from "@/pages/Auth";
import NotFound from "@/pages/not-found";
import TestPage from "@/pages/TestPage";
import { useState, useEffect, useContext, useCallback, lazy, Suspense } from "react";
import { Podcast, AudioStream } from "@/types/podcast";
import { useAudioPlayerStore, useSearchStore, useAuthStore } from "@/store/index";
import { useShareStore } from "@/lib/useShare";
import { NetworkContext, NetworkProvider } from "@/contexts/NetworkContext";
import LoadingIndicator from "@/components/LoadingIndicator";

// Route components using improved props passing and memoization
const HomeRoute = ({ onPlayPodcast }: { onPlayPodcast: (podcast: Podcast, stream: AudioStream) => void }) => {
  return <Home onPlayPodcast={onPlayPodcast} />;
};

const SearchRoute = ({ onPlayPodcast }: { onPlayPodcast: (podcast: Podcast, stream: AudioStream) => void }) => {
  const params = useParams();
  const query = params?.query ? decodeURIComponent(params.query) : '';
  return <SearchResults query={query} onPlayPodcast={onPlayPodcast} />;
};

const PodcastRoute = ({ onPlayPodcast }: { onPlayPodcast: (podcast: Podcast, stream: AudioStream) => void }) => {
  const params = useParams();
  return <PodcastDetail id={params?.id || ''} onPlayPodcast={onPlayPodcast} />;
};

const ChannelRoute = ({ onPlayPodcast }: { onPlayPodcast: (podcast: Podcast, stream: AudioStream) => void }) => {
  const params = useParams();
  return <ChannelView id={params?.id || ''} onPlayPodcast={onPlayPodcast} />;
};

// Main App Content with network awareness
const AppContent = () => {
  const { isOnline } = useContext(NetworkContext);
  const [currentPodcast, setCurrentPodcast] = useState<Podcast | null>(null);
  const [audioStream, setAudioStream] = useState<AudioStream | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const { searchQuery } = useSearchStore();
  const [location] = useLocation();
  
  // Use our global share store
  const { sharePodcast } = useShareStore();
  
  // Access the player state to load from it if needed
  const playerStore = useAudioPlayerStore();
  
  // Show offline fallback when not connected to the internet
  if (!isOnline) {
    return <OfflineFallback />;
  }

  // Effect to initialize player from state store
  useEffect(() => {
    // If we have state in the store, use it
    if (playerStore.currentPodcast && !currentPodcast) {
      setCurrentPodcast(playerStore.currentPodcast);
      setAudioStream(playerStore.audioStream);
      setIsPlaying(playerStore.isPlaying);
    }
  }, [playerStore, currentPodcast]);

  // Handle URL sharing parameters
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    try {
      // Check if we have sharing parameters in the URL
      const url = new URL(window.location.href);
      const shareId = url.searchParams.get('share');
      
      if (shareId) {
        // If we have a share ID, navigate to the correct content
        setLocation(`/podcast/${shareId}`);
      }
    } catch (error) {
      console.error('Error processing URL parameters:', error);
    }
  }, [setLocation]);

  // Memoize the play podcast handler for performance
  const handlePlayPodcast = useCallback((podcast: Podcast, stream: AudioStream) => {
    setCurrentPodcast(podcast);
    setAudioStream(stream);
    setIsPlaying(true);
    
    // Update the store for persistence
    playerStore.setCurrentPodcast(podcast);
    playerStore.setAudioStream(stream);
    playerStore.setIsPlaying(true);
  }, [playerStore]);

  // Memoize the share handler for performance
  const handleShare = useCallback(() => {
    if (!currentPodcast) return;    
    // Use our sharePodcast helper from useShareStore
    sharePodcast(currentPodcast);
  }, [currentPodcast, sharePodcast]);

  const { isAuthenticated } = useAuthStore();
  
  // Redirect to authentication if not authenticated and not already on the auth page
  useEffect(() => {
    const publicPaths = ['/auth', '/test'];
    if (!isAuthenticated && !publicPaths.includes(location)) {
      setLocation('/auth');
    }
  }, [isAuthenticated, location, setLocation]);
  
  // Check if the user is on the auth page
  const isAuthPage = location === '/auth';

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-zinc-900 transition-colors duration-300">
      {/* Only show header if authenticated or if not on auth page */}
      <Header isAuthPage={isAuthPage} />
      
      {/* Main content with improved padding */}
      <div className="px-0 lg:px-4 flex-1 pb-20 md:pb-24">
        <Suspense fallback={<div className="flex justify-center py-12"><LoadingIndicator /></div>}>
          <Switch>
            {isAuthenticated ? (
              <>
                <Route path="/">
                  <HomeRoute onPlayPodcast={handlePlayPodcast} />
                </Route>
                <Route path="/search/:query">
                  <SearchRoute onPlayPodcast={handlePlayPodcast} />
                </Route>
                <Route path="/podcast/:id">
                  <PodcastRoute onPlayPodcast={handlePlayPodcast} />
                </Route>
                <Route path="/channel/:id">
                  <ChannelRoute onPlayPodcast={handlePlayPodcast} />
                </Route>
              </>
            ) : null}
            
            {/* Auth route is always accessible */}
            <Route path="/auth">
              <Auth />
            </Route>
            
            {/* Test page route - always accessible */}
            <Route path="/test">
              <TestPage />
            </Route>
            
            <Route>
              {isAuthenticated ? <NotFound /> : <Auth />}
            </Route>
          </Switch>
        </Suspense>
      </div>
      
      {/* Audio player component with conditional rendering */}
      {currentPodcast && isAuthenticated && (
        <LightAudioPlayer 
          podcast={currentPodcast}
          audioStream={audioStream}
          isPlaying={isPlaying}
          onTogglePlay={(state: boolean) => setIsPlaying(state)}
          onShare={handleShare}
        />
      )}
      
      <Toaster />
      
      {/* Direct Share Popup */}
      <DirectSharePopup />
    </div>
  );
};

// Wrapper component that provides NetworkProvider and PWA install prompt
const App = () => {
  return (
    <NetworkProvider>
      <AppContent />
      <InstallPrompt />
    </NetworkProvider>
  );
};

export default App;