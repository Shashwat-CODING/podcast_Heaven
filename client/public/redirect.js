// Redirect script for client-side routing
// This helps with direct links to routes when using client-side routing

(function() {
  // List of routes we want to handle client-side
  const clientRoutes = [
    '/auth',
    '/search/',
    '/podcast/',
    '/channel/',
    '/create'
  ];
  
  // Check if the current URL path should be handled by client router
  function shouldHandleRoute(path) {
    if (path === '/' || path === '') return false; // Already at root
    
    return clientRoutes.some(route => {
      return path.startsWith(route);
    });
  }
  
  // Get the current path from the URL
  const currentPath = window.location.pathname;
  
  // If this is a path that should be handled by client-side routing
  // and we're on a direct page load (not a client navigation)
  if (shouldHandleRoute(currentPath) && window.history.length <= 1) {
    console.log('Redirecting to client-side route:', currentPath);
    
    // Store the current path in session storage
    sessionStorage.setItem('redirectPath', currentPath + window.location.search);
    
    // Redirect to the root where our SPA will handle routing
    window.location.href = '/';
  }
  
  // On initial page load, check if we have a stored path
  document.addEventListener('DOMContentLoaded', function() {
    const redirectPath = sessionStorage.getItem('redirectPath');
    
    if (redirectPath) {
      // Clear the stored path
      sessionStorage.removeItem('redirectPath');
      
      // Slight delay to allow the app to initialize
      setTimeout(() => {
        // Use client-side navigation to go to the stored path
        // This assumes your app has made window.navigateTo available
        // or has similar access to the router
        if (window.navigateTo) {
          window.navigateTo(redirectPath);
        } else if (window.history && window.history.pushState) {
          // Fallback approach
          window.history.pushState(null, '', redirectPath);
          // Dispatch a popstate event to trigger route handling
          window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
        }
      }, 100);
    }
  });
})();