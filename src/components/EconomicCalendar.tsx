import React, { useEffect } from 'react';

export default function EconomicCalendar() {
  useEffect(() => {
    // Create widget container first
    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container__widget';

    // Create copyright element
    const copyrightElement = document.createElement('div');
    copyrightElement.className = 'tradingview-widget-copyright';
    copyrightElement.innerHTML = '<a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank"><span class="blue-text">Track all markets on TradingView</span></a>';

    // Get the main container
    const container = document.getElementById('tradingview-widget-container');
    if (container) {
      // Clear any existing content
      container.innerHTML = '';
      // Add the widget container and copyright
      container.appendChild(widgetContainer);
      container.appendChild(copyrightElement);

      // Create and configure the script
      const script = document.createElement('script');
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-events.js";
      script.type = 'text/javascript';
      script.async = true;

      // Set the configuration as a string in the script
      const config = {
        "colorTheme": "light",
        "isTransparent": false,
        "width": "100%",
        "height": "800",
        "locale": "en",
        "importanceFilter": "0,1",
        "countryFilter": "ar,au,br,ca,cn,fr,de,in,id,it,jp,kr,mx,ru,sa,za,tr,gb,us,eu"
      };
      
      script.text = JSON.stringify(config);
      
      // Add the script to the container
      container.appendChild(script);
    }

    return () => {
      // Cleanup
      const container = document.getElementById('tradingview-widget-container');
      if (container) {
        container.innerHTML = '';
      }
    };
  }, []);

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-6">Economic Calendar</h2>
      <div id="tradingview-widget-container" className="tradingview-widget-container">
        <div className="flex justify-center items-center h-[800px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    </div>
  );
}