import { GOOGLE_MAPS_API_KEY } from "./index.js";
function getReadableDirections(directionsData) {
    // Check if the API call was successful and a route was found.
    if (directionsData.status !== "OK" ||
        !directionsData.routes ||
        directionsData.routes.length === 0) {
        console.error("No valid routes found in the data.");
        return null;
    }
    // A helper function to strip HTML tags from instructions.
    const stripHtml = (html) => html.replace(/<[^>]*>/g, "");
    const route = directionsData.routes[0];
    const leg = route.legs[0];
    // 1. Extract the overall journey summary.
    const summary = {
        totalDistance: leg.distance.text,
        totalDuration: leg.duration.text,
        startAddress: leg.start_address,
        endAddress: leg.end_address,
        departureTime: leg.departure_time?.text,
        arrivalTime: leg.arrival_time?.text,
        summaryRoads: route.summary,
    };
    // 2. Extract and format each step of the journey.
    const steps = leg.steps.map((step) => {
        const formattedStep = {
            instruction: step.html_instructions.replace(/<[^>]*>/g, ""),
            distance: step.distance.text,
            duration: step.duration.text,
            travelMode: step.travel_mode,
        };
        // If it's a public transport step, add transit-specific details.
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
    // 3. Extract any warnings for the user.
    const warnings = route.warnings;
    // 4. Return the final, user-friendly object.
    return {
        summary,
        steps,
        warnings,
    };
}
export async function fetchTranistData(url, userData) {
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
    // console.log("--- JOURNEY SUMMARY ---");
    // console.log(`From: ${readableData.summary.startAddress}`);
    // console.log(`To: ${readableData.summary.endAddress}`);
    // console.log(
    //   `Total Trip Time: ${readableData.summary.totalDuration} (${readableData.summary.totalDistance})`
    // );
    // console.log("\n--- STEP-BY-STEP DIRECTIONS ---");
    // readableData.steps.forEach((step: any, index: number) => {
    //   console.log(`\n${index + 1}. [${step.travelMode}] ${step.instruction}`);
    //   console.log(`   (Distance: ${step.distance}, Duration: ${step.duration})`);
    //   if (step.transitInfo) {
    //     const { transitInfo } = step;
    //     console.log(`   -> Take the ${transitInfo.line} ${transitInfo.vehicle}.`);
    //     console.log(
    //       `   -> Board at: ${transitInfo.departureStop} (${transitInfo.departureTime})`
    //     );
    //     console.log(
    //       `   -> Get off at: ${transitInfo.arrivalStop} (${transitInfo.arrivalTime}) - ${transitInfo.numStops} stops`
    //     );
    //   }
    // });
    // if (readableData.warnings.length > 0) {
    //   console.log("\n--- WARNINGS ---");
    //   readableData.warnings.forEach((warning: any) =>
    //     console.log(`- ${warning}`)
    //   );
    // }
    return readableData;
}
function extractPlaceInfo(placesData) {
    // Ensure the API call was successful and there are results.
    if (placesData.status !== "OK" || !placesData.results) {
        console.error("No valid places found in the data.");
        return null;
    }
    // Iterate over the results array to extract the key information for each place.
    const places = placesData.results.map((place) => {
        // Determine the open status, providing a clear text response.
        // The `opening_hours` object might not always be present.
        let currentStatus = "Hours not available";
        if (place.opening_hours) {
            currentStatus = place.opening_hours.open_now ? "Open now" : "Closed";
        }
        return {
            name: place.name,
            address: place.formatted_address,
            // Provide a default rating if none exists.
            rating: place.rating || "Not rated",
            totalRatings: place.user_ratings_total || 0,
            isOpen: currentStatus,
            // Check if the business is marked as operational.
            isOperational: place.business_status === "OPERATIONAL",
            // Note if photos are available to be displayed.
            hasPhotos: !!place.photos && place.photos.length > 0,
        };
    });
    // Return the cleaned-up list and the token for fetching more results.
    return {
        places: places,
        nextPageToken: placesData.next_page_token || null,
    };
}
export async function getGoogleMapsUserQuery(url, query) {
    if (!query) {
        console.error("Query parameter is required.");
    }
    // console.log(`Using Google Maps API Key: ${url}`);
    // console.log(`Fetching data for query: ${query}`);
    const newUrl = `${url}?query=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}`;
    const response = await fetch(newUrl, {
        method: "GET",
    });
    if (!response.ok) {
        console.error(`Failed to fetch data: ${response.statusText}`);
    }
    const data = await response.json();
    const readablePlaces = extractPlaceInfo(data);
    // You can now easily display this information in your app.
    // if (readablePlaces) {
    //   console.log("--- Found Places ---");
    //   readablePlaces.places.forEach((place:any) => {
    //     console.log(`\n✅ ${place.name}`);
    //     console.log(`   Address: ${place.address}`);
    //     console.log(
    //       `   Status: ${place.isOpen} (${
    //         place.isOperational ? "Operational" : "Not Operational"
    //       })`
    //     );
    //     console.log(
    //       `   Rating: ${place.rating} stars (${place.totalRatings} reviews)`
    //     );
    //   });
    //   // You can use this token to make another API call to get the next page of results.
    //   if (readablePlaces.nextPageToken) {
    //     console.log(
    //       `\n\nMore results available. Use token: ${readablePlaces.nextPageToken}`
    //     );
    //   }
    // }
    return readablePlaces;
}
