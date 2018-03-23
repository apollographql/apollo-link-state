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

        const { coords, timestamp } = data;
        return {
          coords: {
            ...coords,
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
