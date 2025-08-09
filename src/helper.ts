import { User_AGENT,GOOGLE_MAPS_API_KEY ,UsertransistData} from "./index.js";


function getReadableDirections(directionsData: any): any {
  if (
    directionsData.status !== "OK" ||
    !directionsData.routes ||
    directionsData.routes.length === 0
  ) {
    console.error("No valid routes found in the data.");
    return null;
  }

  const stripHtml = (html: any) => html.replace(/<[^>]*>/g, "");

  const route = directionsData.routes[0];
  const leg = route.legs[0];

  const summary = {
    totalDistance: leg.distance.text,
    totalDuration: leg.duration.text,
    startAddress: leg.start_address,
    endAddress: leg.end_address,
    departureTime: leg.departure_time?.text,
    arrivalTime: leg.arrival_time?.text,
    summaryRoads: route.summary,
  };

  const steps = leg.steps.map((step: any) => {
    const formattedStep: any = {
        instruction: step.html_instructions.replace(/<[^>]*>/g, ""),
        distance: step.distance.text,
      duration: step.duration.text,
      travelMode: step.travel_mode,
    };

    if (step.travel_mode === "TRANSIT" && step.transit_details) {
        const transit = step.transit_details;
      formattedStep.transitInfo = {
        departureStop: transit.departure_stop.name,
        arrivalStop: transit.arrival_stop.name,
        departureTime: transit.departure_time.text,
        arrivalTime: transit.arrival_time.text,
        line: transit.line.name,
        vehicle: transit.line.vehicle.name,
        numStops: transit.num_stops,
      };
    }
    return formattedStep;
  });

  const warnings = route.warnings;

  return {
    summary,
    steps,
    warnings,
  };
}

export async function fetchTranistData(
  url: string,
  userData: UsertransistData
) {

    if (!userData.origin || !userData.destination) {
        console.error("Origin and destination are required.");
    }

    const newUrl = `${url}?origin=${encodeURIComponent(userData.origin)}&destination=${encodeURIComponent(userData.destination)}&mode=${userData.mode}&key=${GOOGLE_MAPS_API_KEY}`;

  const response = await fetch(newUrl, {
    method: "GET",
  });

  if (!response.ok) {
    console.error(`Failed to fetch transit data: ${response.statusText}`);
  }

  const data = await response.json();

  const readableData = getReadableDirections(data); 
  if (!readableData) {
    console.error("No valid directions found in the response.");
  }

  return readableData;
}

function extractPlaceInfo(placesData: any) {
  if (placesData.status !== "OK" || !placesData.results) {
    console.error("No valid places found in the data.");
    return null;
  }

  const places = placesData.results.map((place: any) => {
    let currentStatus = "Hours not available";
    if (place.opening_hours) {
      currentStatus = place.opening_hours.open_now ? "Open now" : "Closed";
    }

    return {
      name: place.name,
      address: place.formatted_address,
      rating: place.rating || "Not rated",
      totalRatings: place.user_ratings_total || 0,
      isOpen: currentStatus,
      isOperational: place.business_status === "OPERATIONAL",
      hasPhotos: !!place.photos && place.photos.length > 0,
      link: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
    };
  });

  // Return the cleaned-up list and the token for fetching more results.
  return {
    places: places,
    nextPageToken: placesData.next_page_token || null,
  };
}

export async function getGoogleMapsUserQuery(url: string, query: string) {
  if (!query) {
    console.error("Query parameter is required.");
  }

  const newUrl = `${url}?query=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}`;

  const response = await fetch(newUrl,{
    method: "GET",
  });

  if (!response.ok) {
    console.error(`Failed to fetch data: ${response.statusText}`);
  }

  const data = await response.json();

  const readablePlaces = extractPlaceInfo(data);


  return readablePlaces;
}
