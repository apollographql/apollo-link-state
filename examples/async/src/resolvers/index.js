/*
Here, we're using the GeoLocation API to get the user's current position.
https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition
*/

const getCurrentPosition = options => {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
};

export default {
  Query: {
    currentPosition: async (_, { enableHighAccuracy, timeout, maximumAge }) => {
      if (!navigator.geolocation) return null;
      try {
        const data = await getCurrentPosition({
          enableHighAccuracy,
          timeout,
          maximumAge,
        });

        /*
        The object returned from getCurrentPosition has read only properties.
        Copying read-only properties is blocked by Object.assign.
        Copying read-only properties is not blocked by the spread operator (according to the spec),
        Since Babel compiles the spread operator to Object.assign, we can't use it here until the transform is spec-compliant.
        https://github.com/babel/babel/pull/7034
        */

        const { coords, timestamp } = data;
        return {
          coords: {
            latitude: coords.latitude,
            longitude: coords.longitude,
            altitude: coords.altitude,
            accuracy: coords.accuracy,
            __typename: 'Coordinates',
          },
          timestamp,
          __typename: 'CurrentPosition',
          id: timestamp,
        };
      } catch (e) {
        console.error(e);
        return null;
      }
    },
  },
};
