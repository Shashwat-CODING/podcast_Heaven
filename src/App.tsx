import React, { useState, useEffect, useContext, useCallback, lazy, Suspense, memo } from "react";
import { Routes, Route, useParams, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from "./components/ui/toaster";
import Header from "./components/Header";
import AudioPlayer from "./components/AudioPlayer";
import DirectSharePopup from "./components/DirectSharePopup";
import InstallPrompt from "./components/InstallPrompt";
import UpdatePrompt from "./components/UpdatePrompt";
import OfflineFallback from "./components/OfflineFallback";
import Home from "./pages/Home";
import PodcastDetail from "./pages/PodcastDetail";
import ChannelView from "./pages/ChannelView";
import SearchResults from "./pages/SearchResults";
import Auth from "./pages/Auth";
import NotFound from "./pages/not-found";
import CreatePage from "./pages/CreatePage";

import { Podcast, AudioStream, VideoStream } from "./types/podcast";
import { useAudioPlayerStore, useSearchStore, useAuthStore } from "./store/index";
import { getVideoStream, extractVideoIdFromUrl } from "./api/podcast";
import { useShareStore } from "./lib/useShare";
import { NetworkContext, NetworkProvider } from "./contexts/NetworkContext";
import LoadingIndicator from "./components/LoadingIndicator";

// Add window type declaration
declare global {
  interface Window {
    navigateTo?: (path: string) => void;
  }
}

// Route components with proper typing
const HomeRoute = memo(({ onPlayPodcast }: { onPlayPodcast: (podcast: Podcast, stream: AudioStream) => void }) => (
  <Home onPlayPodcast={onPlayPodcast} />
));

const SearchRoute = memo(({ onPlayPodcast }: { onPlayPodcast: (podcast: Podcast, stream: AudioStream) => void }) => {
  const { query } = useParams<{ query: string }>();
  return <SearchResults query={query || ''} onPlayPodcast={onPlayPodcast} />;
});

const PodcastRoute = memo(({ onPlayPodcast }: { onPlayPodcast: (podcast: Podcast, stream: AudioStream) => void }) => {
  const { id } = useParams<{ id: string }>();
  return <PodcastDetail id={id || ''} onPlayPodcast={onPlayPodcast} />;
});

const ChannelRoute = memo(({ onPlayPodcast }: { onPlayPodcast: (podcast: Podcast, stream: AudioStream) => void }) => {
  const { id } = useParams<{ id: string }>();
  return <ChannelView id={id || ''} onPlayPodcast={onPlayPodcast} />;
});

// Main App Content with fixed hooks
const AppContent = () => {
  const { isOnline } = useContext(NetworkContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [currentPodcast, setCurrentPodcast] = useState<Podcast | null>(null);
  const [audioStream, setAudioStream] = useState<AudioStream | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const { searchQuery } = useSearchStore();

  // Use our global share store
  const { sharePodcast } = useShareStore();

  // Access the player state to load from it if needed
  const playerStore = useAudioPlayerStore();

  // Expose navigation function for external scripts (like redirect.js)
  useEffect(() => {
    window.navigateTo = (path: string) => {
      navigate(path);
    };

    return () => {
      delete window.navigateTo;
    };
  }, [navigate]);

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
  useEffect(() => {
    try {
      // Check if we have sharing parameters in the URL
      const url = new URL(window.location.href);
      const shareId = url.searchParams.get('share');

      if (shareId) {
        // If we have a share ID, navigate to the correct content
        navigate(`/podcast/${shareId}`);
      }
    } catch (error) {
      console.error('Error processing URL parameters:', error);
    }
  }, [navigate]);

  // Memoize the play podcast handler for performance
  const handlePlayPodcast = useCallback((podcast: Podcast, stream: AudioStream) => {
    setCurrentPodcast(podcast);
    setAudioStream(stream);
    setIsPlaying(true);

    // Update the store for persistence
    playerStore.setCurrentPodcast(podcast);
    playerStore.setAudioStream(stream);
    playerStore.setIsPlaying(true);

    // Reset video mode when starting a new podcast
    playerStore.setVideoStream(null);
    if (playerStore.isVideoMode) {
      playerStore.toggleVideoMode();
    }

    // Fetch video stream in the background if available
    const videoId = extractVideoIdFromUrl(podcast.url);
    if (videoId) {
      // Fetch video stream directly from the API using our helper function
      getVideoStream(videoId)
        .then(data => {
          if (data.status === "success" && data.url) {
            // Create a VideoStream object from the API response
            const videoStream: VideoStream = {
              url: data.url,
              quality: data.quality || "480p",
              mimeType: "video/mp4",
              codec: "h264",
              bitrate: 1000000, // Approximate bitrate
              contentLength: 0, // Unknown content length
              videoQuality: data.quality || "480p",
              height: parseInt(data.quality || "480", 10),
              width: Math.round(parseInt(data.quality || "480", 10) * 16 / 9)
            };

            // Update the video stream in the store
            playerStore.setVideoStream(videoStream);
          }
        })
        .catch(error => {
          console.error("Failed to fetch video stream:", error);
        });
    }
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
    const publicPaths = ['/auth'];
    if (!isAuthenticated && !publicPaths.includes(location.pathname)) {
      navigate('/auth');
    }
  }, [isAuthenticated, location.pathname, navigate]);

  // Fix location check
  const isAuthPage = location.pathname === '/auth';

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-zinc-900 transition-colors duration-300">
      {!isAuthPage && <Header />}

      <div className="px-0 lg:px-4 flex-1 pb-20 md:pb-24">
        <Suspense fallback={<div className="flex justify-center py-12"><LoadingIndicator /></div>}>
          <Routes>
            <Route path="/" element={<Home onPlayPodcast={handlePlayPodcast} />} />
            <Route path="/podcast/:id" element={<PodcastDetail id={useParams().id || ''} onPlayPodcast={handlePlayPodcast} />} />
            <Route path="/channel/:id" element={<ChannelView id={useParams().id || ''} onPlayPodcast={handlePlayPodcast} />} />
            <Route path="/search/:query" element={<SearchResults query={useParams().query || ''} onPlayPodcast={handlePlayPodcast} />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/create" element={<CreatePage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </div>

      {/* Audio player component with conditional rendering */}
      {currentPodcast && isAuthenticated && (
        <AudioPlayer
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
      <UpdatePrompt />
    </NetworkProvider>
  );
};

export default App;